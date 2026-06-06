import type { Request, Response } from 'express';

export function requireJson(req: Request, res: Response): boolean {
  if (!req.is('application/json')) {
    res.status(415).json({ error: 'Content-Type must be application/json' });
    return false;
  }
  return true;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
