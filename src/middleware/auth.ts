import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== config.adminApiKey) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }
  next();
}
