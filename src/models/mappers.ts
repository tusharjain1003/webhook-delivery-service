import type { Delivery, DeliveryAttempt, DeliveryWithSubscription, EventRecord, Subscription } from '../types';

export function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    url: row.url,
    secret: row.secret ?? undefined,
    eventTypes: JSON.parse(row.event_types),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapEvent(row: any): EventRecord {
  return {
    id: row.id,
    eventType: row.event_type,
    payload: JSON.parse(row.payload),
    receivedAt: row.received_at
  };
}

export function mapDelivery(row: any): Delivery {
  return {
    id: row.id,
    eventId: row.event_id,
    subscriptionId: row.subscription_id,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapDeliveryWithSubscription(row: any): DeliveryWithSubscription {
  return {
    ...mapDelivery(row),
    subscriptionUrl: row.subscription_url
  };
}

export function mapAttempt(row: any): DeliveryAttempt {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    attemptNumber: row.attempt_number,
    attemptedAt: row.attempted_at,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    createdAt: row.created_at
  };
}
