import { getDb } from '../db/connection';
import type { DeliveryAttempt } from '../types';
import { mapAttempt } from './mappers';

export function createAttempt(data: {
  deliveryId: string;
  attemptNumber: number;
  responseStatus?: number | null;
  responseBody?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
}): DeliveryAttempt {
  const row = getDb()
    .prepare(`
      INSERT INTO delivery_attempts
        (delivery_id, attempt_number, response_status, response_body, error_message, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    .get(
      data.deliveryId,
      data.attemptNumber,
      data.responseStatus ?? null,
      data.responseBody?.slice(0, 1024) ?? null,
      data.errorMessage ?? null,
      data.durationMs ?? null
    );
  return mapAttempt(row);
}

export function listAttemptsByDelivery(deliveryId: string): DeliveryAttempt[] {
  return getDb()
    .prepare('SELECT * FROM delivery_attempts WHERE delivery_id = ? ORDER BY attempt_number ASC, created_at ASC')
    .all(deliveryId)
    .map(mapAttempt);
}
