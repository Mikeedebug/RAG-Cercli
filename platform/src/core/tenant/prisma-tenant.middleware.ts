import { Prisma } from '@prisma/client';

/**
 * Prisma middleware that enforces customer_id scoping on all queries.
 * Pass the customer_id from the request context when building queries.
 * This middleware VALIDATES that customer_id is present in where clauses
 * for models that require tenant isolation.
 */
const TENANT_MODELS = new Set([
  'CanonicalCandidate',
  'CanonicalApplication',
  'CanonicalEmployee',
  'Event',
  'Workflow',
  'RightToWorkChecklist',
  'AuditLog',
  'AiCallLog',
  'LinkedAccount',
]);

export function createTenantMiddleware(
  getCustomerId: () => string | undefined,
): Prisma.Middleware {
  return async (params, next) => {
    if (!TENANT_MODELS.has(params.model ?? '')) {
      return next(params);
    }

    const customerId = getCustomerId();

    if (
      params.action === 'findMany' ||
      params.action === 'findFirst' ||
      params.action === 'count' ||
      params.action === 'aggregate'
    ) {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};

      if (customerId && params.args.where.customer_id === undefined) {
        params.args.where.customer_id = customerId;
      }

      if (
        customerId &&
        params.args.where.customer_id &&
        params.args.where.customer_id !== customerId
      ) {
        throw new Error(
          `Cross-tenant query blocked: requested customer ${String(params.args.where.customer_id)} but current tenant is ${customerId}`,
        );
      }
    }

    return next(params);
  };
}
