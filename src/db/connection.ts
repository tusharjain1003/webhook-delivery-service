import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

let db: Database.Database | null = null;

export function openDb(dbPath = config.db.path): Database.Database {
  if (db && db.name === dbPath) return db;

  if (db) {
    db.close();
    db = null;
  }

  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function getDb(): Database.Database {
  return db ?? openDb();
}

export function closeDb(): void {
  if (!db) return;
  db.close();
  db = null;
}
