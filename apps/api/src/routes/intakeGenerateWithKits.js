import { createIntakeGenerateWithKits } from '../repositories/intakeGenerateWithKitsRepository.js';

export async function intakeGenerateWithKitsRoutes(app) {
  app.post('/intake/generate-with-kits', async (request, reply) => {
    const body = request.body ?? {};

    if (!body.lead || typeof body.lead !== 'object') {
      return reply.code(400).send({ error: 'validation_error', message: 'lead is required' });
    }

    if (!body.budget_request || typeof body.budget_request !== 'object') {
      return reply.code(400).send({ error: 'validation_error', message: 'budget_request is required' });
    }

    if (!body.lead.full_name || typeof body.lead.full_name !== 'string') {
      return reply.code(400).send({ error: 'validation_error', message: 'lead.full_name is required' });
    }

    const monthlyConsumption = Number(body.budget_request.monthly_consumption_kwh ?? 0);

    if (!monthlyConsumption || monthlyConsumption <= 0) {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'budget_request.monthly_consumption_kwh is required and must be greater than zero',
      });
    }

    try {
      const result = await createIntakeGenerateWithKits({
        tenant_id: request.tenant.id,
        lead: {
          full_name: body.lead.full_name.trim(),
          phone: body.lead.phone,
          email: body.lead.email,
          city: body.lead.city,
          state: body.lead.state,
          address_text: body.lead.address_text,
          source: body.lead.source,
          notes: body.lead.notes,
          metadata: body.lead.metadata,
        },
        budget_request: {
          status: body.budget_request.status,
          monthly_consumption_kwh: body.budget_request.monthly_consumption_kwh,
          bill_amount_brl: body.budget_request.bill_amount_brl,
          utility_company: body.budget_request.utility_company,
          connection_type: body.budget_request.connection_type,
          installation_type: body.budget_request.installation_type,
          roof_type: body.budget_request.roof_type,
          notes: body.budget_request.notes,
          input_payload: body.budget_request.input_payload,
        },
        kits_limit: body.kits_limit ?? 3,
      });

      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(400).send({ error: 'intake_generate_with_kits_error', message: error.message });
    }
  });
}
