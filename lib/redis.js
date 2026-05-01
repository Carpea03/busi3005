import { createClient } from 'redis';

let redisClient;

function attachRedisErrorLogger(client) {
  client.on('error', (error) => {
    console.error('Redis client error:', error);
  });
}

export async function getRedisClient() {
  if (!process.env.REDIS_URL) {
    throw new Error('Missing REDIS_URL environment variable');
  }

  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    attachRedisErrorLogger(redisClient);
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}

export async function createRedisSubscriber() {
  const redis = await getRedisClient();
  const subscriber = redis.duplicate();
  attachRedisErrorLogger(subscriber);

  if (!subscriber.isOpen) {
    await subscriber.connect();
  }

  return subscriber;
}

export async function publishRedisMessage(channel, payload) {
  const redis = await getRedisClient();
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  await redis.publish(channel, message);
}
