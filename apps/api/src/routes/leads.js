import { createLead, listLeads } from '../repositories/leadsRepository.js';

export async function leadsRoutes(app) {
  app.get('/leads', async (request) => {
    const leads = await listLeads(request.tenant.id);
    return { items: leads, count: leads.length };
  });

  app.post('/leads', async (request, reply) => {
    const body = request.body ?? {};

    if (!body.full_name || typeof body.full_name !== 'string') {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'full_name is required',
      });
    }

    const lead = await createLead({
      tenant_id: request.tenant.id,
      full_name: body.full_name.trim(),
      phone: body.phone,
      email: body.email,
      city: body.city,
      state: body.state,
      address_text: body.address_text,
      source: body.source,
      notes: body.notes,
      metadata: body.metadata,
    });

    return reply.code(201).send(lead);
  });
}
