import { pgPool } from '../lib/postgres.js';
import { generatePreQuote } from '../services/quoteGenerationService.js';

export async function createIntakeAndGenerate(payload) {
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

    const generated = await generatePreQuote({
      ...budgetRequest,
      lead_full_name: lead.full_name,
    });

    const nextVersionResult = await client.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM quote_versions
       WHERE budget_request_id = $1`,
      [budgetRequest.id],
    );
    const versionNumber = Number(nextVersionResult.rows[0].next_version);

    const quoteQuery = `
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

    const quoteValues = [
      payload.tenant_id,
      budgetRequest.id,
      versionNumber,
      'generated',
      generated.estimated_system_kwp,
      generated.estimated_generation_kwh,
      generated.estimated_savings_brl,
      generated.estimated_price_brl,
      JSON.stringify(generated.assumptions ?? {}),
      JSON.stringify(generated.result_payload ?? {}),
    ];

    const quoteResult = await client.query(quoteQuery, quoteValues);
    const quoteVersion = quoteResult.rows[0];

    await client.query('COMMIT');

    return { lead, budget_request: budgetRequest, quote_version: quoteVersion };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
