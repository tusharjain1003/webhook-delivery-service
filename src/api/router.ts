import { Router } from 'express';
import { requireApiKey } from '../middleware/auth';
import { deliveriesRouter } from './deliveries';
import { eventsRouter } from './events';
import { subscriptionsRouter } from './subscriptions';

export const apiRouter = Router();

apiRouter.use(requireApiKey);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/', deliveriesRouter);
