import { getDb } from '../db/connection';
import type { EventRecord, EventWithSummary } from '../types';
import { mapEvent } from './mappers';
import { getDeliverySummary } from './delivery';

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
