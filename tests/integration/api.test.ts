import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDelivery, forceDeliveryStatus } from '../../src/models/delivery';
import { createEvent } from '../../src/models/event';
import { createSubscription } from '../../src/models/subscription';
import { apiFetch, setupIntegration, teardownIntegration, type TestContext } from './helpers';

describe('api', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupIntegration();
  });

  afterEach(async () => {
    await teardownIntegration(ctx);
  });

  it('rejects missing API keys', async () => {
    const response = await fetch(`${ctx.baseUrl}/api/subscriptions`);
    expect(response.status).toBe(401);
  });

  it('creates, lists, gets, and deactivates subscriptions', async () => {
    const created = await apiFetch(ctx.baseUrl, '/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://example.com/webhook', eventTypes: ['order.*'] })
    });
    expect(created.status).toBe(201);
    const subscription = await created.json();

    const listed = await apiFetch(ctx.baseUrl, '/api/subscriptions');
    expect(await listed.json()).toHaveLength(1);

    const fetched = await apiFetch(ctx.baseUrl, `/api/subscriptions/${subscription.id}`);
    expect(fetched.status).toBe(200);

    const deleted = await apiFetch(ctx.baseUrl, `/api/subscriptions/${subscription.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
  });

  it('ingests an event and queues matching deliveries', async () => {
    await apiFetch(ctx.baseUrl, '/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://example.com/webhook', eventTypes: ['order.*'] })
    });

    const response = await apiFetch(ctx.baseUrl, '/api/events', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'order.created', payload: { orderId: '123' } })
    });
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.deliveriesQueued).toBe(1);
  });

  it('validates json bodies', async () => {
    const response = await apiFetch(ctx.baseUrl, '/api/events', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'order.created' })
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 and 409 for manual retry cases', async () => {
    const notFound = await apiFetch(ctx.baseUrl, '/api/deliveries/missing/retry', { method: 'POST' });
    expect(notFound.status).toBe(404);

    const subscription = createSubscription({ url: 'http://example.com/webhook', eventTypes: ['order.*'] });
    const event = createEvent({ eventType: 'order.created', payload: {} });
    const delivery = createDelivery({ eventId: event.id, subscriptionId: subscription.id });
    forceDeliveryStatus(delivery.id, 'success');

    const invalid = await apiFetch(ctx.baseUrl, `/api/deliveries/${delivery.id}/retry`, { method: 'POST' });
    expect(invalid.status).toBe(409);
  });
});
