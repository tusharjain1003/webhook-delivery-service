import { config } from '../config';
import { createDelivery } from '../models/delivery';
import { getActiveSubscriptionsForEventType } from '../models/subscription';

let wakeWorker: (() => void) | undefined;

export function configureDispatcher(wake: () => void): void {
  wakeWorker = wake;
}

export function dispatchEvent(eventId: string, eventType: string): number {
  const subscriptions = getActiveSubscriptionsForEventType(eventType);
  for (const subscription of subscriptions) {
    createDelivery({ eventId, subscriptionId: subscription.id, maxAttempts: config.retry.maxAttempts });
  }
  wakeWorker?.();
  return subscriptions.length;
}
