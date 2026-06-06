import cors from 'cors';
import express from 'express';
import { config } from './config';
import { closeDb, openDb } from './db/connection';
import { assertSqliteSupportsReturning, initializeSchema } from './db/schema';
import { apiRouter } from './api/router';
import { dashboardRouter } from './dashboard/router';
import { recoverInProgressDeliveriesOnStartup } from './models/delivery';
import { configureDispatcher } from './worker/dispatcher';
import { DeliveryWorker } from './worker/deliveryWorker';

export function createApp(worker: DeliveryWorker): express.Express {
  configureDispatcher(() => worker.wake());
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: config.api.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false }));
  app.use('/api', apiRouter);
  app.use(dashboardRouter);
  return app;
}

async function main(): Promise<void> {
  const db = openDb();
  initializeSchema(db);
  const sqliteVersion = assertSqliteSupportsReturning(db);
  const recovered = recoverInProgressDeliveriesOnStartup();
  const worker = new DeliveryWorker();
  const app = createApp(worker);

  worker.start();
  const server = app.listen(config.port, () => {
    console.log(`Webhook service listening on http://localhost:${config.port}`);
    console.log(`SQLite ${sqliteVersion}, DB path ${config.db.path}, recovered ${recovered} in-progress deliveries`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('Shutting down...');
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await worker.stop();
    closeDb();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
