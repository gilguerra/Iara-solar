import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

export async function checkRedis() {
  if (redis.status !== 'ready') {
    await redis.connect();
  }

  const pong = await redis.ping();

  return {
    ok: pong === 'PONG',
    pong,
  };
}
