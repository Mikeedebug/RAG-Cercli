import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const orgPlanEnum = pgEnum('org_plan', [
  'free',
  'starter',
  'growth',
  'enterprise',
])

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'recruiter',
  'hiring_manager',
  'interviewer',
  'sourcer',
])

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  subdomain: text('subdomain').notNull().unique(),
  name: text('name').notNull(),
  careers_url: text('careers_url'),
  default_locale: text('default_locale').notNull().default('en'),
  default_timezone: text('default_timezone').notNull().default('UTC'),
  branding: jsonb('branding').$type<{
    logo_url?: string
    favicon_url?: string
    primary_color?: string
    font_family?: string
    email_from_name?: string
    email_reply_to?: string
  }>(),
  plan: orgPlanEnum('plan').notNull().default('free'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  full_name: text('full_name').notNull(),
  email: text('email').notNull(),
  role: userRoleEnum('role').notNull().default('recruiter'),
  permissions: text('permissions').array().notNull().default([]),
  calendar_oauth: jsonb('calendar_oauth').$type<{
    provider: 'google' | 'microsoft'
    access_token: string
    refresh_token: string
    expires_at: string
    scope: string
  }>(),
  email_oauth: jsonb('email_oauth').$type<{
    provider: 'google' | 'microsoft'
    access_token: string
    refresh_token: string
    expires_at: string
    scope: string
  }>(),
  clerk_user_id: text('clerk_user_id').unique(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
}))

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organization_id],
    references: [organizations.id],
  }),
}))
