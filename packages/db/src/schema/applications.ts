import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations, users } from './organization'
import { roles, pipelineStages } from './roles'
import { candidates } from './candidates'

export const applicationStatusEnum = pgEnum('application_status', [
  'active',
  'rejected',
  'withdrawn',
  'hired',
])

export const actorTypeEnum = pgEnum('actor_type', [
  'human',
  'agent',
])

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  candidate_id: uuid('candidate_id')
    .notNull()
    .references(() => candidates.id, { onDelete: 'cascade' }),
  role_id: uuid('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  stage_id: uuid('stage_id').references(() => pipelineStages.id, {
    onDelete: 'set null',
  }),
  entered_stage_at: timestamp('entered_stage_at', { withTimezone: true }),
  screening_score: integer('screening_score'),
  screening_explanation: text('screening_explanation'),
  status: applicationStatusEnum('status').notNull().default('active'),
  rejection_reason_id: uuid('rejection_reason_id'),
  assigned_recruiter_id: uuid('assigned_recruiter_id').references(
    () => users.id,
    { onDelete: 'set null' }
  ),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert

export const stageTransitions = pgTable('stage_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  application_id: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  from_stage_id: uuid('from_stage_id').references(() => pipelineStages.id, {
    onDelete: 'set null',
  }),
  to_stage_id: uuid('to_stage_id')
    .notNull()
    .references(() => pipelineStages.id, { onDelete: 'cascade' }),
  actor_id: uuid('actor_id'),
  actor_type: actorTypeEnum('actor_type').notNull(),
  reason: text('reason'),
  occurred_at: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type StageTransition = typeof stageTransitions.$inferSelect
export type NewStageTransition = typeof stageTransitions.$inferInsert

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [applications.organization_id],
    references: [organizations.id],
  }),
  candidate: one(candidates, {
    fields: [applications.candidate_id],
    references: [candidates.id],
  }),
  role: one(roles, {
    fields: [applications.role_id],
    references: [roles.id],
  }),
  stage: one(pipelineStages, {
    fields: [applications.stage_id],
    references: [pipelineStages.id],
  }),
  assigned_recruiter: one(users, {
    fields: [applications.assigned_recruiter_id],
    references: [users.id],
  }),
  stage_transitions: many(stageTransitions),
}))

export const stageTransitionsRelations = relations(
  stageTransitions,
  ({ one }) => ({
    application: one(applications, {
      fields: [stageTransitions.application_id],
      references: [applications.id],
    }),
    from_stage: one(pipelineStages, {
      fields: [stageTransitions.from_stage_id],
      references: [pipelineStages.id],
      relationName: 'transition_from_stage',
    }),
    to_stage: one(pipelineStages, {
      fields: [stageTransitions.to_stage_id],
      references: [pipelineStages.id],
      relationName: 'transition_to_stage',
    }),
  })
)
