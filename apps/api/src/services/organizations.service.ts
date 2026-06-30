import { eq } from 'drizzle-orm'
import { organizations } from '@ats/db'
import type { Db, Organization, NewOrganization } from '@ats/db'
import { writeEventRecord } from './events.service.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  subdomain: string
  name: string
  careers_url?: string
  default_locale?: string
  default_timezone?: string
  branding?: NewOrganization['branding']
  plan?: 'free' | 'starter' | 'growth' | 'enterprise'
  /** Actor performing the creation (system bootstrap, platform admin, etc.) */
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

export interface UpdateOrganizationInput {
  name?: string
  careers_url?: string
  default_locale?: string
  default_timezone?: string
  branding?: Organization['branding']
  plan?: 'free' | 'starter' | 'growth' | 'enterprise'
  actorId: string
  actorType: 'human' | 'agent' | 'system'
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createOrganization(
  db: Db,
  input: CreateOrganizationInput
): Promise<Organization> {
  const [org] = await db
    .insert(organizations)
    .values({
      subdomain: input.subdomain,
      name: input.name,
      careers_url: input.careers_url,
      default_locale: input.default_locale ?? 'en',
      default_timezone: input.default_timezone ?? 'UTC',
      branding: input.branding,
      plan: input.plan ?? 'free',
    })
    .returning()

  if (!org) {
    throw new Error('Failed to create organization')
  }

  await writeEventRecord(db, {
    type: 'organization.created',
    organizationId: org.id,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'organization',
    entityId: org.id,
    payload: {
      name: org.name,
      subdomain: org.subdomain,
      plan: org.plan,
    },
  })

  return org
}

export async function getOrganization(
  db: Db,
  organizationId: string
): Promise<Organization | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  return org ?? null
}

export async function updateOrganization(
  db: Db,
  organizationId: string,
  input: UpdateOrganizationInput
): Promise<Organization> {
  const existing = await getOrganization(db, organizationId)
  if (!existing) {
    throw new Error(`Organization not found: ${organizationId}`)
  }

  const updates: Partial<NewOrganization> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.careers_url !== undefined) updates.careers_url = input.careers_url
  if (input.default_locale !== undefined)
    updates.default_locale = input.default_locale
  if (input.default_timezone !== undefined)
    updates.default_timezone = input.default_timezone
  if (input.branding !== undefined) updates.branding = input.branding
  if (input.plan !== undefined) updates.plan = input.plan

  updates.updated_at = new Date()

  const [updated] = await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, organizationId))
    .returning()

  if (!updated) {
    throw new Error('Failed to update organization')
  }

  await writeEventRecord(db, {
    type: 'organization.updated',
    organizationId: organizationId,
    actorId: input.actorId,
    actorType: input.actorType,
    entityType: 'organization',
    entityId: organizationId,
    payload: {
      before: {
        name: existing.name,
        plan: existing.plan,
      },
      after: {
        name: updated.name,
        plan: updated.plan,
      },
      changed_fields: Object.keys(updates).filter((k) => k !== 'updated_at'),
    },
  })

  return updated
}
