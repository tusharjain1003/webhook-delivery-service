import crypto from 'crypto';

export function signPayload(payload: string, timestamp: number, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

export function buildSignatureHeader(payload: string, timestamp: number, secret: string): string {
  return `sha256=${signPayload(payload, timestamp, secret)}`;
}

export function verifySignature(payload: string, timestamp: string, signature: string, secret: string): boolean {
  const expected = buildSignatureHeader(payload, Number(timestamp), secret);
  const given = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (given.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(given, expectedBuffer);
}
