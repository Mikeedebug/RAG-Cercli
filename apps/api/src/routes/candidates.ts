import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { getDb, applications, pipelineStages, roles } from '@ats/db'
import type { AuthVariables } from '../lib/context.js'
import {
  createCandidate,
  getCandidate,
  listCandidates,
  updateCandidate,
  mergeCandidates,
} from '../services/candidates.service.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createCandidateSchema = z.object({
  full_name: z.string().min(1).max(300),
  emails: z.array(z.string().email()).default([]),
  phones: z.array(z.string()).default([]),
  linkedin_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  current_company: z.string().max(200).optional(),
  current_title: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  source: z
    .enum(['career_page', 'referral', 'sourcing_agent', 'manual', 'linkedin', 'other'])
    .default('manual'),
})

const updateCandidateSchema = z.object({
  full_name: z.string().min(1).max(300).optional(),
  emails: z.array(z.string().email()).optional(),
  phones: z.array(z.string()).optional(),
  linkedin_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  current_company: z.string().max(200).optional(),
  current_title: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  do_not_contact: z.boolean().optional(),
})

const listCandidatesQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const mergeCandidatesSchema = z.object({
  primary_id: z.string().uuid('primary_id must be a valid UUID'),
  secondary_id: z.string().uuid('secondary_id must be a valid UUID'),
})

// ─── Router ───────────────────────────────────────────────────────────────────

const candidatesRouter = new Hono<{ Variables: AuthVariables }>()

candidatesRouter.get(
  '/',
  zValidator('query', listCandidatesQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const organizationId = c.get('organizationId')
    const db = getDb()

    const result = await listCandidates(db, {
      organization_id: organizationId,
      q: query.q,
      limit: query.limit,
      offset: query.offset,
    })

    return c.json({ data: result, meta: { limit: query.limit, offset: query.offset } })
  }
)

candidatesRouter.post(
  '/',
  zValidator('json', createCandidateSchema),
  async (c) => {
    const body = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    const { candidate, duplicate } = await createCandidate(db, {
      ...body,
      organization_id: organizationId,
      actorId,
      actorType: 'human',
    })

    if (duplicate?.isDuplicate) {
      return c.json(
        {
          data: candidate,
          duplicate: {
            matched_on: duplicate.matchedOn,
            existing_id: duplicate.existingId,
          },
        },
        200
      )
    }

    return c.json({ data: candidate }, 201)
  }
)

candidatesRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const db = getDb()

  const candidate = await getCandidate(db, id, organizationId)

  if (!candidate) {
    return c.json({ error: 'Candidate not found' }, 404)
  }

  const candidateApplications = await db
    .select({
      id: applications.id,
      role_id: applications.role_id,
      stage_id: applications.stage_id,
      status: applications.status,
      screening_score: applications.screening_score,
      created_at: applications.created_at,
    })
    .from(applications)
    .where(
      and(
        eq(applications.candidate_id, id),
        eq(applications.organization_id, organizationId)
      )
    )
    .orderBy(applications.created_at)

  return c.json({ data: { ...candidate, applications: candidateApplications } })
})

candidatesRouter.patch(
  '/:id',
  zValidator('json', updateCandidateSchema),
  async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    const updated = await updateCandidate(db, id, organizationId, {
      ...body,
      actorId,
      actorType: 'human',
    })

    return c.json({ data: updated })
  }
)

candidatesRouter.post(
  '/merge',
  zValidator('json', mergeCandidatesSchema),
  async (c) => {
    const body = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    if (body.primary_id === body.secondary_id) {
      return c.json({ error: 'primary_id and secondary_id must differ' }, 400)
    }

    const merged = await mergeCandidates(db, {
      primaryId: body.primary_id,
      secondaryId: body.secondary_id,
      organizationId,
      actorId,
      actorType: 'human',
    })

    return c.json({ data: merged })
  }
)

export { candidatesRouter }
