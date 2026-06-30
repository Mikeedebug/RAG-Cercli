import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { logger } from 'hono/logger'
import type { AuthVariables } from './lib/context.js'
import { authMiddleware } from './middleware/auth.js'
import { auditMiddleware } from './middleware/audit.js'
import { organizationsRouter } from './routes/organizations.js'
import { usersRouter } from './routes/users.js'
import { rolesRouter } from './routes/roles.js'
import { candidatesRouter } from './routes/candidates.js'
import { applicationsRouter } from './routes/applications.js'
import { pipelineTemplatesRouter } from './routes/pipeline-templates.js'
import { eventsRouter } from './routes/events.js'

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Variables: AuthVariables & { requestId: string } }>()

// ─── Global middleware ────────────────────────────────────────────────────────

app.use('*', requestId())
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organization-Id',
      'X-Request-Id',
    ],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 86400,
  })
)

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({ status: 'ok', version: 1 })
})

// ─── API v1 — authenticated routes ───────────────────────────────────────────

const api = new Hono<{ Variables: AuthVariables }>()

api.use('*', authMiddleware)
api.use('*', auditMiddleware)

api.route('/organizations', organizationsRouter)
api.route('/users', usersRouter)
api.route('/roles', rolesRouter)
api.route('/candidates', candidatesRouter)
api.route('/applications', applicationsRouter)
api.route('/pipeline-templates', pipelineTemplatesRouter)
api.route('/events', eventsRouter)

app.route('/api/v1', api)

// ─── Error handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  const requestId = c.get('requestId') ?? 'unknown'

  console.error(
    JSON.stringify({
      level: 'error',
      event: 'unhandled_error',
      message: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
      requestId,
      ts: new Date().toISOString(),
    })
  )

  // Distinguish known validation/domain errors from unexpected ones
  if (err.message.startsWith('not found') || err.message.endsWith('not found')) {
    return c.json({ error: err.message }, 404)
  }

  return c.json({ error: 'Internal server error', requestId }, 500)
})

app.notFound((c) => {
  return c.json({ error: `Route ${c.req.method} ${c.req.path} not found` }, 404)
})

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10)

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'server.started',
        port: info.port,
        ts: new Date().toISOString(),
      })
    )
  }
)

export { app }
