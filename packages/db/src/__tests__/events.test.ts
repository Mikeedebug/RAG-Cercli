import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeEvent } from '../events'

function makeMockDb(insertedRow?: Record<string, unknown>) {
  const defaultRow = {
    id: 'evt-uuid-1234',
    organization_id: 'org-uuid-5678',
    type: 'role.created',
    actor_id: 'user-uuid-9999',
    actor_type: 'human',
    entity_type: 'role',
    entity_id: 'role-uuid-1111',
    payload: {},
    occurred_at: new Date('2024-01-01T00:00:00Z'),
    created_at: new Date('2024-01-01T00:00:00Z'),
  }

  const row = { ...defaultRow, ...insertedRow }

  const returning = vi.fn().mockResolvedValue([row])
  const values = vi.fn().mockReturnValue({ returning })
  const insert = vi.fn().mockReturnValue({ values })

  return { db: { insert } as unknown as Parameters<typeof writeEvent>[0], insert, values, returning, row }
}

describe('writeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a row with the correct fields mapped from WriteEventInput', async () => {
    const { db, insert, values, row } = makeMockDb()

    const occurredAt = new Date('2024-06-01T12:00:00Z')
    const result = await writeEvent(db, {
      type: 'role.created',
      organizationId: 'org-uuid-5678',
      actorId: 'user-uuid-9999',
      actorType: 'human',
      entityType: 'role',
      entityId: 'role-uuid-1111',
      payload: { title: 'Senior Engineer' },
      occurredAt,
    })

    expect(insert).toHaveBeenCalledTimes(1)

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-uuid-5678',
        type: 'role.created',
        actor_id: 'user-uuid-9999',
        actor_type: 'human',
        entity_type: 'role',
        entity_id: 'role-uuid-1111',
        payload: { title: 'Senior Engineer' },
        occurred_at: occurredAt,
      })
    )

    expect(result).toEqual(row)
  })

  it('defaults payload to empty object when not provided', async () => {
    const { db, values } = makeMockDb()

    await writeEvent(db, {
      type: 'candidate.created',
      organizationId: 'org-uuid-5678',
      actorId: 'user-uuid-9999',
      actorType: 'system',
      entityType: 'candidate',
      entityId: 'cand-uuid-1111',
    })

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ payload: {} })
    )
  })

  it('defaults occurred_at to approximately now when not provided', async () => {
    const { db, values } = makeMockDb()
    const before = new Date()

    await writeEvent(db, {
      type: 'application.created',
      organizationId: 'org-uuid-5678',
      actorId: 'user-uuid-9999',
      actorType: 'human',
      entityType: 'application',
      entityId: 'app-uuid-2222',
    })

    const after = new Date()
    const [call] = values.mock.calls
    const passedOccurredAt: Date = call[0].occurred_at

    expect(passedOccurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(passedOccurredAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('is append-only: only calls insert, never update or delete', async () => {
    const { db, insert } = makeMockDb()

    const update = vi.fn()
    const del = vi.fn()
    Object.assign(db, { update, delete: del })

    await writeEvent(db, {
      type: 'role.published',
      organizationId: 'org-uuid-5678',
      actorId: 'user-uuid-9999',
      actorType: 'human',
      entityType: 'role',
      entityId: 'role-uuid-1111',
    })

    expect(insert).toHaveBeenCalledTimes(1)
    expect(update).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('requires organizationId — maps it to organization_id on the inserted row', async () => {
    const { db, values } = makeMockDb({ organization_id: 'org-required-test' })

    await writeEvent(db, {
      type: 'role.closed',
      organizationId: 'org-required-test',
      actorId: 'user-uuid-9999',
      actorType: 'human',
      entityType: 'role',
      entityId: 'role-uuid-1111',
    })

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-required-test' })
    )
  })

  it('returns the persisted event row from the RETURNING clause', async () => {
    const customRow = {
      id: 'specific-event-id',
      organization_id: 'org-abc',
      type: 'candidate.merged',
      actor_id: 'actor-xyz',
      actor_type: 'human' as const,
      entity_type: 'candidate',
      entity_id: 'cand-111',
      payload: { primary_id: 'cand-111', secondary_id: 'cand-222' },
      occurred_at: new Date(),
      created_at: new Date(),
    }
    const { db } = makeMockDb(customRow)

    const result = await writeEvent(db, {
      type: 'candidate.merged',
      organizationId: 'org-abc',
      actorId: 'actor-xyz',
      actorType: 'human',
      entityType: 'candidate',
      entityId: 'cand-111',
      payload: { primary_id: 'cand-111', secondary_id: 'cand-222' },
    })

    expect(result.id).toBe('specific-event-id')
    expect(result.payload).toEqual({ primary_id: 'cand-111', secondary_id: 'cand-222' })
  })
})
