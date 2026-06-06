import { Router } from 'express';
import { createSubscription, deactivateSubscription, getSubscription, listSubscriptions } from '../models/subscription';
import { isSupportedPattern } from '../utils/patternMatch';
import { requireJson } from './validation';

export const subscriptionsRouter = Router();

subscriptionsRouter.post('/', (req, res) => {
  if (!requireJson(req, res)) return;
  const { url, secret, eventTypes } = req.body ?? {};
  if (typeof url !== 'string' || url.length === 0) return res.status(400).json({ error: 'url is required' });
  if (secret !== undefined && typeof secret !== 'string') return res.status(400).json({ error: 'secret must be a string' });
  if (!Array.isArray(eventTypes) || eventTypes.length === 0 || !eventTypes.every((item) => typeof item === 'string' && item.length > 0)) {
    return res.status(400).json({ error: 'eventTypes must be a non-empty array of strings' });
  }
  if (!eventTypes.every(isSupportedPattern)) {
    return res.status(400).json({ error: 'eventTypes may only use exact matches, "*", or single-level suffix wildcards like "order.*"' });
  }
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'url must be a valid URL' });
  }
  const subscription = createSubscription({ url, secret, eventTypes });
  res.status(201).json(subscription);
});

subscriptionsRouter.get('/', (_req, res) => {
  res.json(listSubscriptions());
});

subscriptionsRouter.get('/:id', (req, res) => {
  const subscription = getSubscription(req.params.id);
  if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
  res.json(subscription);
});

subscriptionsRouter.delete('/:id', (req, res) => {
  const deleted = deactivateSubscription(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Subscription not found' });
  res.status(204).send();
});
