import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@ats/db', () => {
  const roles = { id: 'roles-table' }
  const pipelineStages = { id: 'pipeline-stages-table', role_id: 'role_id', position: 'position' }
  const pipelineTemplates = { id: 'pipeline-templates-table' }
  return {
    roles,
    pipelineStages,
    pipelineTemplates,
    eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
    and: vi.fn((...args) => ({ args, op: 'and' })),
  }
})

vi.mock('../services/events.service.js', () => ({
  writeEventRecord: vi.fn().mockResolvedValue({ id: 'evt-id' }),
}))

import { createRole, publishRole, closeRole } from '../services/roles.service.js'
import { writeEventRecord } from '../services/events.service.js'

const ORG_ID = 'org-uuid-0001'
const ACTOR_ID = 'user-uuid-0002'

function makeRole(overrides: Record<string, unknown> = {}) {
  return { id: 'role-uuid-1111', organization_id: ORG_ID, title: 'Senior Engineer', department: 'Engineering', status: 'draft', published_at: null, closed_at: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'), ...overrides }
}

function makeMockDb(options: { selectRows?: unknown[][], insertRow?: unknown, updateRow?: unknown } = {}) {
  let selectCallIndex = 0
  function nextRows() { const rows = options.selectRows?.[selectCallIndex] ?? []; selectCallIndex++; return rows }
  const limit = vi.fn().mockImplementation(() => Promise.resolve(nextRows()))
  const orderBy: ReturnType<typeof vi.fn> = vi.fn().mockImplementation(() => {
    const rows = nextRows()
    const p = Promise.resolve(rows) as Promise<unknown[]> & { limit: typeof limit }
    p.limit = limit
    return p
  })
  const where = vi.fn().mockReturnValue({ limit, orderBy })
  const from = vi.fn().mockReturnValue({ where, limit, orderBy })
  const select = vi.fn().mockReturnValue({ from })
  const insertReturning = vi.fn().mockResolvedValue(options.insertRow !== undefined ? [options.insertRow] : [])
  const values = vi.fn().mockReturnValue({ returning: insertReturning })
  const insert = vi.fn().mockReturnValue({ values })
  const updateReturning = vi.fn().mockResolvedValue(options.updateRow !== undefined ? [options.updateRow] : [])
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning })
  const set = vi.fn().mockReturnValue({ where: updateWhere })
  const update = vi.fn().mockReturnValue({ set })
  return { db: { select, insert, update } as unknown as Parameters<typeof createRole>[0], mocks: { select, from, where, limit, insert, values, insertReturning, update, set, updateWhere, updateReturning } }
}

describe('createRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts a role with status=draft and writes a ROLE_CREATED event', async () => {
    const role = makeRole()
    const { db, mocks } = makeMockDb({ insertRow: role, selectRows: [] })
    const result = await createRole(db, { organization_id: ORG_ID, title: 'Senior Engineer', department: 'Engineering', actorId: ACTOR_ID, actorType: 'human' })
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ organization_id: ORG_ID, title: 'Senior Engineer', status: 'draft' }))
    expect(writeEventRecord).toHaveBeenCalledWith(db, expect.objectContaining({ type: 'role.created', organizationId: ORG_ID, actorId: ACTOR_ID, actorType: 'human', entityType: 'role', entityId: role.id }))
    expect(result.id).toBe(role.id)
    expect(result.status).toBe('draft')
  })

  it('throws when insert returns no row', async () => {
    const { db } = makeMockDb({ insertRow: undefined })
    await expect(createRole(db, { organization_id: ORG_ID, title: 'Ghost Role', actorId: ACTOR_ID, actorType: 'human' })).rejects.toThrow('Failed to create role')
  })

  it('materializes pipeline stages when pipeline_template_id is provided', async () => {
    const role = makeRole({ pipeline_template_id: 'tpl-uuid-9999' })
    const template = { id: 'tpl-uuid-9999', stages: [{ key: 'screen', label: 'Screening', type: 'screen', sla_hours: 48, position: 0 }, { key: 'interview', label: 'Interview', type: 'interview', sla_hours: 72, position: 1 }] }
    const { db, mocks } = makeMockDb({ insertRow: role, selectRows: [[template]] })
    await createRole(db, { organization_id: ORG_ID, title: 'Senior Engineer', pipeline_template_id: 'tpl-uuid-9999', actorId: ACTOR_ID, actorType: 'human' })
    expect(mocks.insert).toHaveBeenCalledTimes(2)
  })
})

describe('publishRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets status=open, populates published_at, and writes ROLE_PUBLISHED event', async () => {
    const draftRole = makeRole()
    const publishedRole = makeRole({ status: 'open', published_at: new Date() })
    const { db, mocks } = makeMockDb({ selectRows: [[draftRole], []], updateRow: publishedRole })
    const result = await publishRole(db, draftRole.id, ORG_ID, ACTOR_ID, 'human')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'open', published_at: expect.any(Date) }))
    expect(writeEventRecord).toHaveBeenCalledWith(db, expect.objectContaining({ type: 'role.published', organizationId: ORG_ID, entityId: draftRole.id, actorId: ACTOR_ID }))
    expect(result.status).toBe('open')
  })

  it('throws when role is already open', async () => {
    const openRole = makeRole({ status: 'open' })
    const { db } = makeMockDb({ selectRows: [[openRole], []] })
    await expect(publishRole(db, openRole.id, ORG_ID, ACTOR_ID, 'human')).rejects.toThrow('Role is already published')
  })

  it('throws when role is not found', async () => {
    const { db } = makeMockDb({ selectRows: [[]] })
    await expect(publishRole(db, 'nonexistent-role', ORG_ID, ACTOR_ID, 'human')).rejects.toThrow('Role not found')
  })
})

describe('closeRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('closes with status=closed_filled when reason is "filled"', async () => {
    const openRole = makeRole({ status: 'open' })
    const closedRole = makeRole({ status: 'closed_filled', closed_at: new Date() })
    const { db, mocks } = makeMockDb({ selectRows: [[openRole], []], updateRow: closedRole })
    const result = await closeRole(db, openRole.id, ORG_ID, 'filled', ACTOR_ID, 'human')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed_filled' }))
    expect(result.status).toBe('closed_filled')
  })

  it('closes with status=closed_cancelled when reason is "cancelled"', async () => {
    const openRole = makeRole({ status: 'open' })
    const closedRole = makeRole({ status: 'closed_cancelled', closed_at: new Date() })
    const { db, mocks } = makeMockDb({ selectRows: [[openRole], []], updateRow: closedRole })
    const result = await closeRole(db, openRole.id, ORG_ID, 'cancelled', ACTOR_ID, 'human')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed_cancelled' }))
    expect(result.status).toBe('closed_cancelled')
  })

  it('writes ROLE_CLOSED event with the reason in the payload', async () => {
    const openRole = makeRole({ status: 'open' })
    const closedRole = makeRole({ status: 'closed_filled' })
    const { db } = makeMockDb({ selectRows: [[openRole], []], updateRow: closedRole })
    await closeRole(db, openRole.id, ORG_ID, 'filled', ACTOR_ID, 'human')
    expect(writeEventRecord).toHaveBeenCalledWith(db, expect.objectContaining({ type: 'role.closed', payload: expect.objectContaining({ reason: 'filled' }) }))
  })

  it('throws when role is not found', async () => {
    const { db } = makeMockDb({ selectRows: [[]] })
    await expect(closeRole(db, 'nonexistent', ORG_ID, 'filled', ACTOR_ID, 'human')).rejects.toThrow('Role not found')
  })
})
