const PYLON_BASE = 'https://api.usepylon.com'

function pylonHeaders() {
  return { Authorization: `Bearer ${process.env.PYLON_API_KEY}` }
}

async function pylonGet(path: string) {
  const res = await fetch(`${PYLON_BASE}${path}`, { headers: pylonHeaders() })
  if (!res.ok) throw new Error(`Pylon ${path} failed: ${res.status}`)
  return res.json()
}

// Fetch all accounts and return id -> name map
export async function fetchPylonAccountMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  let cursor: string | null = null

  while (true) {
    const params = new URLSearchParams({ limit: '100' })
    if (cursor) params.set('cursor', cursor)
    const data = await pylonGet(`/accounts?${params}`)
    const accounts = data.accounts ?? data ?? []
    for (const a of accounts) {
      if (a.id && a.name) map[a.id] = a.name
    }
    if (!data.has_next_page || !data.cursor) break
    cursor = data.cursor
  }

  return map
}

export type PylonIssue = {
  id: string
  title: string
  created_at: string
  account_name: string
}

export async function fetchPylonIssues(since: Date): Promise<PylonIssue[]> {
  if (!process.env.PYLON_API_KEY) return []

  const accountMap = await fetchPylonAccountMap()
  const issues: PylonIssue[] = []
  let cursor: string | null = null

  while (true) {
    const params = new URLSearchParams({
      limit: '100',
      created_after: since.toISOString(),
    })
    if (cursor) params.set('cursor', cursor)

    const data = await pylonGet(`/issues?${params}`)
    const items = data.issues ?? data ?? []

    for (const issue of items) {
      issues.push({
        id: issue.id,
        title: issue.title ?? '',
        created_at: issue.created_at,
        account_name: accountMap[issue.account_id] ?? 'Unknown',
      })
    }

    if (!data.has_next_page || !data.cursor) break
    cursor = data.cursor
  }

  return issues
}

export async function fetchPylonIssueMessages(issueId: string): Promise<string[]> {
  if (!process.env.PYLON_API_KEY) return []
  try {
    const data = await pylonGet(`/issues/${issueId}/messages`)
    const messages = data.messages ?? data ?? []
    return messages
      .map((m: { body?: string; content?: string; text?: string }) =>
        m.body ?? m.content ?? m.text ?? ''
      )
      .filter(Boolean)
  } catch {
    return []
  }
}
