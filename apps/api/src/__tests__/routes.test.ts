/**
 * Integration tests for the ATS API routes using Hono's test client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@ats/db', () => ({
  getDb: vi.fn(),
  roles: {},
  candidates: {},
  applications: {},
  pipelineStages: {},
  stageTransitions: {},
  events: {},
  eq: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
  asc: vi.fn(),
}))

vi.mock('../services/roles.service.js', () => ({
  createRole: vi.fn(),
  getRole: vi.fn(),
  listRoles: vi.fn(),
  updateRole: vi.fn(),
  publishRole: vi.fn(),
  closeRole: vi.fn(),
  pauseRole: vi.fn(),
}))

vi.mock('../services/candidates.service.js', () => ({
  createCandidate: vi.fn(),
  getCandidate: vi.fn(),
  listCandidates: vi.fn(),
  updateCandidate: vi.fn(),
  mergeCandidates: vi.fn(),
}))

vi.mock('../services/applications.service.js', () => ({
  createApplication: vi.fn(),
  getApplication: vi.fn(),
  advanceApplication: vi.fn(),
  rejectApplication: vi.fn(),
  withdrawApplication: vi.fn(),
  updateApplication: vi.fn(),
}))

vi.mock('../services/events.service.js', () => ({
  writeEventRecord: vi.fn().mockResolvedValue({ id: 'evt-id' }),
}))

vi.mock('../middleware/audit.js', () => ({
  auditMiddleware: vi.fn((_c, next) => next()),
}))

vi.mock('@hono/node-server', () => ({
  serve: vi.fn(),
}))

import { app } from '../index.js'
import * as rolesService from '../services/roles.service.js'
import * as candidatesService from '../services/candidates.service.js'
import * as applicationsService from '../services/applications.service.js'

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000002'

function makeJwt(claims: Record<string, unknown> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: USER_ID, org_id: ORG_ID, org_role: 'org:admin', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), ...claims })).toString('base64url')
  return `${header}.${payload}.fakesig`
}

function authHeaders() {
  return { Authorization: `Bearer ${makeJwt()}`, 'Content-Type': 'application/json' }
}

async function req(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
  const init: RequestInit = { method, headers: { ...authHeaders(), ...extraHeaders } }
  if (body !== undefined) init.body = JSON.stringify(body)
  return app.fetch(new Request(`http://localhost${path}`, init))
}

function makeRole(overrides: Record<string, unknown> = {}) {
  return { id: 'role-uuid-1111', organization_id: ORG_ID, title: 'Senior Engineer', department: 'Engineering', status: 'draft', published_at: null, closed_at: null, pipeline_stages: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...overrides }
}

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return { id: 'cand-uuid-2222', organization_id: ORG_ID, full_name: 'Alice Smith', emails: ['alice@example.com'], phones: [], source: 'manual', do_not_contact: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...overrides }
}

function makeApplication(overrides: Record<string, unknown> = {}) {
  return { id: 'app-uuid-3333', organization_id: ORG_ID, candidate_id: 'cand-uuid-2222', role_id: 'role-uuid-1111', stage_id: 'stage-uuid-aaaa', status: 'active', stage_transitions: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...overrides }
}

describe('POST /api/v1/roles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a role and returns 201 with the role id', async () => {
    const role = makeRole()
    vi.mocked(rolesService.createRole).mockResolvedValue(role as any)
    const res = await req('POST', '/api/v1/roles', { title: 'Senior Engineer', department: 'Engineering' })
    expect(res.status).toBe(201)
    const body = await res.json() as { data: typeof role }
    expect(body.data.id).toBe('role-uuid-1111')
    expect(body.data.status).toBe('draft')
    expect(rolesService.createRole).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'Senior Engineer', organization_id: ORG_ID, actorId: USER_ID, actorType: 'human' }))
  })

  it('returns 400 when title is missing', async () => {
    const res = await req('POST', '/api/v1/roles', { department: 'Engineering' })
    expect(res.status).toBe(400)
  })

  it('returns 401 when Authorization header is absent', async () => {
    const res = await app.fetch(new Request('http://localhost/api/v1/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Test' }) }))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/roles/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with role data when role exists', async () => {
    const role = makeRole()
    vi.mocked(rolesService.getRole).mockResolvedValue(role as any)
    const res = await req('GET', '/api/v1/roles/role-uuid-1111')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: typeof role }
    expect(body.data.id).toBe('role-uuid-1111')
    expect(rolesService.getRole).toHaveBeenCalledWith(expect.anything(), 'role-uuid-1111', ORG_ID)
  })

  it('returns 404 when role does not exist', async () => {
    vi.mocked(rolesService.getRole).mockResolvedValue(null)
    const res = await req('GET', '/api/v1/roles/nonexistent-id')
    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/not found/i)
  })
})

describe('POST /api/v1/roles/:id/publish', () => {
  beforeEach(() => vi.clearAllMocks())

  it('publishes a role and returns 200 with updated role', async () => {
    const publishedRole = makeRole({ status: 'open', published_at: new Date().toISOString() })
    vi.mocked(rolesService.publishRole).mockResolvedValue(publishedRole as any)
    const res = await req('POST', '/api/v1/roles/role-uuid-1111/publish')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: typeof publishedRole }
    expect(body.data.status).toBe('open')
    expect(rolesService.publishRole).toHaveBeenCalledWith(expect.anything(), 'role-uuid-1111', ORG_ID, USER_ID, 'human')
  })

  it('returns 500 when service throws (e.g. already published)', async () => {
    vi.mocked(rolesService.publishRole).mockRejectedValue(new Error('Role is already published'))
    const res = await req('POST', '/api/v1/roles/role-uuid-1111/publish')
    expect(res.status).toBe(500)
  })
})

describe('POST /api/v1/applications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an application and returns 201 with application data', async () => {
    const application = makeApplication()
    vi.mocked(applicationsService.createApplication).mockResolvedValue(application as any)
    const res = await req('POST', '/api/v1/applications', { candidate_id: 'cand-uuid-2222', role_id: 'role-uuid-1111' })
    expect(res.status).toBe(201)
    const body = await res.json() as { data: typeof application }
    expect(body.data.id).toBe('app-uuid-3333')
    expect(applicationsService.createApplication).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ candidate_id: 'cand-uuid-2222', role_id: 'role-uuid-1111', organization_id: ORG_ID, actorId: USER_ID, actorType: 'human' }))
  })

  it('returns 400 when candidate_id is missing', async () => {
    const res = await req('POST', '/api/v1/applications', { role_id: 'role-uuid-1111' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when role_id is not a valid UUID', async () => {
    const res = await req('POST', '/api/v1/applications', { candidate_id: 'cand-uuid-2222', role_id: 'not-a-uuid' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/applications/:id/advance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('advances the application stage and returns 200', async () => {
    const advanced = makeApplication({ stage_id: 'stage-uuid-bbbb' })
    vi.mocked(applicationsService.advanceApplication).mockResolvedValue(advanced as any)
    const res = await req('POST', '/api/v1/applications/app-uuid-3333/advance')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: typeof advanced }
    expect(body.data.stage_id).toBe('stage-uuid-bbbb')
    expect(applicationsService.advanceApplication).toHaveBeenCalledWith(expect.anything(), 'app-uuid-3333', ORG_ID, USER_ID, 'human')
  })

  it('returns 500 when service throws (e.g. no further stages)', async () => {
    vi.mocked(applicationsService.advanceApplication).mockRejectedValue(new Error('No further stages in the pipeline'))
    const res = await req('POST', '/api/v1/applications/app-uuid-3333/advance')
    expect(res.status).toBe(500)
  })
})

describe('POST /api/v1/applications/:id/reject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an application with a reason and returns 200', async () => {
    const rejected = makeApplication({ status: 'rejected' })
    vi.mocked(applicationsService.rejectApplication).mockResolvedValue(rejected as any)
    const res = await req('POST', '/api/v1/applications/app-uuid-3333/reject', { rejection_reason: 'Not enough experience' })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: typeof rejected }
    expect(body.data.status).toBe('rejected')
    expect(applicationsService.rejectApplication).toHaveBeenCalledWith(expect.anything(), 'app-uuid-3333', ORG_ID, 'Not enough experience', USER_ID, 'human')
  })

  it('returns 400 when rejection_reason is missing', async () => {
    const res = await req('POST', '/api/v1/applications/app-uuid-3333/reject', {})
    expect(res.status).toBe(400)
  })

  it('returns 400 when rejection_reason is an empty string', async () => {
    const res = await req('POST', '/api/v1/applications/app-uuid-3333/reject', { rejection_reason: '' })
    expect(res.status).toBe(400)
  })
})

describe('Authentication', () => {
  it('returns 401 for an expired token', async () => {
    const expiredJwt = makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })
    const res = await app.fetch(new Request('http://localhost/api/v1/roles', { headers: { Authorization: `Bearer ${expiredJwt}`, 'Content-Type': 'application/json' } }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when organization context is missing from JWT and header', async () => {
    const noOrgJwt = makeJwt({ org_id: undefined, sub: USER_ID })
    const parts = noOrgJwt.split('.')
    const decoded = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf-8'))
    delete decoded.org_id
    const reEncoded = Buffer.from(JSON.stringify(decoded)).toString('base64url')
    const patchedJwt = `${parts[0]}.${reEncoded}.fakesig`
    const res = await app.fetch(new Request('http://localhost/api/v1/roles', { headers: { Authorization: `Bearer ${patchedJwt}` } }))
    expect(res.status).toBe(400)
  })
})
