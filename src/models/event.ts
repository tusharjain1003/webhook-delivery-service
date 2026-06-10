import { getDb } from '../db/connection';
import { config } from '../config';
import type { EventRecord, EventWithSummary } from '../types';
import { mapEvent } from './mappers';
import { createDelivery, getDeliverySummary } from './delivery';
import { getActiveSubscriptionsForEventType } from './subscription';

export function createEvent(data: { eventType: string; payload: object }): EventRecord {
  const row = getDb()
    .prepare(`
      INSERT INTO events (event_type, payload)
      VALUES (?, ?)
      RETURNING *
    `)
    .get(data.eventType, JSON.stringify(data.payload));
  return mapEvent(row);
}

export function createEventWithDeliveries(data: { eventType: string; payload: object }): { event: EventRecord; deliveriesQueued: number } {
  return getDb().transaction(() => {
    const event = createEvent(data);
    const subscriptions = getActiveSubscriptionsForEventType(event.eventType);

    for (const subscription of subscriptions) {
      createDelivery({ eventId: event.id, subscriptionId: subscription.id, maxAttempts: config.retry.maxAttempts });
    }

    return { event, deliveriesQueued: subscriptions.length };
  })();
}

export function getEvent(id: string): EventRecord | null {
  const row = getDb().prepare('SELECT * FROM events WHERE id = ?').get(id);
  return row ? mapEvent(row) : null;
}

export function listEvents(opts: { eventType?: string } = {}): EventRecord[] {
  const rows = opts.eventType
    ? getDb().prepare('SELECT * FROM events WHERE event_type = ? ORDER BY received_at DESC').all(opts.eventType)
    : getDb().prepare('SELECT * FROM events ORDER BY received_at DESC').all();
  return rows.map(mapEvent);
}

export function listEventsWithSummaries(opts: { eventType?: string } = {}): EventWithSummary[] {
  return listEvents(opts).map((event) => ({
    ...event,
    deliverySummary: getDeliverySummary(event.id)
  }));
}
