# AI Log

1. Asked for a complete implementation plan from the provided Markdown. Kept the single-process TypeScript, Express, SQLite, and server-rendered dashboard direction.
2. The plan referenced a different target folder, but the active workspace was empty at `/Users/tusharjain/Downloads/fibr_assignment`. I kept the implementation in the active workspace instead of creating a sibling project.
3. Kept the two-table delivery model: `deliveries` for state and `delivery_attempts` for immutable audit history.
4. Materially adjusted the worker implementation into a small class so tests and startup can configure dispatcher wake behavior without circular imports.
5. Rejected adding React or frontend build tooling. The dashboard is plain server-rendered HTML, matching the revised plan and reducing moving parts.
6. Kept raw-body HMAC semantics for outbound delivery and the local receiver. This avoids re-serialization mismatch when subscribers verify signatures.
7. Added an explicit SQLite version check rather than implementing a fallback for older SQLite. The plan preferred failing fast because atomic claiming depends on `UPDATE ... RETURNING`.
8. Added integration tests that start local HTTP servers on random ports instead of relying on fixed ports. This avoids port collisions during repeat runs.
9. Preserved previous attempt rows during manual retry and reset only aggregate delivery state, matching the operational/audit tradeoff in the plan.
