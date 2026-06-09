const PYLON_BASE = 'https://api.usepylon.com'

function headers() {
  return {
    Authorization: `Bearer ${process.env.PYLON_API_KEY}`,
    Accept: 'application/json',
  }
}

export type PylonIssue = {
  id: string
  title: string
  created_at: string
  account_id: string
  account_name: string
}

export async function fetchPylonIssues(
  since: Date,
  accountNameMap: Record<string, string> = {}
): Promise<PylonIssue[]> {
  if (!process.env.PYLON_API_KEY) return []

  const rawIssues: { id: string; title: string; created_at: string; account_id: string }[] = []

  for (const type of ['ticket', 'conversation'] as const) {
    let cursor: string | null = null

    while (true) {
      const params = new URLSearchParams({
        type,
        limit: '100',
        created_after: since.toISOString(),
      })
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`${PYLON_BASE}/issues?${params}`, {
        headers: headers(),
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Pylon /issues?type=${type} failed: ${res.status} - ${body.slice(0, 300)}`)
      }

      const data = await res.json()
      const items: { id: string; title: string; created_at: string; account_id: string }[] =
        data.issues ?? data.data ?? data.results ?? []

      rawIssues.push(...items)

      if (!data.has_next_page || !data.cursor) break
      cursor = data.cursor
    }
  }

  return rawIssues.map((issue) => ({
    id: issue.id,
    title: issue.title ?? '',
    created_at: issue.created_at,
    account_id: issue.account_id,
    account_name: accountNameMap[issue.account_id] ?? 'Unknown',
  }))
}
