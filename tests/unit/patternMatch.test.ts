import { describe, expect, it } from 'vitest';
import { matchesPattern } from '../../src/utils/patternMatch';

describe('matchesPattern', () => {
  it('matches exact event types', () => {
    expect(matchesPattern('order.created', 'order.created')).toBe(true);
    expect(matchesPattern('order.updated', 'order.created')).toBe(false);
  });

  it('supports catch-all and single-level suffix wildcard', () => {
    expect(matchesPattern('anything.here', '*')).toBe(true);
    expect(matchesPattern('order.created', 'order.*')).toBe(true);
    expect(matchesPattern('order.updated', 'order.*')).toBe(true);
    expect(matchesPattern('order.item.added', 'order.*')).toBe(false);
  });

  it('rejects unsupported wildcard formats', () => {
    expect(matchesPattern('order.created', 'order*')).toBe(false);
    expect(matchesPattern('order.created', '*.created')).toBe(false);
    expect(matchesPattern('', '')).toBe(true);
    expect(matchesPattern('', '*')).toBe(true);
  });
});
