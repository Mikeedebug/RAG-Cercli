/**
 * @ats/db — primary barrel export
 *
 * Preferred import paths:
 *   import { db }           from '@ats/db/client'       — Drizzle client instance
 *   import { writeEvent }   from '@ats/db/events'       — event-writing helpers
 *   import { candidates }   from '@ats/db/schema'       — schema tables & types
 *
 * This barrel re-exports everything for consumers that prefer a single import
 * rather than path-specific imports.
 */

// Client
export { db, getDb } from './client'
export type { Db } from './client'

// Schema — all tables, enums, relations, and inferred types
export * from './schema/index'

// Event writing API
export {
  writeEvent,
  writeApplicationStageChanged,
  writeCandidateCreated,
  writeRolePublished,
  writeAgentScreeningCompleted,
} from './events'
export type { WriteEventInput, ActorType } from './events'
