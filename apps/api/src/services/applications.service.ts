import { eq, and, asc } from 'drizzle-orm'
import { applications, stageTransitions, pipelineStages, candidates, roles } from '@ats/db'
import type { Db, Application, NewApplication, StageTransition, PipelineStage } from '@ats/db'
import { writeEventRecord } from './events.service.js'

export interface CreateApplicationInput {
  organization_id: string
  candidate_id: string
  role_id: string
  stage_id?: string
  assigned_recruiter_id?: string
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

export interface ApplicationWithHistory extends Application {
  stage_transitions: StageTransition[]
}

export interface UpdateApplicationInput {
  assigned_recruiter_id?: string
  screening_score?: number
  screening_explanation?: string
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

async function getStage(db: Db, stageId: string): Promise<PipelineStage | null> {
  const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, stageId)).limit(1)
  return stage ?? null
}

async function getFirstStageForRole(db: Db, roleId: string): Promise<PipelineStage | null> {
  const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.role_id, roleId)).orderBy(asc(pipelineStages.position)).limit(1)
  return stage ?? null
}

async function getNextStageForRole(db: Db, roleId: string, currentPosition: number): Promise<PipelineStage | null> {
  const allStages = await db.select().from(pipelineStages).where(eq(pipelineStages.role_id, roleId)).orderBy(asc(pipelineStages.position))
  return allStages.find((s) => s.position > currentPosition) ?? null
}

export async function createApplication(db: Db, input: CreateApplicationInput): Promise<Application> {
  const [candidate] = await db.select({ id: candidates.id }).from(candidates)
    .where(and(eq(candidates.id, input.candidate_id), eq(candidates.organization_id, input.organization_id))).limit(1)
  if (!candidate) throw new Error(`Candidate not found: ${input.candidate_id}`)

  const [role] = await db.select({ id: roles.id, title: roles.title }).from(roles)
    .where(and(eq(roles.id, input.role_id), eq(roles.organization_id, input.organization_id))).limit(1)
  if (!role) throw new Error(`Role not found: ${input.role_id}`)

  let initialStageId = input.stage_id ?? null
  let initialStage: PipelineStage | null = null

  if (initialStageId) {
    initialStage = await getStage(db, initialStageId)
    if (!initialStage) throw new Error(`Stage not found: ${initialStageId}`)
  } else {
    initialStage = await getFirstStageForRole(db, input.role_id)
    initialStageId = initialStage?.id ?? null
  }

  const now = new Date()
  const [application] = await db.insert(applications).values({
    organization_id: input.organization_id,
    candidate_id: input.candidate_id,
    role_id: input.role_id,
    stage_id: initialStageId,
    entered_stage_at: initialStageId ? now : null,
    status: 'active',
    assigned_recruiter_id: input.assigned_recruiter_id,
  }).returning()

  if (!application) throw new Error('Failed to create application')

  if (initialStageId && initialStage) {
    await db.insert(stageTransitions).values({
      application_id: application.id,
      from_stage_id: null,
      to_stage_id: initialStageId,
      actor_id: input.actorId,
      actor_type: input.actorType as 'human' | 'agent',
      reason: 'Application created',
      occurred_at: now,
    })
  }

  await writeEventRecord(db, {
    type: 'application.created',
    organizationId: input.organization_id,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'application',
    entityId: application.id,
    payload: { candidate_id: input.candidate_id, role_id: input.role_id, initial_stage_id: initialStageId, initial_stage_label: initialStage?.label ?? null },
  })

  return application
}

export async function getApplication(db: Db, applicationId: string, organizationId: string): Promise<ApplicationWithHistory | null> {
  const [application] = await db.select().from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.organization_id, organizationId))).limit(1)
  if (!application) return null
  const transitions = await db.select().from(stageTransitions).where(eq(stageTransitions.application_id, applicationId)).orderBy(asc(stageTransitions.occurred_at))
  return { ...application, stage_transitions: transitions }
}

