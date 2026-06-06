import type Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      url TEXT NOT NULL,
      secret TEXT,
      event_types TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      event_id TEXT NOT NULL REFERENCES events(id),
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      next_attempt_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS delivery_attempts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      delivery_id TEXT NOT NULL REFERENCES deliveries(id),
      attempt_number INTEGER NOT NULL,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
      response_status INTEGER,
      response_body TEXT,
      error_message TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_status_next ON deliveries(status, next_attempt_at);
    CREATE INDEX IF NOT EXISTS idx_deliveries_event ON deliveries(event_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_subscription ON deliveries(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at);
    CREATE INDEX IF NOT EXISTS idx_attempts_delivery ON delivery_attempts(delivery_id);
  `);
}

export function assertSqliteSupportsReturning(db: Database.Database): string {
  const row = db.prepare("SELECT sqlite_version() AS version").get() as { version: string };
  const [major, minor, patch] = row.version.split('.').map((part) => parseInt(part, 10));
  const supported = major > 3 || (major === 3 && (minor > 35 || (minor === 35 && patch >= 0)));
  if (!supported) {
    throw new Error(`SQLite ${row.version} is too old. This service requires SQLite 3.35.0+ for UPDATE ... RETURNING.`);
  }
  return row.version;
}
