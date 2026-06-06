import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { buildSignatureHeader, signPayload } from '../../src/signing/hmac';

describe('hmac signing', () => {
  it('generates deterministic signatures', () => {
    const payload = '{"test":true}';
    const expected = crypto.createHmac('sha256', 'secret123').update(`1700000000.${payload}`).digest('hex');
    expect(signPayload(payload, 1700000000, 'secret123')).toBe(expected);
    expect(buildSignatureHeader(payload, 1700000000, 'secret123')).toBe(`sha256=${expected}`);
  });

  it('changes when the secret changes', () => {
    expect(signPayload('{"test":true}', 1700000000, 'secret123')).not.toBe(signPayload('{"test":true}', 1700000000, 'other'));
  });
});
