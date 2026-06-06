# AI Log

1. Asked AI to turn the assignment prompt into an implementation plan. It suggested a TypeScript, Express, SQLite, in-process worker, and server-rendered dashboard design. I kept that architecture because it matched the single-process constraint and avoided extra infrastructure.

2. Asked how to structure the project from an empty workspace. The generated plan referenced a different folder, so I rejected that path and kept all work in `/Users/tusharjain/Downloads/fibr_assignment`, the actual submission repo.

3. Asked how to model delivery persistence. The recommendation separated aggregate delivery state from individual attempts. I kept the two-table model because `deliveries` gives the worker a mutable state machine while `delivery_attempts` gives the dashboard an immutable audit log.

4. Asked how to wire the dispatcher to the worker wake signal. One option was a global worker singleton. I rejected that because it makes tests and startup order awkward, and instead kept the wake-signal idea via `configureDispatcher(() => worker.wake())` from `index.ts`.

5. Asked whether to build a React dashboard. AI suggested a server-rendered dashboard would satisfy the assignment with less build complexity. I kept server-rendered HTML and rejected React/Vite because frontend polish was explicitly not the evaluation target.

6. Asked how to sign payloads safely. The suggestion was HMAC-SHA256 over `timestamp.rawBody`. I kept that and made the outbound worker sign the exact JSON string sent on the wire, while documenting that subscribers must verify against the raw body.

7. Asked how to handle SQLite claiming compatibility. The plan suggested relying on `UPDATE ... RETURNING` and failing fast on old SQLite. I kept the startup version check instead of adding a fallback path, because a second claiming implementation would add complexity without helping the take-home scope.

8. Asked how to test the worker without fixed external services. AI suggested local mock servers on random ports and polling helpers instead of fixed sleeps. I kept that approach, then adjusted the test harness to bind loopback explicitly and wait for `listen()` before reading the port.

9. Asked for a submission-readiness review. It found a few polish issues: malformed HMAC signatures could throw, dashboard subscription creation lacked URL validation, unsupported patterns were accepted, and AI log entries were too compressed. I kept those fixes and added tests/documentation for the edge cases.
