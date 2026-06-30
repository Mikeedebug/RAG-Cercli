import { eq, and, sql, SQL } from 'drizzle-orm'
import { candidates, applications, events } from '@ats/db'
import type { Db, Candidate, NewCandidate } from '@ats/db'
import { writeEventRecord } from './events.service.js'

export interface CreateCandidateInput {
  organization_id: string
  full_name: string
  emails?: string[]
  phones?: string[]
  linkedin_url?: string
  github_url?: string
  current_company?: string
  current_title?: string
  location?: string
  source?: NewCandidate['source']
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

export interface UpdateCandidateInput {
  full_name?: string
  emails?: string[]
  phones?: string[]
  linkedin_url?: string
  github_url?: string
  current_company?: string
  current_title?: string
  location?: string
  do_not_contact?: boolean
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

export interface ListCandidatesFilters {
  organization_id: string
  q?: string
  limit?: number
  offset?: number
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingId?: string
  matchedOn?: 'email' | 'linkedin'
}

async function checkForDuplicate(
  db: Db,
  organizationId: string,
  emails: string[],
  linkedinUrl?: string
): Promise<DuplicateCheckResult> {
  if (emails.length > 0) {
    const normalizedEmails = emails.map((e) => e.toLowerCase().trim())
    const [emailMatch] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.organization_id, organizationId),
          sql`${candidates.emails} && ${sql`ARRAY[${sql.join(normalizedEmails.map((e) => sql`${e}`), sql`, `)}]::text[]`}`
        )
      )
      .limit(1)

    if (emailMatch) {
      return { isDuplicate: true, existingId: emailMatch.id, matchedOn: 'email' }
    }
  }

  if (linkedinUrl) {
    const [linkedinMatch] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.organization_id, organizationId),
          eq(candidates.linkedin_url, linkedinUrl)
        )
      )
      .limit(1)

    if (linkedinMatch) {
      return { isDuplicate: true, existingId: linkedinMatch.id, matchedOn: 'linkedin' }
    }
  }

  return { isDuplicate: false }
}

export async function createCandidate(
  db: Db,
  input: CreateCandidateInput
): Promise<{ candidate: Candidate; duplicate?: DuplicateCheckResult }> {
  const emails = (input.emails ?? []).map((e) => e.toLowerCase().trim())

  const duplicate = await checkForDuplicate(db, input.organization_id, emails, input.linkedin_url)

  if (duplicate.isDuplicate) {
    return { candidate: await getCandidate(db, duplicate.existingId!, input.organization_id) as Candidate, duplicate }
  }

  const [candidate] = await db
    .insert(candidates)
    .values({
      organization_id: input.organization_id,
      full_name: input.full_name,
      emails,
      phones: input.phones ?? [],
      linkedin_url: input.linkedin_url,
      github_url: input.github_url,
      current_company: input.current_company,
      current_title: input.current_title,
      location: input.location,
      source: input.source ?? 'manual',
    })
    .returning()

  if (!candidate) throw new Error('Failed to create candidate')

  await writeEventRecord(db, {
    type: 'candidate.created',
    organizationId: input.organization_id,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'candidate',
    entityId: candidate.id,
    payload: { full_name: candidate.full_name, source: candidate.source },
  })

  return { candidate }
}

export async function getCandidate(
  db: Db,
  candidateId: string,
  organizationId: string
): Promise<Candidate | null> {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), eq(candidates.organization_id, organizationId)))
    .limit(1)
  return candidate ?? null
}

export async function listCandidates(
  db: Db,
  filters: ListCandidatesFilters
): Promise<Candidate[]> {
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  return db
    .select()
    .from(candidates)
    .where(eq(candidates.organization_id, filters.organization_id))
    .orderBy(sql`${candidates.created_at} DESC`)
    .limit(limit)
    .offset(offset)
}

export async function updateCandidate(
  db: Db,
  candidateId: string,
  organizationId: string,
  input: UpdateCandidateInput
): Promise<Candidate> {
  const existing = await getCandidate(db, candidateId, organizationId)
  if (!existing) throw new Error(`Candidate not found: ${candidateId}`)

  const updates: Partial<NewCandidate> = {}
  if (input.full_name !== undefined) updates.full_name = input.full_name
  if (input.emails !== undefined) updates.emails = input.emails.map((e) => e.toLowerCase().trim())
  if (input.phones !== undefined) updates.phones = input.phones
  if (input.linkedin_url !== undefined) updates.linkedin_url = input.linkedin_url
  if (input.github_url !== undefined) updates.github_url = input.github_url
  if (input.current_company !== undefined) updates.current_company = input.current_company
  if (input.current_title !== undefined) updates.current_title = input.current_title
  if (input.location !== undefined) updates.location = input.location
  if (input.do_not_contact !== undefined) updates.do_not_contact = input.do_not_contact
  updates.updated_at = new Date()

  const [updated] = await db
    .update(candidates)
    .set(updates)
    .where(and(eq(candidates.id, candidateId), eq(candidates.organization_id, organizationId)))
    .returning()

  if (!updated) throw new Error('Failed to update candidate')

  await writeEventRecord(db, {
    type: 'candidate.updated',
    organizationId,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'candidate',
    entityId: candidateId,
    payload: { changed_fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
  })

  return updated
}

export interface MergeCandidatesInput {
  primaryId: string
  secondaryId: string
  organizationId: string
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

export async function mergeCandidates(db: Db, input: MergeCandidatesInput): Promise<Candidate> {
  const [primary, secondary] = await Promise.all([
    getCandidate(db, input.primaryId, input.organizationId),
    getCandidate(db, input.secondaryId, input.organizationId),
  ])

  if (!primary) throw new Error(`Primary candidate not found: ${input.primaryId}`)
  if (!secondary) throw new Error(`Secondary candidate not found: ${input.secondaryId}`)

  const mergedEmails = Array.from(new Set([...primary.emails, ...secondary.emails]))
  const mergedPhones = Array.from(new Set([...primary.phones, ...secondary.phones]))

  const mergedPrimary = await db.transaction(async (tx) => {
    await tx.update(applications)
      .set({ candidate_id: input.primaryId })
      .where(and(eq(applications.candidate_id, input.secondaryId), eq(applications.organization_id, input.organizationId)))

    await tx.update(events)
      .set({ entity_id: input.primaryId })
      .where(and(eq(events.entity_type, 'candidate'), eq(events.entity_id, input.secondaryId), eq(events.organization_id, input.organizationId)))

    const [updatedPrimary] = await tx
      .update(candidates)
      .set({ emails: mergedEmails, phones: mergedPhones, updated_at: new Date() })
      .where(eq(candidates.id, input.primaryId))
      .returning()

    if (!updatedPrimary) throw new Error('Failed to update primary candidate')

    await tx.update(candidates)
      .set({ do_not_contact: true, updated_at: new Date() })
      .where(eq(candidates.id, input.secondaryId))

    return updatedPrimary
  })

  await writeEventRecord(db, {
    type: 'candidate.merged',
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'candidate',
    entityId: input.primaryId,
    payload: { primary_id: input.primaryId, secondary_id: input.secondaryId, role: 'primary' },
  })

  await writeEventRecord(db, {
    type: 'candidate.merged',
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'candidate',
    entityId: input.secondaryId,
    payload: { primary_id: input.primaryId, secondary_id: input.secondaryId, role: 'secondary' },
  })

  return mergedPrimary
}
