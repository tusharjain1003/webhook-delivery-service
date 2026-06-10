import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/config';
import { closeDb } from '../../src/db/connection';
import { createDelivery, forceDeliveryStatus, getDelivery, reapStaleInProgressDeliveries, recoverInProgressDeliveriesOnStartup } from '../../src/models/delivery';
import { listAttemptsByDelivery } from '../../src/models/deliveryAttempt';
import { createEvent } from '../../src/models/event';
import { createSubscription } from '../../src/models/subscription';
import { verifySignature } from '../../src/signing/hmac';
import { apiFetch, setupIntegration, startSubscriber, teardownIntegration, waitForAttemptCount, waitForDeliveryStatus, type TestContext } from './helpers';

describe('delivery worker', () => {
  let ctx: TestContext;
  let originalBaseDelay: number;
  let originalPollInterval: number;
  let originalDbPath: string;

  beforeEach(async () => {
    originalBaseDelay = config.retry.baseDelayMs;
    originalPollInterval = config.worker.pollIntervalMs;
    originalDbPath = config.db.path;
    config.retry.baseDelayMs = 10_000;
    ctx = await setupIntegration();
  });

  afterEach(async () => {
    config.retry.baseDelayMs = originalBaseDelay;
    config.worker.pollIntervalMs = originalPollInterval;
    config.db.path = originalDbPath;
    vi.restoreAllMocks();
    await teardownIntegration(ctx);
  });

  it('delivers successful webhooks and logs attempts', async () => {
    ctx.worker.start();
    const subscriber = await startSubscriber(200);
    await apiFetch(ctx.baseUrl, '/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ url: subscriber.url, secret: 'test-secret', eventTypes: ['order.*'] })
    });

    const response = await apiFetch(ctx.baseUrl, '/api/events', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'order.created', payload: { orderId: '123' } })
    });
    const event = await response.json();
    const delivery = await waitForDeliveryStatus(event.id, 'success');
    expect(subscriber.requests).toHaveLength(1);
    expect(subscriber.requests[0].headers['x-webhook-signature']).toMatch(/^sha256=/);
    expect(
      verifySignature(
        subscriber.requests[0].rawBody,
        String(subscriber.requests[0].headers['x-webhook-timestamp']),
        String(subscriber.requests[0].headers['x-webhook-signature']),
        'test-secret'
      )
    ).toBe(true);
    expect(listAttemptsByDelivery(delivery.id)).toHaveLength(1);
    await subscriber.close();
  });

  it('retries 500 responses by returning delivery to pending', async () => {
    ctx.worker.start();
    const subscriber = await startSubscriber(500);
    await apiFetch(ctx.baseUrl, '/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ url: subscriber.url, eventTypes: ['order.*'] })
    });
    const response = await apiFetch(ctx.baseUrl, '/api/events', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'order.created', payload: {} })
    });
    const event = await response.json();
    const delivery = await waitForDeliveryStatus(event.id, 'pending');
    await waitForAttemptCount(delivery.id, 1);
    expect(listAttemptsByDelivery(delivery.id)[0].responseStatus).toBe(500);
    await subscriber.close();
  });

  it('marks permanent 400 responses as failed', async () => {
    ctx.worker.start();
    const subscriber = await startSubscriber(400);
    await apiFetch(ctx.baseUrl, '/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ url: subscriber.url, eventTypes: ['order.*'] })
    });
    const response = await apiFetch(ctx.baseUrl, '/api/events', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'order.created', payload: {} })
    });
    const event = await response.json();
    const delivery = await waitForDeliveryStatus(event.id, 'failed');
    expect(listAttemptsByDelivery(delivery.id)[0].responseStatus).toBe(400);
    await subscriber.close();
  });

  it('recovers interrupted in-progress deliveries on startup', () => {
    const subscription = createSubscription({ url: 'http://example.com/webhook', eventTypes: ['order.*'] });
    const event = createEvent({ eventType: 'order.created', payload: {} });
    const delivery = createDelivery({ eventId: event.id, subscriptionId: subscription.id });
    forceDeliveryStatus(delivery.id, 'in_progress');

    expect(recoverInProgressDeliveriesOnStartup()).toBe(1);
  });

  it('reaps stale in-progress deliveries without touching fresh ones', () => {
    const subscription = createSubscription({ url: 'http://example.com/webhook', eventTypes: ['order.*'] });
    const oldEvent = createEvent({ eventType: 'order.created', payload: { id: 'old' } });
    const oldDelivery = createDelivery({ eventId: oldEvent.id, subscriptionId: subscription.id });
    forceDeliveryStatus(oldDelivery.id, 'in_progress', '2000-01-01 00:00:00');

    expect(reapStaleInProgressDeliveries(60)).toBe(1);
    expect(getDelivery(oldDelivery.id)?.status).toBe('pending');

    const freshEvent = createEvent({ eventType: 'order.created', payload: { id: 'fresh' } });
    const freshDelivery = createDelivery({ eventId: freshEvent.id, subscriptionId: subscription.id });
    forceDeliveryStatus(freshDelivery.id, 'in_progress');

    expect(reapStaleInProgressDeliveries(60)).toBe(0);
    expect(getDelivery(freshDelivery.id)?.status).toBe('in_progress');
  });

  it('keeps running when a worker loop database call throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    closeDb();
    config.db.path = '/dev/null/webhooks.db';
    config.worker.pollIntervalMs = 10;

    ctx.worker.start();

    const deadline = Date.now() + 500;
    while (consoleError.mock.calls.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(consoleError).toHaveBeenCalledWith('Delivery worker loop iteration failed', expect.any(Error));
    await expect(ctx.worker.stop()).resolves.toBeUndefined();
  });
});
