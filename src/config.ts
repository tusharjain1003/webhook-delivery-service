const deliveryTimeoutMs = parseInt(process.env.DELIVERY_TIMEOUT_MS || '30000', 10);
const inProgressTimeoutSeconds = parseInt(process.env.IN_PROGRESS_TIMEOUT_SECONDS || '60', 10);

if (inProgressTimeoutSeconds * 1000 <= deliveryTimeoutMs) {
  throw new Error('IN_PROGRESS_TIMEOUT_SECONDS must be greater than DELIVERY_TIMEOUT_MS');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  adminApiKey: process.env.ADMIN_API_KEY || 'dev-api-key',

  worker: {
    pollIntervalMs: parseInt(process.env.WORKER_POLL_MS || '1000', 10),
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || '10', 10),
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '10', 10),
    inProgressTimeoutSeconds
  },

  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '5', 10),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '3600000', 10),
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
    jitterFactor: parseFloat(process.env.RETRY_JITTER_FACTOR || '0.25')
  },

  delivery: {
    timeoutMs: deliveryTimeoutMs
  },

  api: {
    jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb'
  },

  db: {
    path: process.env.DB_PATH || './data/webhooks.db'
  }
};
