import { pgPool } from '../lib/postgres.js';

export async function createBudgetRequest(data) {
  const query = `
    INSERT INTO budget_requests (
      tenant_id,
      lead_id,
      status,
      monthly_consumption_kwh,
      bill_amount_brl,
      utility_company,
      connection_type,
      installation_type,
      roof_type,
      notes,
      input_payload
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
    RETURNING *
  `;

  const values = [
    data.tenant_id,
    data.lead_id,
    data.status ?? 'pending',
    data.monthly_consumption_kwh ?? null,
    data.bill_amount_brl ?? null,
    data.utility_company ?? null,
    data.connection_type ?? null,
    data.installation_type ?? null,
    data.roof_type ?? null,
    data.notes ?? null,
    JSON.stringify(data.input_payload ?? {}),
  ];

  const result = await pgPool.query(query, values);
  return result.rows[0];
}

export async function listBudgetRequests(tenantId) {
  const query = `
    SELECT
      br.*,
      l.full_name AS lead_full_name,
      l.phone AS lead_phone,
      l.email AS lead_email
    FROM budget_requests br
    JOIN leads l ON l.id = br.lead_id
    WHERE br.tenant_id = $1
    ORDER BY br.created_at DESC
  `;

  const result = await pgPool.query(query, [tenantId]);
  return result.rows;
}

export async function leadExists(leadId, tenantId) {
  const query = `
    SELECT 1
    FROM leads
    WHERE id = $1
      AND tenant_id = $2
    LIMIT 1
  `;

  const result = await pgPool.query(query, [leadId, tenantId]);
  return result.rowCount > 0;
}
