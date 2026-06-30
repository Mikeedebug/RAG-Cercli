import { eq, and, SQL } from 'drizzle-orm'
import { roles, pipelineStages, pipelineTemplates } from '@ats/db'
import type { Db, Role, NewRole, PipelineStage } from '@ats/db'
import { writeEventRecord } from './events.service.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateRoleInput {
  organization_id: string
  title: string
  department?: string
  location?: string
  employment_type?: NewRole['employment_type']
  compensation_band?: NewRole['compensation_band']
  jd_markdown?: string
  jd_structured?: NewRole['jd_structured']
  pipeline_template_id?: string
  hiring_manager_id?: string
  recruiter_id?: string
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

export interface UpdateRoleInput {
  title?: string
  department?: string
  location?: string
  employment_type?: NewRole['employment_type']
  compensation_band?: NewRole['compensation_band']
  jd_markdown?: string
  jd_structured?: NewRole['jd_structured']
  hiring_manager_id?: string
  recruiter_id?: string
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

export interface ListRolesFilters {
  organization_id: string
  status?: Role['status']
  department?: string
  recruiter_id?: string
}

export interface RoleWithStages extends Role {
  pipeline_stages: PipelineStage[]
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createRole(
  db: Db,
  input: CreateRoleInput
): Promise<Role> {
  const [role] = await db
    .insert(roles)
    .values({
      organization_id: input.organization_id,
      title: input.title,
      department: input.department,
      location: input.location,
      employment_type: input.employment_type,
      compensation_band: input.compensation_band,
      jd_markdown: input.jd_markdown,
      jd_structured: input.jd_structured,
      pipeline_template_id: input.pipeline_template_id,
      hiring_manager_id: input.hiring_manager_id,
      recruiter_id: input.recruiter_id,
      status: 'draft',
    })
    .returning()

  if (!role) {
    throw new Error('Failed to create role')
  }

  // If a pipeline template was provided, materialize its stages onto this role
  if (input.pipeline_template_id) {
    const [template] = await db
      .select()
      .from(pipelineTemplates)
      .where(eq(pipelineTemplates.id, input.pipeline_template_id))
      .limit(1)

    if (template && Array.isArray(template.stages)) {
      const stageRows = template.stages.map((s, position) => ({
        organization_id: input.organization_id,
        role_id: role.id,
        key: s.key,
        label: s.label,
        type: s.type,
        sla_hours: s.sla_hours,
        position,
        required_scorecard_id: s.required_scorecard_id,
      }))
      if (stageRows.length > 0) {
        await db.insert(pipelineStages).values(stageRows)
      }
    }
  }

  await writeEventRecord(db, {
    type: 'role.created',
    organizationId: input.organization_id,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'role',
    entityId: role.id,
    payload: {
      title: role.title,
      department: role.department,
      status: role.status,
    },
  })

  return role
}

export async function getRole(
  db: Db,
  roleId: string,
  organizationId: string
): Promise<RoleWithStages | null> {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organization_id, organizationId)))
    .limit(1)

  if (!role) return null

  const stages = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.role_id, roleId))
    .orderBy(pipelineStages.position)

  return { ...role, pipeline_stages: stages }
}

export async function listRoles(
  db: Db,
  filters: ListRolesFilters
): Promise<Role[]> {
  const conditions: SQL[] = [eq(roles.organization_id, filters.organization_id)]

  if (filters.status) {
    conditions.push(eq(roles.status, filters.status))
  }
  if (filters.department) {
    conditions.push(eq(roles.department, filters.department))
  }
  if (filters.recruiter_id) {
    conditions.push(eq(roles.recruiter_id, filters.recruiter_id))
  }

  return db
    .select()
    .from(roles)
    .where(and(...conditions))
    .orderBy(roles.created_at)
}

