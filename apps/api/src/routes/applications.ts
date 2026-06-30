import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '@ats/db'
import type { AuthVariables } from '../lib/context.js'
import {
  createApplication,
  getApplication,
  advanceApplication,
  rejectApplication,
  withdrawApplication,
  updateApplication,
} from '../services/applications.service.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createApplicationSchema = z.object({
  candidate_id: z.string().uuid(),
  role_id: z.string().uuid(),
  stage_id: z.string().uuid().optional(),
  assigned_recruiter_id: z.string().uuid().optional(),
})

const rejectApplicationSchema = z.object({
  rejection_reason: z.string().min(1, 'rejection_reason is required'),
})

const updateApplicationSchema = z.object({
  assigned_recruiter_id: z.string().uuid().optional(),
  screening_score: z.number().int().min(0).max(100).optional(),
  screening_explanation: z.string().optional(),
})

// ─── Router ───────────────────────────────────────────────────────────────────

const applicationsRouter = new Hono<{ Variables: AuthVariables }>()

applicationsRouter.post(
  '/',
  zValidator('json', createApplicationSchema),
  async (c) => {
    const body = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    const application = await createApplication(db, {
      ...body,
      organization_id: organizationId,
      actorId,
      actorType: 'human',
    })

    return c.json({ data: application }, 201)
  }
)

applicationsRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const db = getDb()

  const application = await getApplication(db, id, organizationId)

  if (!application) {
    return c.json({ error: 'Application not found' }, 404)
  }

  return c.json({ data: application })
})

applicationsRouter.post('/:id/advance', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const db = getDb()

  const application = await advanceApplication(
    db,
    id,
    organizationId,
    actorId,
    'human'
  )

  return c.json({ data: application })
})

applicationsRouter.post(
  '/:id/reject',
  zValidator('json', rejectApplicationSchema),
  async (c) => {
    const { id } = c.req.param()
    const { rejection_reason } = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    const application = await rejectApplication(
      db,
      id,
      organizationId,
      rejection_reason,
      actorId,
      'human'
    )

    return c.json({ data: application })
  }
)

applicationsRouter.post('/:id/withdraw', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const db = getDb()

  const application = await withdrawApplication(
    db,
    id,
    organizationId,
    actorId,
    'human'
  )

  return c.json({ data: application })
})

applicationsRouter.patch(
  '/:id',
  zValidator('json', updateApplicationSchema),
  async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    const application = await updateApplication(db, id, organizationId, {
      ...body,
      actorId,
      actorType: 'human',
    })

    return c.json({ data: application })
  }
)

export { applicationsRouter }
