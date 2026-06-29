import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations, users } from './organization'
import { vector } from './candidates'

export const memoryScopeEnum = pgEnum('memory_scope', [
  'role',
  'candidate',
  'global',
])

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  messages: jsonb('messages')
    .notNull()
    .$type<Array<{
      role: 'user' | 'assistant' | 'tool' | 'system'
      content: string | unknown[]
      tool_call_id?: string
      name?: string
    }>>()
    .default([]),
  tool_calls: jsonb('tool_calls')
    .notNull()
    .$type<Array<{
      id: string
      name: string
      input: unknown
      output: unknown
      started_at: string
      completed_at: string
      error?: string
    }>>()
    .default([]),
  parent_entity_type: text('parent_entity_type'),
  parent_entity_id: text('parent_entity_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AgentSession = typeof agentSessions.$inferSelect
export type NewAgentSession = typeof agentSessions.$inferInsert

export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  scope: memoryScopeEnum('scope').notNull(),
  scope_id: uuid('scope_id'),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  tags: text('tags').array().notNull().default([]),
  created_by_user_id: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AgentMemory = typeof agentMemory.$inferSelect
export type NewAgentMemory = typeof agentMemory.$inferInsert

export const agentSessionsRelations = relations(agentSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [agentSessions.organization_id],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [agentSessions.user_id],
    references: [users.id],
  }),
}))

export const agentMemoryRelations = relations(agentMemory, ({ one }) => ({
  organization: one(organizations, {
    fields: [agentMemory.organization_id],
    references: [organizations.id],
  }),
  created_by_user: one(users, {
    fields: [agentMemory.created_by_user_id],
    references: [users.id],
  }),
}))
