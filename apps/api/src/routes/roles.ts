import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '@ats/db'
import type { AuthVariables } from '../lib/context.js'
import { createRole, getRole, listRoles, updateRole, publishRole, closeRole, pauseRole } from '../services/roles.service.js'

const compensationBandSchema = z.object({
  currency: z.string().length(3),
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  period: z.enum(['annual', 'monthly', 'hourly']),
  equity_percent_min: z.number().nonnegative().optional(),
  equity_percent_max: z.number().nonnegative().optional(),
  is_public: z.boolean(),
})

const jdStructuredSchema = z.object({
  skills: z.array(z.string()),
  requirements: z.array(z.string()),
  nice_to_haves: z.array(z.string()),
  seniority: z.enum(['intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'executive']),
  headcount: z.number().int().positive(),
})

const createRoleSchema = z.object({
  title: z.string().min(1).max(300),
  department: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'internship', 'temporary', 'volunteer']).optional(),
  compensation_band: compensationBandSchema.optional(),
  jd_markdown: z.string().optional(),
  jd_structured: jdStructuredSchema.optional(),
  pipeline_template_id: z.string().uuid().optional(),
  hiring_manager_id: z.string().uuid().optional(),
  recruiter_id: z.string().uuid().optional(),
})

const updateRoleSchema = createRoleSchema.omit({ pipeline_template_id: true })
const listRolesQuerySchema = z.object({
  status: z.enum(['draft', 'open', 'paused', 'closed_filled', 'closed_cancelled']).optional(),
  department: z.string().optional(),
  recruiter_id: z.string().uuid().optional(),
})
const closeRoleSchema = z.object({ reason: z.enum(['filled', 'cancelled']) })

const rolesRouter = new Hono<{ Variables: AuthVariables }>()

rolesRouter.get('/', zValidator('query', listRolesQuerySchema), async (c) => {
  const query = c.req.valid('query')
  const organizationId = c.get('organizationId')
  const db = getDb()
  const result = await listRoles(db, { organization_id: organizationId, ...query })
  return c.json({ data: result })
})

rolesRouter.post('/', zValidator('json', createRoleSchema), async (c) => {
  const body = c.req.valid('json')
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const db = getDb()
  const role = await createRole(db, { ...body, organization_id: organizationId, actorId, actorType: 'human' })
  return c.json({ data: role }, 201)
})

rolesRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const db = getDb()
  const role = await getRole(db, id, organizationId)
  if (!role) return c.json({ error: 'Role not found' }, 404)
  return c.json({ data: role })
})

rolesRouter.patch('/:id', zValidator('json', updateRoleSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const db = getDb()
  const role = await updateRole(db, id, organizationId, { ...body, actorId, actorType: 'human' })
  return c.json({ data: role })
})

rolesRouter.post('/:id/publish', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const db = getDb()
  const role = await publishRole(db, id, organizationId, actorId, 'human')
  return c.json({ data: role })
})

rolesRouter.post('/:id/close', zValidator('json', closeRoleSchema), async (c) => {
  const { id } = c.req.param()
  const { reason } = c.req.valid('json')
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const db = getDb()
  const role = await closeRole(db, id, organizationId, reason, actorId, 'human')
  return c.json({ data: role })
})

rolesRouter.post('/:id/pause', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const db = getDb()
  const role = await pauseRole(db, id, organizationId, actorId, 'human')
  return c.json({ data: role })
})

export { rolesRouter }
