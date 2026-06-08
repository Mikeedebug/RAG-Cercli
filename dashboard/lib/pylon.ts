const PYLON_API_BASE = 'https://api.usepylon.com'

export type PylonIssue = {
  id: string
  title: string
  created_at: string
  account: { name: string } | null
}

export async function fetchPylonIssues(since: Date): Promise<PylonIssue[]> {
  const apiKey = process.env.PYLON_API_KEY
  if (!apiKey) return []

  const res = await fetch(
    `${PYLON_API_BASE}/issues?since=${since.toISOString()}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )
  if (!res.ok) throw new Error(`Pylon issues fetch failed: ${res.status}`)
  const data = await res.json()
  return data.issues ?? data ?? []
}

export async function fetchPylonIssueMessages(issueId: string): Promise<string[]> {
  const apiKey = process.env.PYLON_API_KEY
  if (!apiKey) return []

  const res = await fetch(
    `${PYLON_API_BASE}/issues/${issueId}/messages`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )
  if (!res.ok) throw new Error(`Pylon messages fetch failed: ${res.status}`)
  const data = await res.json()
  const messages = data.messages ?? data ?? []
  return messages.map((m: { body?: string; content?: string }) => m.body ?? m.content ?? '')
}
