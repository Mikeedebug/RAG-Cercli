import { z } from 'zod'
import { writeEvent } from '@ats/db'
import type { Db } from '@ats/db'
import type { Event } from '@ats/db'

// ─── Payload schema ───────────────────────────────────────────────────────────

const writeEventInputSchema = z.object({
  type: z
    .string()
    .min(1)
    .regex(
      /^[a-z_]+\.[a-z_]+$/,
      "Event type must follow '<entity>.<verb>' format, e.g. 'role.published'"
    ),
  organizationId: z.string().uuid('organizationId must be a valid UUID'),
  actorId: z.string().min(1, 'actorId is required'),
  actorType: z.enum(['human', 'agent', 'system']),
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
  payload: z.record(z.unknown()).optional(),
  occurredAt: z.date().optional(),
})

export type WriteEventInput = z.infer<typeof writeEventInputSchema>

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * The SINGLE place in the API layer where events are created.
 *
 * Validates the input with Zod, then delegates to the @ats/db writeEvent
 * helper which performs the actual INSERT. All service-layer mutations MUST
 * call this function (or the @ats/db writeEvent directly inside a transaction)
 * rather than inserting into the events table by hand.
 *
 * @param db   Drizzle client or transaction object
 * @param input  Validated event payload
 * @returns  The persisted Event row
 */
export async function writeEventRecord(
  db: Db,
  input: WriteEventInput
): Promise<Event> {
  const parsed = writeEventInputSchema.parse(input)

  return writeEvent(db, {
    type: parsed.type,
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorType: parsed.actorType,
    entityType: parsed.entityType,
    entityId: parsed.entityId,
    payload: parsed.payload,
    occurredAt: parsed.occurredAt,
  })
}
