import type { Context } from 'hono'

// ─── Auth Variables ───────────────────────────────────────────────────────────

/**
 * Variables injected into the Hono context by the auth middleware.
 * Available via c.get('userId') etc. after the auth middleware runs.
 */
export interface AuthVariables {
  userId: string
  organizationId: string
  role: 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'sourcer'
}

// ─── AppContext ───────────────────────────────────────────────────────────────

/**
 * Typed Hono context for all ATS API handlers.
 *
 * Usage in route handlers:
 *   import type { AppContext } from '../lib/context.js'
 *   app.get('/foo', (c: AppContext) => { ... })
 */
export type AppContext = Context<{ Variables: AuthVariables }>
