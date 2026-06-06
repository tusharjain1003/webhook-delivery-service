import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDelivery, forceDeliveryStatus, recoverInProgressDeliveriesOnStartup } from '../../src/models/delivery';
import { listAttemptsByDelivery } from '../../src/models/deliveryAttempt';
import { createEvent } from '../../src/models/event';
import { createSubscription } from '../../src/models/subscription';
import { apiFetch, setupIntegration, startSubscriber, teardownIntegration, waitForAttemptCount, waitForDeliveryStatus, type TestContext } from './helpers';

describe('delivery worker', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    process.env.RETRY_BASE_DELAY_MS = '10000';
    ctx = await setupIntegration();
    ctx.worker.start();
  });

  afterEach(async () => {
    delete process.env.RETRY_BASE_DELAY_MS;
    await teardownIntegration(ctx);
  });

  it('delivers successful webhooks and logs attempts', async () => {
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
    expect(listAttemptsByDelivery(delivery.id)).toHaveLength(1);
    await subscriber.close();
  });

  it('retries 500 responses by returning delivery to pending', async () => {
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
});
