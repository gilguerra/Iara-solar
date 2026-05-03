import { Webhook } from 'svix';
import { pgPool } from '../lib/postgres.js';
import { randomBytes, createHash } from 'crypto';

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

function generateApiKey() {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

async function uniqueSlug(client, base) {
  let slug = base;
  let suffix = 0;
  while (true) {
    const { rowCount } = await client.query('SELECT 1 FROM tenants WHERE slug = $1', [slug]);
    if (rowCount === 0) return slug;
    suffix++;
    slug = `${base}-${suffix}`;
  }
}

export async function webhooksClerkRoutes(app) {
  // Raw body needed for svix signature verification
  app.post(
    '/webhooks/clerk',
    { config: { rawBody: true } },
    async (request, reply) => {
      if (!CLERK_WEBHOOK_SECRET) {
        app.log.error('CLERK_WEBHOOK_SECRET is not set');
        return reply.code(500).send({ error: 'webhook_not_configured' });
      }

      const wh = new Webhook(CLERK_WEBHOOK_SECRET);
      let event;

      try {
        event = wh.verify(request.rawBody, {
          'svix-id':        request.headers['svix-id'],
          'svix-timestamp': request.headers['svix-timestamp'],
          'svix-signature': request.headers['svix-signature'],
        });
      } catch {
        return reply.code(400).send({ error: 'invalid_signature' });
      }

      if (event.type === 'user.created') {
        const { id: clerkUserId, email_addresses, unsafe_metadata } = event.data;
        const email        = email_addresses?.[0]?.email_address ?? null;
        const companyName  = unsafe_metadata?.companyName || email?.split('@')[0] || 'Nova Empresa';
        const cnpj         = unsafe_metadata?.cnpj || null;
        const phone        = unsafe_metadata?.phone || null;

        const client = await pgPool.connect();
        try {
          await client.query('BEGIN');

          const base = slugify(companyName);
          const slug = await uniqueSlug(client, base);

          const { rows } = await client.query(
            `INSERT INTO tenants (name, slug, plan, status, clerk_user_id, email, phone, cnpj)
             VALUES ($1, $2, 'starter', 'active', $3, $4, $5, $6)
             ON CONFLICT (clerk_user_id) DO NOTHING
             RETURNING id`,
            [companyName, slug, clerkUserId, email, phone, cnpj],
          );

          if (rows.length > 0) {
            const tenantId = rows[0].id;
            const { hash } = generateApiKey();

            await client.query(
              `INSERT INTO api_keys (tenant_id, key_hash, name)
               VALUES ($1, $2, 'default')`,
              [tenantId, hash],
            );

            app.log.info({ tenantId, clerkUserId, slug }, 'Tenant created from Clerk webhook');
          }

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          app.log.error(err, 'Failed to create tenant from Clerk webhook');
          return reply.code(500).send({ error: 'tenant_creation_failed' });
        } finally {
          client.release();
        }
      }

      return reply.code(200).send({ received: true });
    },
  );
}
