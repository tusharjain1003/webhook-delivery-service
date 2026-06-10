function readNumberEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name];
  const value = rawValue === undefined ? defaultValue : Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive number`);
  }
  return value;
}

function readIntEnv(name: string, defaultValue: number): number {
  const value = readNumberEnv(name, defaultValue);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
}

function readFloatEnv(name: string, defaultValue: number): number {
  return readNumberEnv(name, defaultValue);
}

const deliveryTimeoutMs = readIntEnv('DELIVERY_TIMEOUT_MS', 30000);
const inProgressTimeoutSeconds = readIntEnv('IN_PROGRESS_TIMEOUT_SECONDS', 60);

if (inProgressTimeoutSeconds * 1000 <= deliveryTimeoutMs) {
  throw new Error('IN_PROGRESS_TIMEOUT_SECONDS must be greater than DELIVERY_TIMEOUT_MS');
}

export const config = {
  port: readIntEnv('PORT', 3001),
  adminApiKey: process.env.ADMIN_API_KEY || 'dev-api-key',

  worker: {
    pollIntervalMs: readIntEnv('WORKER_POLL_MS', 1000),
    batchSize: readIntEnv('WORKER_BATCH_SIZE', 10),
    concurrency: readIntEnv('WORKER_CONCURRENCY', 10),
    inProgressTimeoutSeconds
  },

  retry: {
    maxAttempts: readIntEnv('RETRY_MAX_ATTEMPTS', 5),
    baseDelayMs: readIntEnv('RETRY_BASE_DELAY_MS', 1000),
    maxDelayMs: readIntEnv('RETRY_MAX_DELAY_MS', 3600000),
    backoffMultiplier: readFloatEnv('RETRY_BACKOFF_MULTIPLIER', 2),
    jitterFactor: readFloatEnv('RETRY_JITTER_FACTOR', 0.25)
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
