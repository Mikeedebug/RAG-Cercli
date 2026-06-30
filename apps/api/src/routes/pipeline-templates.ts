import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { getDb, pipelineTemplates } from '@ats/db'
import type { AuthVariables } from '../lib/context.js'
import { writeEventRecord } from '../services/events.service.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const stageDefinitionSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Stage key must be lowercase alphanumeric with underscores/hyphens'),
  label: z.string().min(1).max(200),
  type: z.enum(['review', 'screen', 'interview', 'offer', 'hire', 'reject']),
  sla_hours: z.number().int().positive().optional(),
  required_scorecard_id: z.string().uuid().optional(),
})

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  stages: z
    .array(stageDefinitionSchema)
    .min(1, 'A pipeline template must have at least one stage'),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  stages: z.array(stageDefinitionSchema).min(1).optional(),
})

// ─── Router ───────────────────────────────────────────────────────────────────

const pipelineTemplatesRouter = new Hono<{ Variables: AuthVariables }>()

pipelineTemplatesRouter.get('/', async (c) => {
  const organizationId = c.get('organizationId')
  const db = getDb()

  const templates = await db
    .select()
    .from(pipelineTemplates)
    .where(eq(pipelineTemplates.organization_id, organizationId))
    .orderBy(pipelineTemplates.name)

  return c.json({ data: templates })
})

pipelineTemplatesRouter.post(
  '/',
  zValidator('json', createTemplateSchema),
  async (c) => {
    const body = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    const keys = body.stages.map((s) => s.key)
    const uniqueKeys = new Set(keys)
    if (uniqueKeys.size !== keys.length) {
      return c.json({ error: 'Stage keys must be unique within a template' }, 400)
    }

    const [template] = await db
      .insert(pipelineTemplates)
      .values({
        organization_id: organizationId,
        name: body.name,
        stages: body.stages,
      })
      .returning()

    if (!template) {
      return c.json({ error: 'Failed to create pipeline template' }, 500)
    }

    await writeEventRecord(db, {
      type: 'pipeline_template.created',
      organizationId,
      actorId,
      actorType: 'human',
      entityType: 'pipeline_template',
      entityId: template.id,
      payload: {
        name: template.name,
        stage_count: body.stages.length,
      },
    })

    return c.json({ data: template }, 201)
  }
)

pipelineTemplatesRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const organizationId = c.get('organizationId')
  const db = getDb()

  const [template] = await db
    .select()
    .from(pipelineTemplates)
    .where(
      and(
        eq(pipelineTemplates.id, id),
        eq(pipelineTemplates.organization_id, organizationId)
      )
    )
    .limit(1)

  if (!template) {
    return c.json({ error: 'Pipeline template not found' }, 404)
  }

  return c.json({ data: template })
})

pipelineTemplatesRouter.patch(
  '/:id',
  zValidator('json', updateTemplateSchema),
  async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid('json')
    const organizationId = c.get('organizationId')
    const actorId = c.get('userId')
    const db = getDb()

    const [existing] = await db
      .select()
      .from(pipelineTemplates)
      .where(
        and(
          eq(pipelineTemplates.id, id),
          eq(pipelineTemplates.organization_id, organizationId)
        )
      )
      .limit(1)

    if (!existing) {
      return c.json({ error: 'Pipeline template not found' }, 404)
    }

    if (body.stages) {
      const keys = body.stages.map((s) => s.key)
      const uniqueKeys = new Set(keys)
      if (uniqueKeys.size !== keys.length) {
        return c.json({ error: 'Stage keys must be unique within a template' }, 400)
      }
    }

    const updates: Partial<typeof pipelineTemplates.$inferInsert> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.stages !== undefined) updates.stages = body.stages
    updates.updated_at = new Date()

    const [updated] = await db
      .update(pipelineTemplates)
      .set(updates)
      .where(
        and(
          eq(pipelineTemplates.id, id),
          eq(pipelineTemplates.organization_id, organizationId)
        )
      )
      .returning()

    if (!updated) {
      return c.json({ error: 'Failed to update pipeline template' }, 500)
    }

    await writeEventRecord(db, {
      type: 'pipeline_template.updated',
      organizationId,
      actorId,
      actorType: 'human',
      entityType: 'pipeline_template',
      entityId: id,
      payload: {
        changed_fields: Object.keys(updates).filter((k) => k !== 'updated_at'),
      },
    })

    return c.json({ data: updated })
  }
)

export { pipelineTemplatesRouter }
