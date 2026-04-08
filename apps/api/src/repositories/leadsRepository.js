import { pgPool } from '../lib/postgres.js';

export async function createLead(data) {
  const query = `
    INSERT INTO leads (
      tenant_id,
      full_name,
      phone,
      email,
      city,
      state,
      address_text,
      source,
      notes,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    RETURNING *
  `;

  const values = [
    data.tenant_id,
    data.full_name,
    data.phone ?? null,
    data.email ?? null,
    data.city ?? null,
    data.state ?? null,
    data.address_text ?? null,
    data.source ?? 'manual',
    data.notes ?? null,
    JSON.stringify(data.metadata ?? {}),
  ];

  const result = await pgPool.query(query, values);
  return result.rows[0];
}

export async function listLeads(tenantId) {
  const query = `
    SELECT *
    FROM leads
    WHERE tenant_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pgPool.query(query, [tenantId]);
  return result.rows;
}
