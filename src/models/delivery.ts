import { config } from '../config';
import { getDb } from '../db/connection';
import type { Delivery, DeliveryStatus, DeliverySummary, DeliveryWithSubscription } from '../types';
import { mapDelivery, mapDeliveryWithSubscription } from './mappers';

const emptySummary: DeliverySummary = {
  total: 0,
  pending: 0,
  in_progress: 0,
  success: 0,
  failed: 0,
  exhausted: 0
};

export function createDelivery(data: { eventId: string; subscriptionId: string; maxAttempts?: number }): Delivery {
  const row = getDb()
    .prepare(`
      INSERT INTO deliveries (event_id, subscription_id, max_attempts, next_attempt_at)
      VALUES (?, ?, ?, datetime('now'))
      RETURNING *
    `)
    .get(data.eventId, data.subscriptionId, data.maxAttempts ?? config.retry.maxAttempts);
  return mapDelivery(row);
}

export function getDelivery(id: string): Delivery | null {
  const row = getDb().prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
  return row ? mapDelivery(row) : null;
}

export function claimPendingDeliveries(limit: number): Delivery[] {
  return getDb()
    .prepare(`
      UPDATE deliveries
      SET status = 'in_progress', updated_at = datetime('now')
      WHERE id IN (
        SELECT id FROM deliveries
        WHERE status = 'pending' AND next_attempt_at <= datetime('now')
        ORDER BY next_attempt_at ASC
        LIMIT ?
      )
      RETURNING *
    `)
    .all(limit)
    .map(mapDelivery);
}

export function updateDeliverySuccess(id: string): void {
  getDb()
    .prepare("UPDATE deliveries SET status = 'success', next_attempt_at = NULL, updated_at = datetime('now') WHERE id = ?")
    .run(id);
}

export function updateDeliveryForRetry(id: string, attemptCount: number, nextAttemptAt: string): void {
  getDb()
    .prepare(`
      UPDATE deliveries
      SET status = 'pending', attempt_count = ?, next_attempt_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(attemptCount, nextAttemptAt, id);
}

export function updateDeliveryFailed(id: string, attemptCount: number): void {
  getDb()
    .prepare(`
      UPDATE deliveries
      SET status = 'failed', attempt_count = ?, next_attempt_at = NULL, updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(attemptCount, id);
}

export function updateDeliveryExhausted(id: string, attemptCount: number): void {
  getDb()
    .prepare(`
      UPDATE deliveries
      SET status = 'exhausted', attempt_count = ?, next_attempt_at = NULL, updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(attemptCount, id);
}

export function resetDeliveryForManualRetry(id: string): 'retried' | 'not_found' | 'invalid_state' {
  const delivery = getDelivery(id);
  if (!delivery) return 'not_found';
  if (delivery.status !== 'failed' && delivery.status !== 'exhausted') return 'invalid_state';

  getDb()
    .prepare(`
      UPDATE deliveries
      SET status = 'pending', attempt_count = 0, next_attempt_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(id);
  return 'retried';
}

export function listDeliveriesByEvent(eventId: string): DeliveryWithSubscription[] {
  return getDb()
    .prepare(`
      SELECT d.*, s.url AS subscription_url
      FROM deliveries d
      JOIN subscriptions s ON s.id = d.subscription_id
      WHERE d.event_id = ?
      ORDER BY d.created_at ASC
    `)
    .all(eventId)
    .map(mapDeliveryWithSubscription);
}

export function getDeliverySummary(eventId: string): DeliverySummary {
  const summary = { ...emptySummary };
  const rows = getDb()
    .prepare('SELECT status, COUNT(*) AS count FROM deliveries WHERE event_id = ? GROUP BY status')
    .all(eventId) as Array<{ status: DeliveryStatus; count: number }>;

  for (const row of rows) {
    summary[row.status] = row.count;
    summary.total += row.count;
  }
  return summary;
}

export function recoverInProgressDeliveriesOnStartup(): number {
  const result = getDb()
    .prepare(`
      UPDATE deliveries
      SET status = 'pending', next_attempt_at = datetime('now'), updated_at = datetime('now')
      WHERE status = 'in_progress'
    `)
    .run();
  return result.changes;
}

export function reapStaleInProgressDeliveries(timeoutSeconds: number): number {
  const result = getDb()
    .prepare(`
      UPDATE deliveries
      SET status = 'pending', next_attempt_at = datetime('now'), updated_at = datetime('now')
      WHERE status = 'in_progress'
        AND updated_at < datetime('now', '-' || ? || ' seconds')
    `)
    .run(timeoutSeconds);
  return result.changes;
}

export function forceDeliveryStatus(id: string, status: DeliveryStatus, updatedAt?: string): void {
  if (updatedAt) {
    getDb()
      .prepare('UPDATE deliveries SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, updatedAt, id);
    return;
  }

  getDb()
    .prepare("UPDATE deliveries SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, id);
}
