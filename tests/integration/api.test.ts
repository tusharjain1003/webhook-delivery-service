import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDelivery, forceDeliveryStatus, listDeliveriesByEvent } from '../../src/models/delivery';
import { createEvent, getEvent } from '../../src/models/event';
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
      body: JSON.stringify({ url: 'http://example.com/webhook', secret: 'super-secret', eventTypes: ['order.*'] })
    });
    expect(created.status).toBe(201);
    const subscription = await created.json();
    expect(subscription).not.toHaveProperty('secret');
    expect(subscription.hasSecret).toBe(true);

    const listed = await apiFetch(ctx.baseUrl, '/api/subscriptions');
    const subscriptions = await listed.json();
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).not.toHaveProperty('secret');
    expect(subscriptions[0].hasSecret).toBe(true);

    const fetched = await apiFetch(ctx.baseUrl, `/api/subscriptions/${subscription.id}`);
    expect(fetched.status).toBe(200);
    const fetchedSubscription = await fetched.json();
    expect(fetchedSubscription).not.toHaveProperty('secret');
    expect(fetchedSubscription.hasSecret).toBe(true);

    const deleted = await apiFetch(ctx.baseUrl, `/api/subscriptions/${subscription.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
  });

  it('rejects unsupported wildcard patterns', async () => {
    const response = await apiFetch(ctx.baseUrl, '/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://example.com/webhook', eventTypes: ['order*'] })
    });
    expect(response.status).toBe(400);
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
    expect(listDeliveriesByEvent(body.id)).toHaveLength(1);
  });

  it('creates and dispatches test events from the dashboard form', async () => {
    createSubscription({ url: 'http://example.com/webhook', eventTypes: ['order.*'] });

    const response = await fetch(`${ctx.baseUrl}/dashboard/events`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        eventType: 'order.created',
        payload: '{"orderId":"demo-1","amount":99.99}'
      })
    });

    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(location).toMatch(/^\/events\//);

    const eventId = location?.split('/').pop() ?? '';
    const event = getEvent(eventId);
    expect(event?.eventType).toBe('order.created');
    expect(listDeliveriesByEvent(eventId)).toHaveLength(1);
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
