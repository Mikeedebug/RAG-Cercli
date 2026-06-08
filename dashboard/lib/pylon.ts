const PYLON_BASE = 'https://api.usepylon.com'

function headers() {
  return {
    Authorization: `Bearer ${process.env.PYLON_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function pylonGet(path: string) {
  const res = await fetch(`${PYLON_BASE}${path}`, { headers: headers() })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Pylon ${path} failed: ${res.status} - ${body.slice(0, 300)}`)
  }
  return res.json()
}

async function pylonPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${PYLON_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Pylon POST ${path} failed: ${res.status} - ${text.slice(0, 300)}`)
  }
  return res.json()
}

export type PylonIssue = {
  id: string
  title: string
  created_at: string
  account_id: string
  account_name: string
}

// Try multiple endpoint/param styles until one works
async function fetchIssuesPage(params: Record<string, string>) {
  const attempts = [
    () => pylonGet(`/issues?${new URLSearchParams({ ...params, limit: '100' })}`),
    () => pylonGet(`/issues?${new URLSearchParams({ ...params, per_page: '100' })}`),
    () => pylonGet(`/issues?${new URLSearchParams(params)}`),
    () => pylonPost('/issues/search', { ...params, limit: 100 }),
  ]

  let lastErr: unknown
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (e) {
      lastErr = e
      if (!String(e).includes('failed: 400') && !String(e).includes('failed: 405')) throw e
    }
  }
  throw lastErr
}

export async function fetchPylonIssues(
  since: Date,
  accountNameMap: Record<string, string> = {}
): Promise<PylonIssue[]> {
  if (!process.env.PYLON_API_KEY) return []

  const rawIssues: { id: string; title: string; created_at: string; account_id: string }[] = []

  for (const type of ['ticket', 'conversation'] as const) {
    let cursor: string | null = null
    let page = 1

    while (true) {
      const params: Record<string, string> = { type }
      if (cursor) params.cursor = cursor
      else if (page > 1) params.page = String(page)

      const data = await fetchIssuesPage(params)
      const allItems: { id: string; title: string; created_at: string; account_id: string }[] =
        data.issues ?? data.data ?? data.results ?? []

      const newItems = allItems.filter((i) => new Date(i.created_at) >= since)
      rawIssues.push(...newItems)

      // Stop if we've reached items older than `since`
      const hasOlder = allItems.some((i) => new Date(i.created_at) < since)
      if (hasOlder || !data.has_next_page || (!data.cursor && !data.next_page)) break

      cursor = data.cursor ?? null
      page++
      if (page > 50) break
    }
  }

  return rawIssues.map((issue) => ({
    id: issue.id,
    title: issue.title ?? '',
    created_at: issue.created_at,
    account_id: issue.account_id,
    account_name: accountNameMap[issue.account_id] ?? issue.account_id ?? 'Unknown',
  }))
}
