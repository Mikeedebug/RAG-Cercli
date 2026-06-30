const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ats_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.message ?? body.error ?? message
    } catch {
      // ignore parse failure
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export { fetchAPI }

export interface Role {
  id: string
  title: string
  department: string
  location: string
  employment_type: string
  status: 'open' | 'draft' | 'paused' | 'closed'
  applicants_count: number
  recruiter: string
  created_at: string
  hiring_manager_id?: string
  pipeline_template?: string
}

export interface Candidate {
  id: string
  name: string
  current_title: string
  current_company: string
  location: string
  source: 'sourced' | 'referral' | 'career_page' | 'linkedin' | 'agency' | string
  active_applications_count: number
  last_activity_at: string
  email?: string
  linkedin?: string
  github?: string
  website?: string
}

export interface Application {
  id: string
  candidate_id: string
  role_id: string
  stage_id: string
  screening_score?: number
  time_in_stage_hours: number
  applied_at: string
}

export interface CreateRolePayload {
  title: string
  department: string
  location: string
  employment_type: string
  hiring_manager_id?: string
  pipeline_template?: string
}

export function getRoles(params?: { status?: string }): Promise<Role[]> {
  const qs = params?.status ? `?status=${params.status}` : ''
  return fetchAPI<Role[]>(`/api/v1/roles${qs}`)
}

export function getRole(id: string): Promise<Role> {
  return fetchAPI<Role>(`/api/v1/roles/${id}`)
}

export function createRole(data: CreateRolePayload): Promise<Role> {
  return fetchAPI<Role>('/api/v1/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRole(id: string, data: Partial<CreateRolePayload>): Promise<Role> {
  return fetchAPI<Role>(`/api/v1/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function getCandidates(params?: {
  q?: string
  source?: string
  stage?: string
  location?: string
  tag?: string
  page?: number
}): Promise<{ data: Candidate[]; total: number }> {
  const sp = new URLSearchParams()
  if (params?.q) sp.set('q', params.q)
  if (params?.source) sp.set('source', params.source)
  if (params?.stage) sp.set('stage', params.stage)
  if (params?.location) sp.set('location', params.location)
  if (params?.tag) sp.set('tag', params.tag)
  if (params?.page) sp.set('page', String(params.page))
  const qs = sp.toString() ? `?${sp}` : ''
  return fetchAPI(`/api/v1/candidates${qs}`)
}

export function getCandidate(id: string): Promise<Candidate> {
  return fetchAPI<Candidate>(`/api/v1/candidates/${id}`)
}

export function getRoleApplications(roleId: string): Promise<Application[]> {
  return fetchAPI<Application[]>(`/api/v1/roles/${roleId}/applications`)
}
