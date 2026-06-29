import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organization'

export const eventActorTypeEnum = pgEnum('event_actor_type', [
  'human',
  'agent',
  'system',
])

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    actor_id: text('actor_id').notNull(),
    actor_type: eventActorTypeEnum('actor_type').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    occurred_at: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('events_org_occurred_idx').on(table.organization_id, table.occurred_at),
    index('events_entity_idx').on(table.organization_id, table.entity_type, table.entity_id),
    index('events_actor_idx').on(table.organization_id, table.actor_type, table.actor_id),
    index('events_type_idx').on(table.organization_id, table.type),
  ]
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

export type ApplicationStageChangedPayload = {
  from_stage_id: string | null
  from_stage_label: string | null
  to_stage_id: string
  to_stage_label: string
  reason?: string
}

export type CandidateCreatedPayload = {
  source: string
  full_name: string
}

export type RolePublishedPayload = {
  title: string
  department?: string
}

export type AgentScreeningCompletedPayload = {
  application_id: string
  score: number
  explanation_preview: string
}
