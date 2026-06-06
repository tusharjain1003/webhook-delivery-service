export function toSqliteTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

export function nowSqlite(): string {
  return toSqliteTimestamp(new Date());
}
