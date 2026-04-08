import { pgPool } from '../lib/postgres.js';

export async function findBudgetRequestById(id, tenantId) {
  const query = `
    SELECT br.*, l.full_name AS lead_full_name
    FROM budget_requests br
    JOIN leads l ON l.id = br.lead_id
    WHERE br.id = $1
      AND br.tenant_id = $2
    LIMIT 1
  `;

  const result = await pgPool.query(query, [id, tenantId]);
  return result.rows[0] ?? null;
}

export async function getNextQuoteVersionNumber(budgetRequestId) {
  const query = `
    SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
    FROM quote_versions
    WHERE budget_request_id = $1
  `;

  const result = await pgPool.query(query, [budgetRequestId]);
  return Number(result.rows[0].next_version);
}

export async function createQuoteVersion(data) {
  const query = `
    INSERT INTO quote_versions (
      tenant_id,
      budget_request_id,
      version_number,
      status,
      estimated_system_kwp,
      estimated_generation_kwh,
      estimated_savings_brl,
      estimated_price_brl,
      assumptions,
      result_payload
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
    RETURNING *
  `;

  const values = [
    data.tenant_id,
    data.budget_request_id,
    data.version_number,
    data.status ?? 'draft',
    data.estimated_system_kwp,
    data.estimated_generation_kwh,
    data.estimated_savings_brl,
    data.estimated_price_brl,
    JSON.stringify(data.assumptions ?? {}),
    JSON.stringify(data.result_payload ?? {}),
  ];

  const result = await pgPool.query(query, values);
  return result.rows[0];
}

export async function listQuoteVersions(tenantId) {
  const query = `
    SELECT qv.*, br.lead_id
    FROM quote_versions qv
    JOIN budget_requests br ON br.id = qv.budget_request_id
    WHERE qv.tenant_id = $1
    ORDER BY qv.created_at DESC
  `;

  const result = await pgPool.query(query, [tenantId]);
  return result.rows;
}
