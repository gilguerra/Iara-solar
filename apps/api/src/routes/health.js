import { checkPostgres } from '../lib/postgres.js';
import { checkRedis } from '../lib/redis.js';

export async function healthRoutes(app) {
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'iara-solar-api',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/health/full', async (_, reply) => {
    const result = {
      status: 'ok',
      service: 'iara-solar-api',
      timestamp: new Date().toISOString(),
      checks: {},
    };

    try {
      result.checks.postgres = await checkPostgres();
    } catch (error) {
      result.status = 'degraded';
      result.checks.postgres = {
        ok: false,
        error: error.message,
      };
    }

    try {
      result.checks.redis = await checkRedis();
    } catch (error) {
      result.status = 'degraded';
      result.checks.redis = {
        ok: false,
        error: error.message,
      };
    }

    const httpStatus = result.status === 'ok' ? 200 : 503;
    return reply.code(httpStatus).send(result);
  });

  app.get('/version', async () => {
    return {
      name: 'iara-solar-api',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };
  });
}
