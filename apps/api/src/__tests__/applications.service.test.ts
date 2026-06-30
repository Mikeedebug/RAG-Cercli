import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@ats/db', () => {
  const applications = { id: 'applications-table', organization_id: 'organization_id', candidate_id: 'candidate_id', role_id: 'role_id', status: 'status', stage_id: 'stage_id' }
  const stageTransitions = { application_id: 'application_id', occurred_at: 'occurred_at' }
  const pipelineStages = { id: 'pipeline-stages-table', role_id: 'role_id', position: 'position', type: 'type' }
  const candidates = { id: 'candidates-table', organization_id: 'organization_id' }
  const roles = { id: 'roles-table', organization_id: 'organization_id', title: 'title' }
  return {
    applications, stageTransitions, pipelineStages, candidates, roles,
    eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
    and: vi.fn((...args) => ({ args, op: 'and' })),
    asc: vi.fn((col) => ({ col, op: 'asc' })),
  }
})

vi.mock('../services/events.service.js', () => ({ writeEventRecord: vi.fn().mockResolvedValue({ id: 'evt-id' }) }))

import { advanceApplication, rejectApplication } from '../services/applications.service.js'
import { writeEventRecord } from '../services/events.service.js'

const ORG_ID = 'org-uuid-0001'
const ACTOR_ID = 'user-uuid-0002'
const APP_ID = 'app-uuid-3333'
const ROLE_ID = 'role-uuid-4444'
const STAGE_A_ID = 'stage-uuid-aaaa'
const STAGE_B_ID = 'stage-uuid-bbbb'

function makeApplication(overrides: Record<string, unknown> = {}) {
  return { id: APP_ID, organization_id: ORG_ID, candidate_id: 'cand-uuid-1111', role_id: ROLE_ID, stage_id: STAGE_A_ID, entered_stage_at: new Date('2024-01-01'), status: 'active', assigned_recruiter_id: null, screening_score: null, screening_explanation: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'), ...overrides }
}

function makeStage(overrides: Record<string, unknown> = {}) {
  return { id: STAGE_A_ID, role_id: ROLE_ID, key: 'screen', label: 'Screening', type: 'screen', position: 0, sla_hours: 48, required_scorecard_id: null, created_at: new Date('2024-01-01'), ...overrides }
}

function makeMockDb(options: { selectRows?: unknown[][], allStages?: unknown[], updateRow?: unknown, insertOk?: boolean } = {}) {
  let selectCallIdx = 0
  function nextSelectRows() { const rows = options.selectRows?.[selectCallIdx] ?? []; selectCallIdx++; return rows }
  const limit = vi.fn().mockImplementation(() => Promise.resolve(nextSelectRows()))
  const orderBy: ReturnType<typeof vi.fn> = vi.fn().mockImplementation(() => {
    let rows: unknown[]
    if (options.allStages !== undefined) { rows = options.allStages; options.allStages = undefined } else { rows = nextSelectRows() }
    const p = Promise.resolve(rows) as Promise<unknown[]> & { limit: typeof limit }
    p.limit = limit; return p
  })
  const where = vi.fn().mockReturnValue({ limit, orderBy })
  const from = vi.fn().mockReturnValue({ where })
  const select = vi.fn().mockReturnValue({ from })
  const insertReturning = vi.fn().mockResolvedValue([{ id: 'transition-id' }])
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning })
  const insert = vi.fn().mockReturnValue({ values: insertValues })
  const updateReturning = vi.fn().mockResolvedValue(options.updateRow !== undefined ? [options.updateRow] : [])
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning })
  const set = vi.fn().mockReturnValue({ where: updateWhere })
  const update = vi.fn().mockReturnValue({ set })
  const db = { select, insert, update } as unknown as Parameters<typeof advanceApplication>[0]
  return { db, mocks: { select, from, where, limit, orderBy, insert, insertValues, insertReturning, update, set, updateWhere, updateReturning } }
}

