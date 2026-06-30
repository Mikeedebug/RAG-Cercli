import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@ats/db', () => {
  const candidates = { id: 'candidates-table', emails: 'emails', organization_id: 'organization_id', linkedin_url: 'linkedin_url' }
  const applications = { candidate_id: 'candidate_id', organization_id: 'organization_id' }
  const events = { entity_type: 'entity_type', entity_id: 'entity_id', organization_id: 'organization_id' }
  return {
    candidates, applications, events,
    eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
    and: vi.fn((...args) => ({ args, op: 'and' })),
    or: vi.fn((...args) => ({ args, op: 'or' })),
    sql: Object.assign(
      vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values, op: 'sql' })),
      { join: vi.fn((parts: unknown[], sep: unknown) => ({ parts, sep })) }
    ),
  }
})

vi.mock('../services/events.service.js', () => ({ writeEventRecord: vi.fn().mockResolvedValue({ id: 'evt-id' }) }))

import { createCandidate, mergeCandidates } from '../services/candidates.service.js'
import { writeEventRecord } from '../services/events.service.js'

const ORG_ID = 'org-uuid-0001'
const ACTOR_ID = 'user-uuid-0002'

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return { id: 'cand-uuid-1111', organization_id: ORG_ID, full_name: 'Alice Smith', emails: ['alice@example.com'], phones: [], linkedin_url: null, github_url: null, current_company: null, current_title: null, location: null, source: 'manual', do_not_contact: false, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'), ...overrides }
}

function makeMockDb(options: { selectRows?: unknown[][], insertRow?: unknown, updateRow?: unknown, transactionResult?: unknown } = {}) {
  let selectCallIndex = 0
  function nextRows() { const rows = options.selectRows?.[selectCallIndex] ?? []; selectCallIndex++; return rows }
  const limit = vi.fn().mockImplementation(() => Promise.resolve(nextRows()))
  const offset = vi.fn().mockReturnValue(Promise.resolve([]))
  const orderBy: ReturnType<typeof vi.fn> = vi.fn().mockImplementation(() => {
    const rows = nextRows()
    const p = Promise.resolve(rows) as Promise<unknown[]> & { limit: typeof limit; offset: typeof offset }
    p.limit = limit; p.offset = offset; return p
  })
  const where = vi.fn().mockReturnValue({ limit, orderBy })
  const from = vi.fn().mockReturnValue({ where })
  const select = vi.fn().mockReturnValue({ from })
  const insertReturning = vi.fn().mockResolvedValue(options.insertRow !== undefined ? [options.insertRow] : [])
  const values = vi.fn().mockReturnValue({ returning: insertReturning })
  const insert = vi.fn().mockReturnValue({ values })
  const updateReturning = vi.fn().mockResolvedValue(options.updateRow !== undefined ? [options.updateRow] : [])
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning })
  const set = vi.fn().mockReturnValue({ where: updateWhere })
  const update = vi.fn().mockReturnValue({ set })
  const txUpdateWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(options.transactionResult !== undefined ? [options.transactionResult] : []) })
  const txSet = vi.fn().mockReturnValue({ where: txUpdateWhere })
  const txUpdate = vi.fn().mockReturnValue({ set: txSet })
  const tx = { update: txUpdate, insert }
  const transaction = vi.fn().mockImplementation(async (cb: (tx: typeof tx) => Promise<unknown>) => cb(tx))
  const db = { select, insert, update, transaction } as unknown as Parameters<typeof createCandidate>[0]
  return { db, mocks: { select, from, where, limit, insert, values, insertReturning, update, set, updateWhere, updateReturning, transaction, txUpdate, txSet } }
}

