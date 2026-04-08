import { pgPool } from '../lib/postgres.js';

export async function createIntake(payload) {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    const leadQuery = `
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

    const leadValues = [
      payload.tenant_id,
      payload.lead.full_name,
      payload.lead.phone ?? null,
      payload.lead.email ?? null,
      payload.lead.city ?? null,
      payload.lead.state ?? null,
      payload.lead.address_text ?? null,
      payload.lead.source ?? 'manual',
      payload.lead.notes ?? null,
      JSON.stringify(payload.lead.metadata ?? {}),
    ];

    const leadResult = await client.query(leadQuery, leadValues);
    const lead = leadResult.rows[0];

    const budgetQuery = `
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

    const budgetValues = [
      payload.tenant_id,
      lead.id,
      payload.budget_request.status ?? 'pending',
      payload.budget_request.monthly_consumption_kwh ?? null,
      payload.budget_request.bill_amount_brl ?? null,
      payload.budget_request.utility_company ?? null,
      payload.budget_request.connection_type ?? null,
      payload.budget_request.installation_type ?? null,
      payload.budget_request.roof_type ?? null,
      payload.budget_request.notes ?? null,
      JSON.stringify(payload.budget_request.input_payload ?? {}),
    ];

    const budgetResult = await client.query(budgetQuery, budgetValues);
    const budgetRequest = budgetResult.rows[0];

    await client.query('COMMIT');

    return { lead, budget_request: budgetRequest };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
