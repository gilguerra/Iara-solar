import {
  listSupplierKits,
  findMatchingSupplierKits,
} from '../repositories/supplierKitsRepository.js';

export async function supplierKitsRoutes(app) {
  app.get('/supplier-kits', async (request) => {
    const items = await listSupplierKits(request.tenant.id);
    return { items, count: items.length };
  });

  app.get('/supplier-kits/match', async (request, reply) => {
    const { target_kwp, limit } = request.query ?? {};

    const targetKwp = Number(target_kwp ?? 0);
    const parsedLimit = Number(limit ?? 3);

    if (!targetKwp || targetKwp <= 0) {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'target_kwp is required and must be greater than zero',
      });
    }

    const items = await findMatchingSupplierKits(targetKwp, request.tenant.id, parsedLimit);

    return { target_kwp: targetKwp, count: items.length, items };
  });
}
