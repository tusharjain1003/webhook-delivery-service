# Decisions

## Storage

I chose SQLite with `better-sqlite3`. I considered Postgres, Redis-backed queues, and an embedded queue package. I rejected them because the assignment asks for a local single-process service that survives restarts without extra infrastructure. The tradeoff is that this is intentionally not a horizontally scalable queue, but the persistence model is easy to inspect and reliable for the take-home scope.

## Concurrency And Worker Model

I chose an in-process async worker that claims pending deliveries with `UPDATE ... RETURNING` and performs outbound `fetch` calls concurrently. I considered a separate worker process, Node worker threads, and BullMQ/Celery-style queues. I rejected them because webhook delivery is I/O-bound and Node's event loop handles this well enough here. A clean shutdown waits for in-flight work; an unclean crash may leave rows as `in_progress`, so startup recovery moves them back to `pending` for at-least-once delivery.

## Retry Policy

I chose exponential backoff with jitter, retrying network failures, timeouts, 408, 429, and 5xx responses. I considered retrying all failures, but rejected that because most 4xx responses indicate a permanent client/configuration error. Manual retry resets `attempt_count` to zero while preserving previous `delivery_attempts`, so the operator gets a fresh retry window without losing audit history.

## Payload Signing

I chose HMAC-SHA256 over the exact JSON string sent on the wire, using `timestamp.body` as the signed content. I considered signing parsed payload fields, but rejected that because JSON key order and whitespace can change after parsing. The tradeoff is that subscriber implementations need raw-body access, which is documented in the README.

## Dashboard Scope

I chose server-rendered HTML with Express templates. I considered React and Vite, but rejected them because frontend polish is not the grading target and a separate build step would add complexity without improving delivery correctness. The dashboard is unauthenticated by design for this local take-home; API routes remain protected with `X-API-Key`.

## Pattern Matching

I chose exact matches, `*`, and single-level suffix wildcards like `order.*`. I considered richer glob syntax such as `user.**` or `*.created`, but rejected it to keep routing behavior obvious and testable. Unsupported formats like `order*` intentionally return false.

## Subscription Updates

I omitted a `PATCH` endpoint. I considered supporting in-place subscription edits, but rejected it because delete-and-recreate is enough for the assignment and avoids tricky questions about whether historical deliveries should reflect old or new subscription configuration.
