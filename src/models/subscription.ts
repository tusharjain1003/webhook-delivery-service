import { getDb } from '../db/connection';
import type { PublicSubscription, Subscription } from '../types';
import { matchesAnyPattern } from '../utils/patternMatch';
import { mapSubscription } from './mappers';

export function createSubscription(data: { url: string; secret?: string; eventTypes: string[] }): Subscription {
  const row = getDb()
    .prepare(`
      INSERT INTO subscriptions (url, secret, event_types)
      VALUES (?, ?, ?)
      RETURNING *
    `)
    .get(data.url, data.secret ?? null, JSON.stringify(data.eventTypes));
  return mapSubscription(row);
}

export function getSubscription(id: string): Subscription | null {
  const row = getDb().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  return row ? mapSubscription(row) : null;
}

export function listSubscriptions(): Subscription[] {
  return getDb().prepare('SELECT * FROM subscriptions WHERE active = 1 ORDER BY created_at DESC').all().map(mapSubscription);
}

export function listAllSubscriptions(): Subscription[] {
  return getDb().prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all().map(mapSubscription);
}

export function deactivateSubscription(id: string): boolean {
  const result = getDb()
    .prepare("UPDATE subscriptions SET active = 0, updated_at = datetime('now') WHERE id = ? AND active = 1")
    .run(id);
  return result.changes > 0;
}

export function getActiveSubscriptionsForEventType(eventType: string): Subscription[] {
  return listSubscriptions().filter((subscription) => matchesAnyPattern(eventType, subscription.eventTypes));
}

export function toPublicSubscription(subscription: Subscription): PublicSubscription {
  return {
    id: subscription.id,
    url: subscription.url,
    hasSecret: Boolean(subscription.secret),
    eventTypes: subscription.eventTypes,
    active: subscription.active,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  };
}
