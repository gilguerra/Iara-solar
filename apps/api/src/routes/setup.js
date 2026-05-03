import { clerkAuthMiddleware } from '../middleware/clerkAuth.js';
import { pgPool } from '../lib/postgres.js';

export async function setupRoutes(app) {
  // GET /portal/kits — list kits for the logged-in tenant
  app.get('/portal/kits', { preHandler: clerkAuthMiddleware }, async (request, reply) => {
    const { search, min_kwp, max_kwp } = request.query ?? {};

    let where = `sk.is_active IS NOT FALSE AND ss.tenant_id = $1`;
    const params = [request.tenant.id];
    let idx = 2;

    if (search) {
      where += ` AND (sk.supplier_kit_name ILIKE $${idx} OR sk.brand_module ILIKE $${idx} OR sk.brand_inverter ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (min_kwp) { where += ` AND sk.kit_power_kwp >= $${idx++}`; params.push(Number(min_kwp)); }
    if (max_kwp) { where += ` AND sk.kit_power_kwp <= $${idx++}`; params.push(Number(max_kwp)); }

    const result = await pgPool.query(
      `SELECT
         sk.id, sk.supplier_kit_name AS name, sk.kit_power_kwp, sk.brand_module,
         sk.brand_inverter, sk.module_power_w, sk.module_quantity, sk.inverter_power_kw,
         sk.phase_type, sk.system_type, sk.is_active,
         skp.price_cash_brl, skp.price_term_brl, skp.availability_status, skp.captured_at
       FROM supplier_kits sk
       JOIN supplier_sources ss ON ss.id = sk.supplier_source_id
       LEFT JOIN LATERAL (
         SELECT price_cash_brl, price_term_brl, availability_status, captured_at
         FROM supplier_kit_prices
         WHERE supplier_kit_id = sk.id
         ORDER BY captured_at DESC LIMIT 1
       ) skp ON true
       WHERE ${where}
       ORDER BY sk.kit_power_kwp ASC`,
      params,
    );

    return reply.send(result.rows);
  });

  // PATCH /portal/kits/:id/toggle — activate/deactivate a kit
  app.put('/portal/kits/:id/toggle', { preHandler: clerkAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const result = await pgPool.query(
      `UPDATE supplier_kits sk
       SET is_active = NOT sk.is_active
       FROM supplier_sources ss
       WHERE sk.id = $1 AND ss.id = sk.supplier_source_id AND ss.tenant_id = $2
       RETURNING sk.id, sk.is_active`,
      [id, request.tenant.id],
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'not_found' });
    return reply.send(result.rows[0]);
  });

  // POST /setup/distributor — save distributor credentials
  app.post('/setup/distributor', { preHandler: clerkAuthMiddleware }, async (request, reply) => {
    const { distributor_code, api_key } = request.body ?? {};

    if (!distributor_code) {
      return reply.code(400).send({ error: 'validation_error', message: 'distributor_code is required' });
    }

    const credentials = api_key ? { api_key } : undefined;

    await pgPool.query(
      `UPDATE tenants
       SET distributor_code        = $1,
           distributor_credentials = COALESCE($2::jsonb, distributor_credentials),
           updated_at              = NOW()
       WHERE id = $3`,
      [
        distributor_code,
        credentials ? JSON.stringify(credentials) : null,
        request.tenant.id,
      ],
    );

    return reply.send({ success: true });
  });
}
