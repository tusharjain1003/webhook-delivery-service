import { Router } from 'express';
import { getEvent, listEventsWithSummaries } from '../models/event';
import { listDeliveriesByEvent, resetDeliveryForManualRetry } from '../models/delivery';
import { listAttemptsByDelivery } from '../models/deliveryAttempt';
import { createSubscription, deactivateSubscription, listSubscriptions, toPublicSubscription } from '../models/subscription';
import { isSupportedPattern } from '../utils/patternMatch';
import { eventDetailPage, eventsPage, subscriptionsPage } from './templates';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_req, res) => {
  res.send(subscriptionsPage(listSubscriptions().map(toPublicSubscription)));
});

dashboardRouter.get('/events', (req, res) => {
  const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : '';
  res.send(eventsPage(listEventsWithSummaries({ eventType: eventType || undefined }), eventType));
});

dashboardRouter.get('/events/:id', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).send('Event not found');
  const deliveries = listDeliveriesByEvent(event.id).map((delivery) => ({
    ...delivery,
    attempts: listAttemptsByDelivery(delivery.id)
  }));
  res.send(eventDetailPage(event, deliveries));
});

dashboardRouter.post('/dashboard/subscriptions', (req, res) => {
  const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';
  const secret = typeof req.body.secret === 'string' && req.body.secret.trim() ? req.body.secret.trim() : undefined;
  const eventTypes =
    typeof req.body.eventTypes === 'string'
      ? req.body.eventTypes.split(',').map((value: string) => value.trim()).filter(Boolean)
      : [];

  let validUrl = false;
  try {
    new URL(url);
    validUrl = true;
  } catch {
    validUrl = false;
  }

  if (validUrl && eventTypes.length > 0 && eventTypes.every(isSupportedPattern)) {
    createSubscription({ url, secret, eventTypes });
  }
  res.redirect('/');
});

dashboardRouter.post('/dashboard/subscriptions/:id/delete', (req, res) => {
  deactivateSubscription(req.params.id);
  res.redirect('/');
});

dashboardRouter.post('/dashboard/deliveries/:id/retry', (req, res) => {
  resetDeliveryForManualRetry(req.params.id);
  const referer = req.get('referer');
  res.redirect(referer || '/events');
});
