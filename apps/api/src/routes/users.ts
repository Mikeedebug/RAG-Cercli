import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { getDb, users } from '@ats/db'
import type { AuthVariables } from '../lib/context.js'
import { writeEventRecord } from '../services/events.service.js'

const inviteUserSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.enum(['admin', 'recruiter', 'hiring_manager', 'interviewer', 'sourcer']).default('recruiter'),
  permissions: z.array(z.string()).default([]),
})

const updateUserSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  role: z.enum(['admin', 'recruiter', 'hiring_manager', 'interviewer', 'sourcer']).optional(),
  permissions: z.array(z.string()).optional(),
})

const usersRouter = new Hono<{ Variables: AuthVariables }>()

usersRouter.get('/', async (c) => {
  const organizationId = c.get('organizationId')
  const db = getDb()
  const result = await db.select({ id: users.id, full_name: users.full_name, email: users.email, role: users.role, permissions: users.permissions, created_at: users.created_at, updated_at: users.updated_at })
    .from(users).where(eq(users.organization_id, organizationId)).orderBy(users.full_name)
  return c.json({ data: result })
})

usersRouter.post('/', zValidator('json', inviteUserSchema), async (c) => {
  const body = c.req.valid('json')
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const role = c.get('role')
  const db = getDb()
  if (role !== 'admin') return c.json({ error: 'Only admins may invite users' }, 403)
  const [user] = await db.insert(users).values({ organization_id: organizationId, full_name: body.full_name, email: body.email.toLowerCase().trim(), role: body.role, permissions: body.permissions }).returning()
  if (!user) return c.json({ error: 'Failed to create user' }, 500)
  await writeEventRecord(db, { type: 'user.invited', organizationId, actorId, actorType: 'human', entityType: 'user', entityId: user.id, payload: { email: user.email, role: user.role } })
  return c.json({ data: user }, 201)
})

usersRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const db = getDb()
  const [user] = await db.select({ id: users.id, full_name: users.full_name, email: users.email, role: users.role, permissions: users.permissions, created_at: users.created_at, updated_at: users.updated_at })
    .from(users).where(and(eq(users.id, id), eq(users.organization_id, organizationId))).limit(1)
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ data: user })
})

usersRouter.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const callerRole = c.get('role')
  const db = getDb()
  const isSelf = id === actorId
  const isAdmin = callerRole === 'admin'
  if (!isAdmin && !isSelf) return c.json({ error: 'Forbidden' }, 403)
  if (!isAdmin && (body.role !== undefined || body.permissions !== undefined)) return c.json({ error: 'Only admins may change roles or permissions' }, 403)
  const [existing] = await db.select().from(users).where(and(eq(users.id, id), eq(users.organization_id, organizationId))).limit(1)
  if (!existing) return c.json({ error: 'User not found' }, 404)
  const updates: Partial<typeof users.$inferInsert> = {}
  if (body.full_name !== undefined) updates.full_name = body.full_name
  if (body.role !== undefined) updates.role = body.role
  if (body.permissions !== undefined) updates.permissions = body.permissions
  updates.updated_at = new Date()
  const [updated] = await db.update(users).set(updates).where(and(eq(users.id, id), eq(users.organization_id, organizationId))).returning()
  if (!updated) return c.json({ error: 'Failed to update user' }, 500)
  await writeEventRecord(db, { type: 'user.updated', organizationId, actorId, actorType: 'human', entityType: 'user', entityId: id, payload: { changed_fields: Object.keys(updates).filter((k) => k !== 'updated_at') } })
  return c.json({ data: updated })
})

usersRouter.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const actorId = c.get('userId')
  const callerRole = c.get('role')
  const db = getDb()
  if (callerRole !== 'admin') return c.json({ error: 'Only admins may deactivate users' }, 403)
  if (id === actorId) return c.json({ error: 'You cannot deactivate your own account' }, 400)
  const [existing] = await db.select().from(users).where(and(eq(users.id, id), eq(users.organization_id, organizationId))).limit(1)
  if (!existing) return c.json({ error: 'User not found' }, 404)
  await db.update(users).set({ clerk_user_id: null, updated_at: new Date() }).where(and(eq(users.id, id), eq(users.organization_id, organizationId)))
  await writeEventRecord(db, { type: 'user.deactivated', organizationId, actorId, actorType: 'human', entityType: 'user', entityId: id, payload: { email: existing.email } })
  return c.json({ data: { id, deactivated: true } })
})

export { usersRouter }
