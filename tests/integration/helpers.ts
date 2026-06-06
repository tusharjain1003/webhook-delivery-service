import http from 'http';
import express from 'express';
import { closeDb, openDb } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { DeliveryWorker } from '../../src/worker/deliveryWorker';
import { createApp } from '../../src/index';
import { getDelivery, listDeliveriesByEvent } from '../../src/models/delivery';

export interface TestContext {
  worker: DeliveryWorker;
  server: http.Server;
  baseUrl: string;
}

export async function setupIntegration(): Promise<TestContext> {
  openDb(':memory:');
  initializeSchema(openDb(':memory:'));
  const worker = new DeliveryWorker();
  const app = createApp(worker);
  const server = await new Promise<http.Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to start server');
  return { worker, server, baseUrl: `http://127.0.0.1:${address.port}` };
}

export async function teardownIntegration(ctx?: TestContext): Promise<void> {
  if (!ctx) return;
  await ctx.worker.stop();
  await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
  closeDb();
}

export async function apiFetch(baseUrl: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'X-API-Key': 'dev-api-key',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {})
    }
  });
}

export interface SubscriberRequest {
  headers: http.IncomingHttpHeaders;
  body: unknown;
  rawBody: string;
}

export async function startSubscriber(statusCode: number): Promise<{ url: string; requests: SubscriberRequest[]; close: () => Promise<void> }> {
  const requests: SubscriberRequest[] = [];
  const app = express();
  app.use(express.raw({ type: 'application/json' }));
  app.post('/webhook', (req, res) => {
    const rawBody = req.body.toString('utf8');
    requests.push({ headers: req.headers, rawBody, body: JSON.parse(rawBody) });
    res.status(statusCode).json({ ok: statusCode >= 200 && statusCode < 300 });
  });
  const server = await new Promise<http.Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to start subscriber');
  return {
    url: `http://127.0.0.1:${address.port}/webhook`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve()))
  };
}

export async function waitForDeliveryStatus(eventId: string, status: string, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [delivery] = listDeliveriesByEvent(eventId);
    if (delivery?.status === status) return delivery;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const [delivery] = listDeliveriesByEvent(eventId);
  throw new Error(`Timed out waiting for ${status}; latest=${delivery?.status}`);
}

export async function waitForAttemptCount(deliveryId: string, attemptCount: number, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const delivery = getDelivery(deliveryId);
    if (delivery?.attemptCount === attemptCount) return delivery;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const delivery = getDelivery(deliveryId);
  throw new Error(`Timed out waiting for attempt count ${attemptCount}; latest=${delivery?.attemptCount}`);
}
