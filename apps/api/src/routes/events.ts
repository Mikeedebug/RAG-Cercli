import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, gte, lte, SQL } from 'drizzle-orm'
import { getDb, events } from '@ats/db'
import type { AuthVariables } from '../lib/context.js'

// ─── Schema ───────────────────────────────────────────────────────────────────

const listEventsQuerySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  actor_id: z.string().optional(),
  actor_type: z.enum(['human', 'agent', 'system']).optional(),
  type: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

// ─── Router ───────────────────────────────────────────────────────────────────

const eventsRouter = new Hono<{ Variables: AuthVariables }>()

eventsRouter.get('/', zValidator('query', listEventsQuerySchema), async (c) => {
  const query = c.req.valid('query')
  const organizationId = c.get('organizationId')
  const db = getDb()

  const conditions: SQL[] = [eq(events.organization_id, organizationId)]

  if (query.entity_type) {
    conditions.push(eq(events.entity_type, query.entity_type))
  }
  if (query.entity_id) {
    conditions.push(eq(events.entity_id, query.entity_id))
  }
  if (query.actor_id) {
    conditions.push(eq(events.actor_id, query.actor_id))
  }
  if (query.actor_type) {
    conditions.push(eq(events.actor_type, query.actor_type))
  }
  if (query.type) {
    conditions.push(eq(events.type, query.type))
  }
  if (query.from) {
    conditions.push(gte(events.occurred_at, new Date(query.from)))
  }
  if (query.to) {
    conditions.push(lte(events.occurred_at, new Date(query.to)))
  }

  const result = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(events.occurred_at)
    .limit(query.limit)
    .offset(query.offset)

  return c.json({
    data: result,
    meta: { limit: query.limit, offset: query.offset },
  })
})

export { eventsRouter }
