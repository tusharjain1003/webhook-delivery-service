import { Router } from 'express';
import { getEvent } from '../models/event';
import { listDeliveriesByEvent, resetDeliveryForManualRetry } from '../models/delivery';
import { listAttemptsByDelivery } from '../models/deliveryAttempt';

export const deliveriesRouter = Router();

deliveriesRouter.get('/events/:eventId/deliveries', (req, res) => {
  const event = getEvent(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const deliveries = listDeliveriesByEvent(event.id).map((delivery) => ({
    ...delivery,
    attempts: listAttemptsByDelivery(delivery.id)
  }));
  res.json(deliveries);
});

deliveriesRouter.post('/deliveries/:id/retry', (req, res) => {
  const result = resetDeliveryForManualRetry(req.params.id);
  if (result === 'not_found') return res.status(404).json({ error: 'Delivery not found' });
  if (result === 'invalid_state') return res.status(409).json({ error: 'Only failed or exhausted deliveries can be retried' });
  res.json({ status: 'retried' });
});
