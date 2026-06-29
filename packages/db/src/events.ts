import type { Db } from './client'
import { events } from './schema/events'
import type { NewEvent } from './schema/events'

export type ActorType = 'human' | 'agent' | 'system'

export interface WriteEventInput {
  type: string
  organizationId: string
  actorId: string
  actorType: ActorType
  entityType: string
  entityId: string
  payload?: Record<string, unknown>
  occurredAt?: Date
}

export async function writeEvent(
  db: Db | Parameters<Parameters<Db['transaction']>[0]>[0],
  input: WriteEventInput
): Promise<typeof events.$inferSelect> {
  const row: NewEvent = {
    organization_id: input.organizationId,
    type: input.type,
    actor_id: input.actorId,
    actor_type: input.actorType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    payload: input.payload ?? {},
    occurred_at: input.occurredAt ?? new Date(),
  }

  const [inserted] = await (db as Db)
    .insert(events)
    .values(row)
    .returning()

  return inserted
}

export async function writeApplicationStageChanged(
  db: Db,
  params: {
    organizationId: string
    applicationId: string
    actorId: string
    actorType: ActorType
    fromStageId: string | null
    fromStageLabel: string | null
    toStageId: string
    toStageLabel: string
    reason?: string
  }
) {
  return writeEvent(db, {
    type: 'application.stage_changed',
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorType: params.actorType,
    entityType: 'application',
    entityId: params.applicationId,
    payload: {
      from_stage_id: params.fromStageId,
      from_stage_label: params.fromStageLabel,
      to_stage_id: params.toStageId,
      to_stage_label: params.toStageLabel,
      reason: params.reason,
    },
  })
}

export async function writeCandidateCreated(
  db: Db,
  params: {
    organizationId: string
    candidateId: string
    actorId: string
    actorType: ActorType
    fullName: string
    source: string
  }
) {
  return writeEvent(db, {
    type: 'candidate.created',
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorType: params.actorType,
    entityType: 'candidate',
    entityId: params.candidateId,
    payload: {
      full_name: params.fullName,
      source: params.source,
    },
  })
}

export async function writeRolePublished(
  db: Db,
  params: {
    organizationId: string
    roleId: string
    actorId: string
    actorType: ActorType
    title: string
    department?: string
  }
) {
  return writeEvent(db, {
    type: 'role.published',
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorType: params.actorType,
    entityType: 'role',
    entityId: params.roleId,
    payload: {
      title: params.title,
      department: params.department,
    },
  })
}

export async function writeAgentScreeningCompleted(
  db: Db,
  params: {
    organizationId: string
    applicationId: string
    agentId: string
    score: number
    explanationPreview: string
  }
) {
  return writeEvent(db, {
    type: 'agent.screening_completed',
    organizationId: params.organizationId,
    actorId: params.agentId,
    actorType: 'agent',
    entityType: 'application',
    entityId: params.applicationId,
    payload: {
      score: params.score,
      explanation_preview: params.explanationPreview,
    },
  })
}