export async function advanceApplication(db: Db, applicationId: string, organizationId: string, actorId: string, actorType: 'human' | 'agent' | 'system'): Promise<Application> {
  const application = await getApplication(db, applicationId, organizationId)
  if (!application) throw new Error(`Application not found: ${applicationId}`)
  if (application.status !== 'active') throw new Error(`Cannot advance an application with status '${application.status}'`)

  let currentPosition = -1
  if (application.stage_id) {
    const currentStage = await getStage(db, application.stage_id)
    currentPosition = currentStage?.position ?? -1
  }

  const nextStage = await getNextStageForRole(db, application.role_id, currentPosition)
  if (!nextStage) throw new Error('No further stages in the pipeline')

  const now = new Date()
  const previousStageId = application.stage_id
  const previousStage = previousStageId ? await getStage(db, previousStageId) : null

  const [updated] = await db.update(applications)
    .set({ stage_id: nextStage.id, entered_stage_at: now, updated_at: now })
    .where(and(eq(applications.id, applicationId), eq(applications.organization_id, organizationId)))
    .returning()

  if (!updated) throw new Error('Failed to advance application')

  await db.insert(stageTransitions).values({
    application_id: applicationId,
    from_stage_id: previousStageId ?? null,
    to_stage_id: nextStage.id,
    actor_id: actorId,
    actor_type: actorType as 'human' | 'agent',
    occurred_at: now,
  })

  await writeEventRecord(db, {
    type: 'application.stage_changed',
    organizationId,
    actorId,
    actorType,
    entityType: 'application',
    entityId: applicationId,
    payload: { from_stage_id: previousStageId ?? null, from_stage_label: previousStage?.label ?? null, to_stage_id: nextStage.id, to_stage_label: nextStage.label },
  })

  return updated
}

export async function rejectApplication(db: Db, applicationId: string, organizationId: string, rejectionReason: string, actorId: string, actorType: 'human' | 'agent' | 'system'): Promise<Application> {
  const application = await getApplication(db, applicationId, organizationId)
  if (!application) throw new Error(`Application not found: ${applicationId}`)
  if (application.status === 'rejected') throw new Error('Application is already rejected')

  const now = new Date()
  const previousStageId = application.stage_id
  const previousStage = previousStageId ? await getStage(db, previousStageId) : null

  const [rejectStage] = await db.select().from(pipelineStages)
    .where(and(eq(pipelineStages.role_id, application.role_id), eq(pipelineStages.type, 'reject'))).limit(1)

  const [updated] = await db.update(applications)
    .set({ status: 'rejected', stage_id: rejectStage?.id ?? application.stage_id, updated_at: now })
    .where(and(eq(applications.id, applicationId), eq(applications.organization_id, organizationId)))
    .returning()

  if (!updated) throw new Error('Failed to reject application')

  if (rejectStage) {
    await db.insert(stageTransitions).values({
      application_id: applicationId,
      from_stage_id: previousStageId ?? null,
      to_stage_id: rejectStage.id,
      actor_id: actorId,
      actor_type: actorType as 'human' | 'agent',
      reason: rejectionReason,
      occurred_at: now,
    })
  }

  await writeEventRecord(db, {
    type: 'application.rejected',
    organizationId,
    actorId,
    actorType,
    entityType: 'application',
    entityId: applicationId,
    payload: { from_stage_id: previousStageId ?? null, from_stage_label: previousStage?.label ?? null, to_stage_id: rejectStage?.id ?? null, to_stage_label: rejectStage?.label ?? null, rejection_reason: rejectionReason },
  })

  return updated
}

export async function withdrawApplication(db: Db, applicationId: string, organizationId: string, actorId: string, actorType: 'human' | 'agent' | 'system'): Promise<Application> {
  const application = await getApplication(db, applicationId, organizationId)
  if (!application) throw new Error(`Application not found: ${applicationId}`)
  if (application.status === 'withdrawn') throw new Error('Application is already withdrawn')

  const [updated] = await db.update(applications)
    .set({ status: 'withdrawn', updated_at: new Date() })
    .where(and(eq(applications.id, applicationId), eq(applications.organization_id, organizationId)))
    .returning()

  if (!updated) throw new Error('Failed to withdraw application')

  await writeEventRecord(db, { type: 'application.withdrawn', organizationId, actorId, actorType, entityType: 'application', entityId: applicationId, payload: {} })

  return updated
}

export async function updateApplication(db: Db, applicationId: string, organizationId: string, input: UpdateApplicationInput): Promise<Application> {
  const existing = await getApplication(db, applicationId, organizationId)
  if (!existing) throw new Error(`Application not found: ${applicationId}`)

  const updates: Partial<NewApplication> = {}
  if (input.assigned_recruiter_id !== undefined) updates.assigned_recruiter_id = input.assigned_recruiter_id
  if (input.screening_score !== undefined) updates.screening_score = input.screening_score
  if (input.screening_explanation !== undefined) updates.screening_explanation = input.screening_explanation
  updates.updated_at = new Date()

  const [updated] = await db.update(applications)
    .set(updates)
    .where(and(eq(applications.id, applicationId), eq(applications.organization_id, organizationId)))
    .returning()

  if (!updated) throw new Error('Failed to update application')

  await writeEventRecord(db, {
    type: 'application.updated',
    organizationId,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'application',
    entityId: applicationId,
    payload: { changed_fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
  })

  return updated
}
