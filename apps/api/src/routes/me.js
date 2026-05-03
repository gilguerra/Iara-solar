import { clerkAuthMiddleware } from '../middleware/clerkAuth.js';
import { pgPool } from '../lib/postgres.js';

export async function meRoutes(app) {
  // GET /me — returns the logged-in tenant's profile and setup status
  app.get('/me', { preHandler: clerkAuthMiddleware }, async (request, reply) => {
    const tenantId = request.tenant.id;

    // Check which integrations are configured
    const setupResult = await pgPool.query(
      `SELECT
         (SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1 AND is_active = true) AS api_keys_count,
         t.stripe_account_id,
         t.distributor_code,
         t.distributor_synced_at
       FROM tenants t
       WHERE t.id = $1`,
      [tenantId],
    );

    const setup = setupResult.rows[0];

    return reply.send({
      id:          request.tenant.id,
      name:        request.tenant.name,
      slug:        request.tenant.slug,
      plan:        request.tenant.plan,
      email:       request.tenant.email,
      cnpj:        request.tenant.cnpj,
      phone:       request.tenant.phone,
      setup: {
        whatsapp_connected:   false, // will be true when waba_id is set
        stripe_connected:     !!setup.stripe_account_id,
        distributor_connected: !!setup.distributor_code,
        distributor_synced_at: setup.distributor_synced_at ?? null,
      },
    });
  });

  // GET /me/stats — dashboard overview numbers
  app.get('/me/stats', { preHandler: clerkAuthMiddleware }, async (request, reply) => {
    const tenantId = request.tenant.id;

    const result = await pgPool.query(
      `SELECT
         (SELECT COUNT(*) FROM quote_versions qv
          JOIN budget_requests br ON br.id = qv.budget_request_id
          WHERE br.tenant_id = $1
            AND qv.created_at >= date_trunc('month', NOW())) AS quotes_this_month,
         (SELECT COUNT(*) FROM leads WHERE tenant_id = $1) AS total_leads,
         (SELECT COUNT(*) FROM quote_versions qv
          JOIN budget_requests br ON br.id = qv.budget_request_id
          WHERE br.tenant_id = $1) AS total_quotes`,
      [tenantId],
    );

    return reply.send(result.rows[0]);
  });
}
