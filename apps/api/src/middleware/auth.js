import { createHash } from 'crypto';
import { pgPool } from '../lib/postgres.js';

// Routes that do not require authentication
// Routes that skip X-API-Key auth (use Clerk JWT or no auth)
const PUBLIC_PATHS = new Set(['/health', '/health/full', '/version', '/webhooks/clerk', '/me', '/me/stats', '/setup/distributor']);

// Prefix-based public paths (e.g. /portal/*)
const PUBLIC_PREFIXES = ['/portal/'];

/**
 * Fastify onRequest hook — validates X-API-Key header and attaches
 * the resolved tenant to `request.tenant`.
 *
 * To generate a new API key and its hash for insertion:
 *
 *   node -e "
 *     const { randomBytes, createHash } = require('crypto');
 *     const key = randomBytes(32).toString('hex');
 *     const hash = createHash('sha256').update(key).digest('hex');
 *     console.log('key:', key, '\nhash:', hash);
 *   "
 *
 * Then insert the hash into the api_keys table:
 *   INSERT INTO api_keys (tenant_id, key_hash, name)
 *   VALUES ('<tenant-uuid>', '<hash>', 'n8n-production');
 *
 * The raw key goes into n8n (or wherever) as the X-API-Key header value.
 * Never store the raw key in the database.
 */
export async function authMiddleware(request, reply) {
  if (PUBLIC_PATHS.has(request.url)) return;
  if (PUBLIC_PREFIXES.some((p) => request.url.startsWith(p))) return;

  const rawKey = request.headers['x-api-key'];

  if (!rawKey) {
    return reply.code(401).send({
      error: 'unauthorized',
      message: 'X-API-Key header is required',
    });
  }

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const result = await pgPool.query(
    `SELECT
       ak.id   AS api_key_id,
       t.id    AS tenant_id,
       t.name  AS tenant_name,
       t.slug  AS tenant_slug,
       t.plan  AS tenant_plan,
       t.settings AS tenant_settings
     FROM api_keys ak
     JOIN tenants t ON t.id = ak.tenant_id
     WHERE ak.key_hash = $1
       AND ak.is_active = true
       AND t.status = 'active'
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
     LIMIT 1`,
    [keyHash],
  );

  if (result.rowCount === 0) {
    return reply.code(401).send({
      error: 'unauthorized',
      message: 'Invalid or expired API key',
    });
  }

  const row = result.rows[0];

  // Update last_used_at without blocking the request
  pgPool
    .query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.api_key_id])
    .catch(() => {});

  request.tenant = {
    id: row.tenant_id,
    name: row.tenant_name,
    slug: row.tenant_slug,
    plan: row.tenant_plan,
    settings: row.tenant_settings ?? {},
  };
}
