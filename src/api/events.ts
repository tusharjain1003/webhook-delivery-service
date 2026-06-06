import { Router } from 'express';
import { dispatchEvent } from '../worker/dispatcher';
import { createEvent, getEvent, listEventsWithSummaries } from '../models/event';
import { getDeliverySummary } from '../models/delivery';
import { isPlainObject, requireJson } from './validation';

export const eventsRouter = Router();

eventsRouter.post('/', (req, res) => {
  if (!requireJson(req, res)) return;
  const { eventType, payload } = req.body ?? {};
  if (typeof eventType !== 'string' || eventType.length === 0) return res.status(400).json({ error: 'eventType is required' });
  if (!isPlainObject(payload)) return res.status(400).json({ error: 'payload must be an object' });

  const event = createEvent({ eventType, payload });
  const deliveriesQueued = dispatchEvent(event.id, event.eventType);
  res.status(202).json({ ...event, deliveriesQueued });
});

eventsRouter.get('/', (req, res) => {
  const eventType = typeof req.query.eventType === 'string' && req.query.eventType.length > 0 ? req.query.eventType : undefined;
  res.json(listEventsWithSummaries({ eventType }));
});

eventsRouter.get('/:id', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ ...event, deliverySummary: getDeliverySummary(event.id) });
});
