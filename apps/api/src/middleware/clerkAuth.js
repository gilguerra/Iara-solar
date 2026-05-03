import { verifyToken } from '@clerk/backend';
import { pgPool } from '../lib/postgres.js';

/**
 * Verifies a Clerk Bearer JWT and attaches request.tenant.
 * Used by portal-facing routes (dashboard API calls).
 *
 * Returns 401 if token is missing, invalid, or tenant not found.
 */
export async function clerkAuthMiddleware(request, reply) {
  const authHeader = request.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'unauthorized', message: 'Bearer token required' });
  }

  const token = authHeader.slice(7);

  let clerkUserId;
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    clerkUserId = payload.sub;
  } catch (err) {
    request.log.warn({ err: err.message }, 'Clerk token verification failed');
    return reply.code(401).send({ error: 'unauthorized', message: 'Invalid or expired token' });
  }

  const result = await pgPool.query(
    `SELECT id, name, slug, plan, status, email, cnpj, phone, settings
     FROM tenants
     WHERE clerk_user_id = $1 AND status = 'active'
     LIMIT 1`,
    [clerkUserId],
  );

  if (result.rowCount === 0) {
    return reply.code(401).send({ error: 'unauthorized', message: 'Tenant not found' });
  }

  request.tenant = result.rows[0];
}