describe('advanceApplication', () => {
  beforeEach(() => vi.clearAllMocks())

  it('advances to the next stage, creates a stage_transition row, and writes APPLICATION_STAGE_ADVANCED event', async () => {
    const application = makeApplication({ stage_id: STAGE_A_ID, stage_transitions: [] })
    const stageA = makeStage({ id: STAGE_A_ID, position: 0, label: 'Screening' })
    const stageB = makeStage({ id: STAGE_B_ID, position: 1, label: 'Interview', key: 'interview' })
    const advancedApp = makeApplication({ stage_id: STAGE_B_ID })
    const { db, mocks } = makeMockDb({ selectRows: [[application], [], [stageA], [stageA]], allStages: [stageA, stageB], updateRow: advancedApp })
    const result = await advanceApplication(db, APP_ID, ORG_ID, ACTOR_ID, 'human')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ stage_id: STAGE_B_ID }))
    expect(mocks.insert).toHaveBeenCalledWith(expect.anything())
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({ application_id: APP_ID, from_stage_id: STAGE_A_ID, to_stage_id: STAGE_B_ID }))
    expect(writeEventRecord).toHaveBeenCalledWith(db, expect.objectContaining({ type: 'application.stage_changed', organizationId: ORG_ID, entityId: APP_ID, payload: expect.objectContaining({ from_stage_id: STAGE_A_ID, to_stage_id: STAGE_B_ID }) }))
    expect(result.stage_id).toBe(STAGE_B_ID)
  })

  it('throws when there are no further stages in the pipeline', async () => {
    const application = makeApplication({ stage_id: STAGE_B_ID, stage_transitions: [] })
    const stageB = makeStage({ id: STAGE_B_ID, position: 1 })
    const { db } = makeMockDb({ selectRows: [[application], [], [stageB], [stageB]], allStages: [stageB] })
    await expect(advanceApplication(db, APP_ID, ORG_ID, ACTOR_ID, 'human')).rejects.toThrow('No further stages in the pipeline')
  })

  it('throws when application is not active', async () => {
    const rejectedApp = makeApplication({ status: 'rejected', stage_transitions: [] })
    const { db } = makeMockDb({ selectRows: [[rejectedApp], []] })
    await expect(advanceApplication(db, APP_ID, ORG_ID, ACTOR_ID, 'human')).rejects.toThrow("Cannot advance an application with status 'rejected'")
  })

  it('throws when application is not found', async () => {
    const { db } = makeMockDb({ selectRows: [[]] })
    await expect(advanceApplication(db, 'nonexistent', ORG_ID, ACTOR_ID, 'human')).rejects.toThrow('Application not found')
  })
})

describe('rejectApplication', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes APPLICATION_REJECTED event with rejection_reason in payload', async () => {
    const application = makeApplication({ status: 'active', stage_transitions: [] })
    const rejectedApp = makeApplication({ status: 'rejected' })
    const stageA = makeStage({ id: STAGE_A_ID, position: 0, label: 'Screening' })
    const { db } = makeMockDb({ selectRows: [[application], [], [stageA], []], updateRow: rejectedApp })
    await rejectApplication(db, APP_ID, ORG_ID, 'Not enough experience', ACTOR_ID, 'human')
    expect(writeEventRecord).toHaveBeenCalledWith(db, expect.objectContaining({ type: 'application.rejected', organizationId: ORG_ID, entityId: APP_ID, payload: expect.objectContaining({ rejection_reason: 'Not enough experience' }) }))
  })

  it('sets status=rejected on the application', async () => {
    const application = makeApplication({ status: 'active', stage_transitions: [] })
    const rejectedApp = makeApplication({ status: 'rejected' })
    const stageA = makeStage({ id: STAGE_A_ID, position: 0 })
    const { db, mocks } = makeMockDb({ selectRows: [[application], [], [stageA], []], updateRow: rejectedApp })
    const result = await rejectApplication(db, APP_ID, ORG_ID, 'Overqualified', ACTOR_ID, 'human')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }))
    expect(result.status).toBe('rejected')
  })

  it('throws when application is already rejected', async () => {
    const alreadyRejected = makeApplication({ status: 'rejected', stage_transitions: [] })
    const { db } = makeMockDb({ selectRows: [[alreadyRejected], []] })
    await expect(rejectApplication(db, APP_ID, ORG_ID, 'Duplicate rejection', ACTOR_ID, 'human')).rejects.toThrow('Application is already rejected')
  })

  it('throws when application is not found', async () => {
    const { db } = makeMockDb({ selectRows: [[]] })
    await expect(rejectApplication(db, 'nonexistent', ORG_ID, 'Some reason', ACTOR_ID, 'human')).rejects.toThrow('Application not found')
  })

  it('uses the reject-type pipeline stage as the target stage when one exists', async () => {
    const application = makeApplication({ status: 'active', stage_transitions: [] })
    const stageA = makeStage({ id: STAGE_A_ID, position: 0, label: 'Screening' })
    const rejectStage = makeStage({ id: 'reject-stage-id', position: 99, type: 'reject', label: 'Rejected' })
    const rejectedApp = makeApplication({ status: 'rejected', stage_id: 'reject-stage-id' })
    const { db, mocks } = makeMockDb({ selectRows: [[application], [], [stageA], [rejectStage]], updateRow: rejectedApp })
    await rejectApplication(db, APP_ID, ORG_ID, 'Not a fit', ACTOR_ID, 'human')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ stage_id: 'reject-stage-id' }))
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({ to_stage_id: 'reject-stage-id', reason: 'Not a fit' }))
  })
})
