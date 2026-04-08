import {
  findBudgetRequestById,
  getNextQuoteVersionNumber,
  createQuoteVersion,
  listQuoteVersions,
} from '../repositories/quotesRepository.js';
import { generatePreQuote } from '../services/quoteGenerationService.js';

export async function quotesRoutes(app) {
  app.get('/quotes', async (request) => {
    const items = await listQuoteVersions(request.tenant.id);
    return { items, count: items.length };
  });

  app.post('/quotes/generate', async (request, reply) => {
    const body = request.body ?? {};

    if (!body.budget_request_id || typeof body.budget_request_id !== 'string') {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'budget_request_id is required',
      });
    }

    const budgetRequest = await findBudgetRequestById(body.budget_request_id, request.tenant.id);

    if (!budgetRequest) {
      return reply.code(404).send({
        error: 'not_found',
        message: 'budget request not found',
      });
    }

    let generated;

    try {
      generated = await generatePreQuote(budgetRequest);
    } catch (error) {
      return reply.code(400).send({
        error: 'quote_generation_error',
        message: error.message,
      });
    }

    const versionNumber = await getNextQuoteVersionNumber(body.budget_request_id);

    const quote = await createQuoteVersion({
      tenant_id: request.tenant.id,
      budget_request_id: body.budget_request_id,
      version_number: versionNumber,
      status: 'generated',
      ...generated,
    });

    return reply.code(201).send({ budget_request: budgetRequest, quote_version: quote });
  });
}
