import { createTenantMiddleware } from './prisma-tenant.middleware';

describe('Prisma Multi-Tenant Middleware', () => {
  let currentCustomerId: string | undefined;

  const middleware = createTenantMiddleware(() => currentCustomerId);

  const makeParams = (model: string, action: string, where: Record<string, unknown> = {}) => ({
    model,
    action,
    args: { where },
    dataPath: [],
    runInTransaction: false,
  });

  const nextFn = jest.fn(async (params: unknown) => params);

  beforeEach(() => {
    nextFn.mockClear();
    currentCustomerId = 'customer-A';
  });

  it('injects customer_id when not present', async () => {
    const params = makeParams('CanonicalCandidate', 'findMany', {});
    await middleware(params as Parameters<typeof middleware>[0], nextFn);
    expect(params.args.where.customer_id).toBe('customer-A');
  });

  it('allows query when customer_id matches tenant', async () => {
    const params = makeParams('CanonicalCandidate', 'findMany', { customer_id: 'customer-A' });
    await expect(middleware(params as Parameters<typeof middleware>[0], nextFn)).resolves.toBeDefined();
  });

  it('blocks cross-tenant reads', async () => {
    currentCustomerId = 'customer-A';
    const params = makeParams('CanonicalCandidate', 'findMany', { customer_id: 'customer-B' });
    await expect(middleware(params as Parameters<typeof middleware>[0], nextFn)).rejects.toThrow('Cross-tenant query blocked');
  });

  it('does not apply to non-tenant models', async () => {
    currentCustomerId = 'customer-A';
    const params = makeParams('SomeOtherModel', 'findMany', {});
    await middleware(params as Parameters<typeof middleware>[0], nextFn);
    expect(params.args.where.customer_id).toBeUndefined();
  });

  it('injects customer_id for count action', async () => {
    const params = makeParams('Event', 'count', {});
    await middleware(params as Parameters<typeof middleware>[0], nextFn);
    expect(params.args.where.customer_id).toBe('customer-A');
  });

  it('does not inject when no customerId in context', async () => {
    currentCustomerId = undefined;
    const params = makeParams('CanonicalCandidate', 'findMany', {});
    await middleware(params as Parameters<typeof middleware>[0], nextFn);
    expect(params.args.where.customer_id).toBeUndefined();
  });
});
