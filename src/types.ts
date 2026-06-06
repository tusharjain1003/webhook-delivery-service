export type DeliveryStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'exhausted';

export interface Subscription {
  id: string;
  url: string;
  secret?: string;
  eventTypes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSubscription {
  id: string;
  url: string;
  hasSecret: boolean;
  eventTypes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecord {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface Delivery {
  id: string;
  eventId: string;
  subscriptionId: string;
  status: DeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  attemptedAt: string;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface DeliveryWithSubscription extends Delivery {
  subscriptionUrl: string;
}

export interface DeliveryWithAttempts extends DeliveryWithSubscription {
  attempts: DeliveryAttempt[];
}

export interface DeliverySummary {
  total: number;
  pending: number;
  in_progress: number;
  success: number;
  failed: number;
  exhausted: number;
}

export interface EventWithSummary extends EventRecord {
  deliverySummary: DeliverySummary;
}
