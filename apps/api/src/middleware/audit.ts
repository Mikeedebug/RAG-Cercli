import type { MiddlewareHandler } from 'hono'
import type { AuthVariables } from '../lib/context.js'

// ─── Mutating methods ─────────────────────────────────────────────────────────

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Thin audit middleware.
 *
 * The actual event writing is the responsibility of the service layer, which
 * has access to the full mutation context (before/after state, entity IDs, etc.).
 * This middleware sits as a structural reminder and extension point: it logs
 * mutating requests to stdout so operators can correlate HTTP-layer activity
 * with the event log even when a service-layer write fails.
 *
 * For agent-initiated mutations, the service layer is expected to set
 * actor_type = 'agent' directly when calling writeEvent.
 */
export const auditMiddleware: MiddlewareHandler<{
  Variables: AuthVariables
}> = async (c, next) => {
  await next()

  if (!MUTATING_METHODS.has(c.req.method)) {
    return
  }

  // After the handler has run, emit a structured log line.
  // In production this would be shipped to a log aggregator (Datadog, etc.).
  const userId = c.get('userId') ?? 'anonymous'
  const orgId = c.get('organizationId') ?? 'unknown'
  const status = c.res.status

  console.log(
    JSON.stringify({
      level: 'info',
      event: 'http.mutation',
      method: c.req.method,
      path: c.req.path,
      status,
      userId,
      organizationId: orgId,
      ts: new Date().toISOString(),
    })
  )
}
