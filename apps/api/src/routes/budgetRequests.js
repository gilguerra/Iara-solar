import {
  createBudgetRequest,
  listBudgetRequests,
  leadExists,
} from '../repositories/budgetRequestsRepository.js';

export async function budgetRequestsRoutes(app) {
  app.get('/budget-requests', async (request) => {
    const items = await listBudgetRequests(request.tenant.id);
    return { items, count: items.length };
  });

  app.post('/budget-requests', async (request, reply) => {
    const body = request.body ?? {};

    if (!body.lead_id || typeof body.lead_id !== 'string') {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'lead_id is required',
      });
    }

    const exists = await leadExists(body.lead_id, request.tenant.id);

    if (!exists) {
      return reply.code(404).send({
        error: 'not_found',
        message: 'lead not found',
      });
    }

    const budgetRequest = await createBudgetRequest({
      tenant_id: request.tenant.id,
      lead_id: body.lead_id,
      status: body.status,
      monthly_consumption_kwh: body.monthly_consumption_kwh,
      bill_amount_brl: body.bill_amount_brl,
      utility_company: body.utility_company,
      connection_type: body.connection_type,
      installation_type: body.installation_type,
      roof_type: body.roof_type,
      notes: body.notes,
      input_payload: body.input_payload,
    });

    return reply.code(201).send(budgetRequest);
  });
}