export async function updateRole(
  db: Db,
  roleId: string,
  organizationId: string,
  input: UpdateRoleInput
): Promise<Role> {
  const existing = await getRole(db, roleId, organizationId)
  if (!existing) {
    throw new Error(`Role not found: ${roleId}`)
  }

  const updates: Partial<NewRole> = {}
  if (input.title !== undefined) updates.title = input.title
  if (input.department !== undefined) updates.department = input.department
  if (input.location !== undefined) updates.location = input.location
  if (input.employment_type !== undefined)
    updates.employment_type = input.employment_type
  if (input.compensation_band !== undefined)
    updates.compensation_band = input.compensation_band
  if (input.jd_markdown !== undefined) updates.jd_markdown = input.jd_markdown
  if (input.jd_structured !== undefined)
    updates.jd_structured = input.jd_structured
  if (input.hiring_manager_id !== undefined)
    updates.hiring_manager_id = input.hiring_manager_id
  if (input.recruiter_id !== undefined) updates.recruiter_id = input.recruiter_id

  updates.updated_at = new Date()

  const [updated] = await db
    .update(roles)
    .set(updates)
    .where(and(eq(roles.id, roleId), eq(roles.organization_id, organizationId)))
    .returning()

  if (!updated) {
    throw new Error('Failed to update role')
  }

  await writeEventRecord(db, {
    type: 'role.updated',
    organizationId,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'role',
    entityId: roleId,
    payload: {
      changed_fields: Object.keys(updates).filter((k) => k !== 'updated_at'),
    },
  })

  return updated
}

export async function publishRole(
  db: Db,
  roleId: string,
  organizationId: string,
  actorId: string,
  actorType: 'human' | 'agent' | 'system'
): Promise<Role> {
  const existing = await getRole(db, roleId, organizationId)
  if (!existing) {
    throw new Error(`Role not found: ${roleId}`)
  }

  if (existing.status === 'open') {
    throw new Error('Role is already published')
  }

  const now = new Date()
  const [updated] = await db
    .update(roles)
    .set({ status: 'open', published_at: now, updated_at: now })
    .where(and(eq(roles.id, roleId), eq(roles.organization_id, organizationId)))
    .returning()

  if (!updated) {
    throw new Error('Failed to publish role')
  }

  await writeEventRecord(db, {
    type: 'role.published',
    organizationId,
    actorId,
    actorType,
    entityType: 'role',
    entityId: roleId,
    payload: {
      title: updated.title,
      department: updated.department ?? undefined,
    },
  })

  return updated
}

export async function closeRole(
  db: Db,
  roleId: string,
  organizationId: string,
  reason: 'filled' | 'cancelled',
  actorId: string,
  actorType: 'human' | 'agent' | 'system'
): Promise<Role> {
  const existing = await getRole(db, roleId, organizationId)
  if (!existing) {
    throw new Error(`Role not found: ${roleId}`)
  }

  const newStatus =
    reason === 'filled' ? 'closed_filled' : 'closed_cancelled'
  const now = new Date()

  const [updated] = await db
    .update(roles)
    .set({ status: newStatus, closed_at: now, updated_at: now })
    .where(and(eq(roles.id, roleId), eq(roles.organization_id, organizationId)))
    .returning()

  if (!updated) {
    throw new Error('Failed to close role')
  }

  await writeEventRecord(db, {
    type: 'role.closed',
    organizationId,
    actorId,
    actorType,
    entityType: 'role',
    entityId: roleId,
    payload: {
      title: updated.title,
      reason,
      status: newStatus,
    },
  })

  return updated
}

export async function pauseRole(
  db: Db,
  roleId: string,
  organizationId: string,
  actorId: string,
  actorType: 'human' | 'agent' | 'system'
): Promise<Role> {
  const existing = await getRole(db, roleId, organizationId)
  if (!existing) {
    throw new Error(`Role not found: ${roleId}`)
  }

  if (existing.status !== 'open') {
    throw new Error('Only open roles can be paused')
  }

  const [updated] = await db
    .update(roles)
    .set({ status: 'paused', updated_at: new Date() })
    .where(and(eq(roles.id, roleId), eq(roles.organization_id, organizationId)))
    .returning()

  if (!updated) {
    throw new Error('Failed to pause role')
  }

  await writeEventRecord(db, {
    type: 'role.paused',
    organizationId,
    actorId,
    actorType,
    entityType: 'role',
    entityId: roleId,
    payload: {
      title: updated.title,
    },
  })

  return updated
}
