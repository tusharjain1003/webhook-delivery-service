import { describe, expect, it, vi } from 'vitest';
import { getNextAttemptDelay, isRetryableStatus } from '../../src/worker/retry';

describe('retry policy', () => {
  it('classifies retryable status codes', () => {
    expect(isRetryableStatus(null)).toBe(true);
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
  });

  it('computes exponential backoff with jitter bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(getNextAttemptDelay(1)).toBe(2000);
    expect(getNextAttemptDelay(2)).toBe(4000);
    vi.mocked(Math.random).mockRestore();
  });

  it('never returns a negative delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getNextAttemptDelay(1)).toBeGreaterThanOrEqual(0);
    vi.mocked(Math.random).mockRestore();
  });
});
