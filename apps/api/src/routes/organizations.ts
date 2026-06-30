import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '@ats/db'
import type { AuthVariables } from '../lib/context.js'
import { createOrganization, getOrganization, updateOrganization } from '../services/organizations.service.js'

const createOrgSchema = z.object({
  subdomain: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, 'Subdomain may only contain lowercase letters, digits, and hyphens'),
  name: z.string().min(1).max(200),
  careers_url: z.string().url().optional(),
  default_locale: z.string().min(2).max(10).optional(),
  default_timezone: z.string().min(1).optional(),
  branding: z.object({
    logo_url: z.string().url().optional(),
    favicon_url: z.string().url().optional(),
    primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    font_family: z.string().optional(),
    email_from_name: z.string().optional(),
    email_reply_to: z.string().email().optional(),
  }).optional(),
  plan: z.enum(['free', 'starter', 'growth', 'enterprise']).optional(),
})

const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  careers_url: z.string().url().nullable().optional(),
  default_locale: z.string().min(2).max(10).optional(),
  default_timezone: z.string().min(1).optional(),
  branding: z.object({
    logo_url: z.string().url().optional(),
    favicon_url: z.string().url().optional(),
    primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    font_family: z.string().optional(),
    email_from_name: z.string().optional(),
    email_reply_to: z.string().email().optional(),
  }).optional(),
  plan: z.enum(['free', 'starter', 'growth', 'enterprise']).optional(),
})

const organizationsRouter = new Hono<{ Variables: AuthVariables }>()

organizationsRouter.post('/', zValidator('json', createOrgSchema), async (c) => {
  const body = c.req.valid('json')
  const actorId = c.get('userId')
  const role = c.get('role')
  if (role !== 'admin') return c.json({ error: 'Only admins may create organizations' }, 403)
  const db = getDb()
  const org = await createOrganization(db, { ...body, actorId, actorType: 'human' })
  return c.json({ data: org }, 201)
})

organizationsRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  if (id !== organizationId) return c.json({ error: 'Forbidden' }, 403)
  const db = getDb()
  const org = await getOrganization(db, id)
  if (!org) return c.json({ error: 'Organization not found' }, 404)
  return c.json({ data: org })
})

organizationsRouter.patch('/:id', zValidator('json', updateOrgSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const role = c.get('role')
  if (id !== organizationId) return c.json({ error: 'Forbidden' }, 403)
  if (role !== 'admin') return c.json({ error: 'Only admins may update organization settings' }, 403)
  const db = getDb()
  const updated = await updateOrganization(db, id, { ...body, careers_url: body.careers_url === null ? undefined : body.careers_url, actorId, actorType: 'human' })
  return c.json({ data: updated })
})

export { organizationsRouter }