describe('createCandidate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts a new candidate and writes CANDIDATE_CREATED event when no duplicate exists', async () => {
    const candidate = makeCandidate()
    const { db, mocks } = makeMockDb({ selectRows: [[], []], insertRow: candidate })
    const result = await createCandidate(db, { organization_id: ORG_ID, full_name: 'Alice Smith', emails: ['alice@example.com'], actorId: ACTOR_ID, actorType: 'human' })
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ organization_id: ORG_ID, full_name: 'Alice Smith', emails: ['alice@example.com'] }))
    expect(writeEventRecord).toHaveBeenCalledWith(db, expect.objectContaining({ type: 'candidate.created', organizationId: ORG_ID, entityId: candidate.id }))
    expect(result.candidate.id).toBe(candidate.id)
    expect(result.duplicate).toBeUndefined()
  })

  it('deduplicates by email — returns existing candidate without inserting', async () => {
    const existing = makeCandidate({ id: 'existing-cand-uuid', emails: ['alice@example.com'] })
    const { db, mocks } = makeMockDb({ selectRows: [[{ id: existing.id }], [existing]] })
    const result = await createCandidate(db, { organization_id: ORG_ID, full_name: 'Alice Smith (duplicate)', emails: ['alice@example.com'], actorId: ACTOR_ID, actorType: 'human' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(result.candidate.id).toBe(existing.id)
    expect(result.duplicate?.isDuplicate).toBe(true)
    expect(result.duplicate?.matchedOn).toBe('email')
    expect(writeEventRecord).not.toHaveBeenCalled()
  })

  it('normalises email addresses to lowercase before insert and dedup check', async () => {
    const candidate = makeCandidate({ emails: ['alice@example.com'] })
    const { db, mocks } = makeMockDb({ selectRows: [[], []], insertRow: candidate })
    await createCandidate(db, { organization_id: ORG_ID, full_name: 'Alice Smith', emails: ['ALICE@EXAMPLE.COM'], actorId: ACTOR_ID, actorType: 'human' })
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ emails: ['alice@example.com'] }))
  })
})

describe('mergeCandidates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reassigns applications from secondary to primary inside a transaction', async () => {
    const primary = makeCandidate({ id: 'primary-id', emails: ['a@test.com'], phones: [] })
    const secondary = makeCandidate({ id: 'secondary-id', emails: ['b@test.com'], phones: [] })
    const mergedPrimary = makeCandidate({ id: 'primary-id', emails: ['a@test.com', 'b@test.com'] })
    const { db, mocks } = makeMockDb({ selectRows: [[primary], [secondary]], transactionResult: mergedPrimary })
    await mergeCandidates(db, { primaryId: 'primary-id', secondaryId: 'secondary-id', organizationId: ORG_ID, actorId: ACTOR_ID, actorType: 'human' })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.txUpdate).toHaveBeenCalledTimes(expect.any(Number))
  })

  it('writes CANDIDATE_MERGED event with both primary_id and secondary_id in payload', async () => {
    const primary = makeCandidate({ id: 'primary-id', emails: ['a@test.com'], phones: [] })
    const secondary = makeCandidate({ id: 'secondary-id', emails: ['b@test.com'], phones: [] })
    const mergedPrimary = makeCandidate({ id: 'primary-id' })
    const { db } = makeMockDb({ selectRows: [[primary], [secondary]], transactionResult: mergedPrimary })
    await mergeCandidates(db, { primaryId: 'primary-id', secondaryId: 'secondary-id', organizationId: ORG_ID, actorId: ACTOR_ID, actorType: 'human' })
    expect(writeEventRecord).toHaveBeenCalledTimes(2)
    const calls = (writeEventRecord as ReturnType<typeof vi.fn>).mock.calls
    const primaryEventCall = calls.find(([, input]) => input.entityId === 'primary-id')
    const secondaryEventCall = calls.find(([, input]) => input.entityId === 'secondary-id')
    expect(primaryEventCall[1]).toMatchObject({ type: 'candidate.merged', payload: expect.objectContaining({ primary_id: 'primary-id', secondary_id: 'secondary-id' }) })
    expect(secondaryEventCall[1]).toMatchObject({ type: 'candidate.merged', payload: expect.objectContaining({ primary_id: 'primary-id', secondary_id: 'secondary-id' }) })
  })

  it('throws when primary candidate is not found', async () => {
    const { db } = makeMockDb({ selectRows: [[]] })
    await expect(mergeCandidates(db, { primaryId: 'nonexistent-primary', secondaryId: 'secondary-id', organizationId: ORG_ID, actorId: ACTOR_ID, actorType: 'human' })).rejects.toThrow('Primary candidate not found')
  })

  it('throws when secondary candidate is not found', async () => {
    const primary = makeCandidate({ id: 'primary-id' })
    const { db } = makeMockDb({ selectRows: [[primary], []] })
    await expect(mergeCandidates(db, { primaryId: 'primary-id', secondaryId: 'nonexistent-secondary', organizationId: ORG_ID, actorId: ACTOR_ID, actorType: 'human' })).rejects.toThrow('Secondary candidate not found')
  })
})
