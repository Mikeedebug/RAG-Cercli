import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations } from './organization'
import { users } from './organization'

export const roleStatusEnum = pgEnum('role_status', [
  'draft',
  'open',
  'paused',
  'closed_filled',
  'closed_cancelled',
])

export const employmentTypeEnum = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
  'volunteer',
])

export const stageTypeEnum = pgEnum('stage_type', [
  'review',
  'screen',
  'interview',
  'offer',
  'hire',
  'reject',
])

export const pipelineTemplates = pgTable('pipeline_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  stages: jsonb('stages')
    .notNull()
    .$type<Array<{
      key: string
      label: string
      type: 'review' | 'screen' | 'interview' | 'offer' | 'hire' | 'reject'
      sla_hours?: number
      required_scorecard_id?: string
    }>>()
    ,
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PipelineTemplate = typeof pipelineTemplates.$inferSelect
export type NewPipelineTemplate = typeof pipelineTemplates.$inferInsert

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  department: text('department'),
  location: text('location'),
  employment_type: employmentTypeEnum('employment_type'),
  compensation_band: jsonb('compensation_band').$type<{
    currency: string
    min: number
    max: number
    period: 'annual' | 'monthly' | 'hourly'
    equity_percent_min?: number
    equity_percent_max?: number
    is_public: boolean
  }>(),
  jd_markdown: text('jd_markdown'),
  jd_structured: jsonb('jd_structured').$type<{
    skills: string[]
    requirements: string[]
    nice_to_haves: string[]
    seniority: 'intern' | 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'executive'
    headcount: number
  }>(),
  pipeline_template_id: uuid('pipeline_template_id').references(
    () => pipelineTemplates.id,
    { onDelete: 'set null' }
  ),
  hiring_manager_id: uuid('hiring_manager_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  recruiter_id: uuid('recruiter_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  status: roleStatusEnum('status').notNull().default('draft'),
  published_at: timestamp('published_at', { withTimezone: true }),
  closed_at: timestamp('closed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

export const pipelineStages = pgTable('pipeline_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  role_id: uuid('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  label: text('label').notNull(),
  type: stageTypeEnum('type').notNull(),
  sla_hours: integer('sla_hours'),
  position: integer('position').notNull(),
  required_scorecard_id: uuid('required_scorecard_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PipelineStage = typeof pipelineStages.$inferSelect
export type NewPipelineStage = typeof pipelineStages.$inferInsert

export const pipelineTemplatesRelations = relations(
  pipelineTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [pipelineTemplates.organization_id],
      references: [organizations.id],
    }),
    roles: many(roles),
  })
)

export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.organization_id],
    references: [organizations.id],
  }),
  pipeline_template: one(pipelineTemplates, {
    fields: [roles.pipeline_template_id],
    references: [pipelineTemplates.id],
  }),
  hiring_manager: one(users, {
    fields: [roles.hiring_manager_id],
    references: [users.id],
    relationName: 'role_hiring_manager',
  }),
  recruiter: one(users, {
    fields: [roles.recruiter_id],
    references: [users.id],
    relationName: 'role_recruiter',
  }),
  pipeline_stages: many(pipelineStages),
}))

export const pipelineStagesRelations = relations(pipelineStages, ({ one }) => ({
  organization: one(organizations, {
    fields: [pipelineStages.organization_id],
    references: [organizations.id],
  }),
  role: one(roles, {
    fields: [pipelineStages.role_id],
    references: [roles.id],
  }),
}))
