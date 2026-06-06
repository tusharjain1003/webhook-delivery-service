import { config } from '../config';
import { toSqliteTimestamp } from '../utils/timestamp';

export function isRetryableStatus(statusCode: number | null): boolean {
  if (statusCode === null) return true;
  if (statusCode === 408 || statusCode === 429) return true;
  if (statusCode >= 500) return true;
  return false;
}

export function getNextAttemptDelay(attemptNumber: number): number {
  const exponentialDelay = config.retry.baseDelayMs * Math.pow(config.retry.backoffMultiplier, attemptNumber);
  const cappedDelay = Math.min(exponentialDelay, config.retry.maxDelayMs);
  const jitter = cappedDelay * config.retry.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(cappedDelay + jitter));
}

export function getNextAttemptAt(attemptNumber: number): string {
  return toSqliteTimestamp(new Date(Date.now() + getNextAttemptDelay(attemptNumber)));
}
