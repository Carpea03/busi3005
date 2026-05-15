import { createClient } from 'redis';

const REDIS_CONNECT_TIMEOUT_MS = 5000;

let redisClient;
let redisConnectPromise;

export function resolveRedisUrl(env = process.env) {
  const directUrl = typeof env.REDIS_URL === 'string' ? env.REDIS_URL.trim() : '';
  if (directUrl) {
    return directUrl;
  }

  const fallbackEntry = Object.entries(env)
    .filter(([key, value]) => key.endsWith('_REDIS_URL') && typeof value === 'string' && value.trim())
    .sort(([left], [right]) => left.localeCompare(right))[0];

  return fallbackEntry ? fallbackEntry[1].trim() : '';
}

function attachRedisErrorLogger(client) {
  client.on('error', (error) => {
    console.error('Redis client error:', error);
  });
}

function resetSharedRedisClient(client) {
  if (redisClient === client) {
    redisClient = undefined;
  }
}

function toRedisConnectionError(error) {
  if (error instanceof Error) {
    if (error.code === 'ENOTFOUND') {
      return new Error('Unable to resolve the Redis host from REDIS_URL.', { cause: error });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new Error('Unable to connect to Redis at the configured REDIS_URL.', { cause: error });
    }

    return error;
  }

  return new Error('Unable to connect to Redis.');
}

function buildRedisClient(redisUrl) {
  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy() {
        return false;
      },
    },
  });

  attachRedisErrorLogger(client);
  client.on('end', () => {
    resetSharedRedisClient(client);
  });

  return client;
}

async function ensureRedisConnected(client) {
  if (client.isReady) {
    return client;
  }

  if (!redisConnectPromise) {
    redisConnectPromise = client.connect()
      .catch((error) => {
        resetSharedRedisClient(client);
        throw toRedisConnectionError(error);
      })
      .finally(() => {
        redisConnectPromise = undefined;
      });
  }

  await redisConnectPromise;
  return client;
}

async function connectSubscriber(subscriber) {
  if (subscriber.isReady) {
    return subscriber;
  }

  try {
    await subscriber.connect();
    return subscriber;
  } catch (error) {
    throw toRedisConnectionError(error);
  }
}

export async function getRedisClient() {
  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    throw new Error('Missing Redis connection URL environment variable. Expected REDIS_URL or *_REDIS_URL.');
  }

  if (!redisClient) {
    redisClient = buildRedisClient(redisUrl);
  }

  return ensureRedisConnected(redisClient);
}

export async function createRedisSubscriber() {
  const redis = await getRedisClient();
  const subscriber = redis.duplicate();
  attachRedisErrorLogger(subscriber);
  return connectSubscriber(subscriber);
}

export async function publishRedisMessage(channel, payload) {
  const redis = await getRedisClient();
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  await redis.publish(channel, message);
}
