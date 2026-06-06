# Webhook Delivery Service

A single-process webhook delivery service built with TypeScript, Express, and SQLite. Clients create subscriptions, ingest events, and the service fans matching events out to subscribers with retries, persistent delivery state, immutable attempt logs, and a server-rendered dashboard.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3001
```

After dependencies are installed, `npm run dev` is the single-command local run path. For a production-style check before submission:

```bash
npm run build
npm start
# Open http://localhost:3001
```

Requires Node.js 18+ and SQLite 3.35.0+ through `better-sqlite3` because the worker uses `UPDATE ... RETURNING` for atomic claiming. Dashboard routes are intentionally unauthenticated for this local take-home; API routes require `X-API-Key`. The service provides at-least-once delivery, so subscribers should deduplicate using `X-Webhook-ID`.

## Demo Flow

```bash
RECEIVER_SECRET=test-secret npm run receiver

curl -X POST http://localhost:3001/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{"url":"http://localhost:4000/webhook","secret":"test-secret","eventTypes":["order.*"]}'

curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{"eventType":"order.created","payload":{"orderId":"123","amount":99.99}}'
```

Open `http://localhost:3001` to see subscriptions, events, delivery state, and attempt history.

## Development

```bash
npm run dev
npm test
npm run test:unit
npm run test:int
```

Use `npm run build && npm start` as the production-style verification path before submission. `cors()` is intentionally open for local development and take-home testing; production would restrict allowed origins.

## Environment Variables

| Variable | Default | Description |
|---|---:|---|
| `PORT` | `3001` | Main service port |
| `ADMIN_API_KEY` | `dev-api-key` | Required for `/api/*` routes |
| `DB_PATH` | `./data/webhooks.db` | SQLite database file path |
| `WORKER_POLL_MS` | `1000` | Worker fallback polling interval |
| `WORKER_BATCH_SIZE` | `10` | Number of deliveries claimed per tick |
| `WORKER_CONCURRENCY` | `10` | Max concurrent outbound HTTP deliveries |
| `RETRY_MAX_ATTEMPTS` | `5` | Max automatic attempts before exhausted |
| `DELIVERY_TIMEOUT_MS` | `30000` | Outbound HTTP timeout |
| `JSON_BODY_LIMIT` | `1mb` | Max JSON request body size |
| `RECEIVER_STATUS` | `200` | Local receiver response status |
| `RECEIVER_SECRET` | unset | Local receiver HMAC verification secret |

## API Reference

All `/api/*` endpoints require `X-API-Key: dev-api-key` unless `ADMIN_API_KEY` is changed.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/subscriptions` | Create a subscription with `{ url, secret?, eventTypes }` |
| `GET` | `/api/subscriptions` | List active subscriptions |
| `GET` | `/api/subscriptions/:id` | Get one subscription |
| `DELETE` | `/api/subscriptions/:id` | Deactivate a subscription |
| `POST` | `/api/events` | Ingest `{ eventType, payload }` and queue deliveries |
| `GET` | `/api/events` | List events with delivery summaries |
| `GET` | `/api/events/:id` | Get one event with summary |
| `GET` | `/api/events/:eventId/deliveries` | List deliveries and attempts |
| `POST` | `/api/deliveries/:id/retry` | Retry failed or exhausted delivery |

## Payload Signing

When a subscription has a `secret`, deliveries include `X-Webhook-Signature: sha256=<hex>`. The signature is computed over `timestamp.rawBody`, where `rawBody` is the exact JSON string sent over the wire. Subscribers should verify against the raw request body, not a parsed and re-serialized object.

## What Works

- Persistent subscriptions, events, deliveries, and attempt logs in SQLite.
- Pattern matching with exact, catch-all, and single-level wildcard patterns.
- In-process worker with atomic claiming, retries, backoff, HMAC signing, and startup recovery.
- Dashboard pages for subscriptions, events, event details, attempts, and manual retries.
- Local receiver for demos and automated unit/integration coverage.

## What I'd Improve With More Time

- Event and delivery TTL cleanup.
- Subscription `PATCH` endpoint.
- Dead-letter view for exhausted deliveries.
- Rate limiting per subscriber.
- Structured logging, metrics, and tracing.
- WebSocket updates for the dashboard.
