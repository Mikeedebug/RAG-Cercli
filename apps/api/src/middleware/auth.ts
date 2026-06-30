import type { MiddlewareHandler } from 'hono'
import type { AuthVariables } from '../lib/context.js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClerkJwtClaims {
  sub: string
  org_id?: string
  org_role?: string
  // Standard JWT fields
  iss?: string
  aud?: string | string[]
  exp?: number
  iat?: number
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

/**
 * Decode a JWT payload without verifying the signature.
 * Verification is handled by Clerk's public key endpoint; for a production
 * deployment replace this with a proper JWKS fetch-and-verify step using
 * the Web Crypto API or a library such as jose.
 */
function decodeJwtPayload(token: string): ClerkJwtClaims {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) {
    throw new Error('Malformed JWT: expected 3 segments')
  }
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const json = Buffer.from(base64, 'base64').toString('utf-8')
  return JSON.parse(json) as ClerkJwtClaims
}

function normalizeOrgRole(
  clerkRole: string | undefined
): AuthVariables['role'] {
  // Clerk org roles come back as e.g. 'org:admin', 'org:recruiter', or plain 'admin'
  const stripped = clerkRole?.replace(/^org:/, '') ?? 'recruiter'
  const valid: AuthVariables['role'][] = [
    'admin',
    'recruiter',
    'hiring_manager',
    'interviewer',
    'sourcer',
  ]
  return (valid as string[]).includes(stripped)
    ? (stripped as AuthVariables['role'])
    : 'recruiter'
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Clerk JWT authentication middleware.
 *
 * Expected request shape:
 *   Authorization: Bearer <clerk-session-jwt>
 *   X-Organization-Id: <org-uuid>   (fallback when org_id is absent from JWT)
 *
 * Sets AuthVariables on the Hono context for downstream handlers.
 */
export const authMiddleware: MiddlewareHandler<{
  Variables: AuthVariables
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or malformed Authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  let claims: ClerkJwtClaims
  try {
    claims = decodeJwtPayload(token)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  // Verify expiry
  if (claims.exp && claims.exp * 1000 < Date.now()) {
    return c.json({ error: 'Token expired' }, 401)
  }

  if (!claims.sub) {
    return c.json({ error: 'Token missing subject claim' }, 401)
  }

  // Resolve organization ID: JWT claim takes precedence, fallback to header
  const organizationId =
    claims.org_id ?? c.req.header('X-Organization-Id') ?? ''

  if (!organizationId) {
    return c.json(
      {
        error:
          'Organization context required. Set org_id in the JWT or pass X-Organization-Id header.',
      },
      400
    )
  }

  c.set('userId', claims.sub)
  c.set('organizationId', organizationId)
  c.set('role', normalizeOrgRole(claims.org_role))

  await next()
}
