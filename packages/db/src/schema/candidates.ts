import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  customType,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations } from './organization'

export const vector = customType<{
  data: number[]
  driverData: string
  config: { dimensions: number }
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(',')
      .map(Number)
  },
})

export const candidateSourceEnum = pgEnum('candidate_source', [
  'career_page',
  'referral',
  'sourcing_agent',
  'manual',
  'linkedin',
  'other',
])

export const gdprLawfulBasisEnum = pgEnum('gdpr_lawful_basis', [
  'legitimate_interest',
  'consent',
  'contract',
  'not_applicable',
])

export const candidates = pgTable('candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  full_name: text('full_name').notNull(),
  emails: text('emails').array().notNull().default([]),
  phones: text('phones').array().notNull().default([]),
  linkedin_url: text('linkedin_url'),
  github_url: text('github_url'),
  current_company: text('current_company'),
  current_title: text('current_title'),
  location: text('location'),
  cv_documents: jsonb('cv_documents')
    .notNull()
    .$type<Array<{
      id: string
      filename: string
      storage_url: string
      mime_type: string
      size_bytes: number
      uploaded_at: string
      is_primary: boolean
    }>>()
    .default([]),
  parsed_profile: jsonb('parsed_profile').$type<{
    summary?: string
    total_years_experience?: number
    skills: string[]
    languages: string[]
    education: Array<{
      degree: string
      field: string
      institution: string
      graduation_year?: number
    }>
    work_history: Array<{
      company: string
      title: string
      start_date: string
      end_date?: string
      is_current: boolean
      description?: string
    }>
    certifications: string[]
    last_parsed_at: string
  }>(),
  embedding: vector('embedding', { dimensions: 1536 }),
  source: candidateSourceEnum('source').notNull().default('manual'),
  gdpr_status: jsonb('gdpr_status').$type<{
    lawful_basis: 'legitimate_interest' | 'consent' | 'contract' | 'not_applicable'
    consent_given_at?: string
    consent_expires_at?: string
    data_retention_until?: string
    right_to_erasure_requested_at?: string
    notes?: string
  }>(),
  do_not_contact: boolean('do_not_contact').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Candidate = typeof candidates.$inferSelect
export type NewCandidate = typeof candidates.$inferInsert

export const candidatesRelations = relations(candidates, ({ one }) => ({
  organization: one(organizations, {
    fields: [candidates.organization_id],
    references: [organizations.id],
  }),
}))
