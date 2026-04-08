import Fastify from 'fastify';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { healthRoutes } from './routes/health.js';
import { leadsRoutes } from './routes/leads.js';
import { budgetRequestsRoutes } from './routes/budgetRequests.js';
import { intakeRoutes } from './routes/intake.js';
import { quotesRoutes } from './routes/quotes.js';
import { intakeGenerateRoutes } from './routes/intakeGenerate.js';
import { supplierKitsRoutes } from './routes/supplierKits.js';
import { intakeGenerateWithKitsRoutes } from './routes/intakeGenerateWithKits.js';
import { pgPool } from './lib/postgres.js';
import { redis } from './lib/redis.js';

const app = Fastify({
  logger: true,
});

// Auth: validates X-API-Key and attaches request.tenant for all non-public routes
app.addHook('onRequest', authMiddleware);

await app.register(healthRoutes);
await app.register(leadsRoutes);
await app.register(budgetRequestsRoutes);
await app.register(intakeRoutes);
await app.register(quotesRoutes);
await app.register(intakeGenerateRoutes);
await app.register(supplierKitsRoutes);
await app.register(intakeGenerateWithKitsRoutes);

app.addHook('onClose', async () => {
  await pgPool.end();
  if (redis.status === 'ready' || redis.status === 'connecting') {
    await redis.quit();
  }
});

const start = async () => {
  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`API listening on ${env.host}:${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
