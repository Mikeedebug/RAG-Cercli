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

async function resolveAccountName(accountId: string): Promise<string> {
  try {
    const data = await pylonGet(`/accounts/${accountId}`)
    return data.name ?? data.account?.name ?? accountId
  } catch {
    return accountId
  }
}

export type PylonIssue = {
  id: string
  title: string
  created_at: string
  account_name: string
}

async function fetchPageOfIssues(params: Record<string, string>) {
  // Try GET first with various pagination param names
  const paramAttempts = [
    new URLSearchParams({ ...params, limit: '100' }),
    new URLSearchParams({ ...params, per_page: '100' }),
    new URLSearchParams({ ...params, page_size: '100' }),
    new URLSearchParams(params), // no size param
  ]

  for (const p of paramAttempts) {
    try {
      return await pylonGet(`/issues?${p}`)
    } catch (e) {
      const msg = String(e)
      // Only retry on 400; propagate other errors
      if (!msg.includes('failed: 400')) throw e
    }
  }

  // Last resort: POST /issues/search
  return pylonPost('/issues/search', {
    ...params,
    limit: 100,
  })
}

export async function fetchPylonIssues(since: Date): Promise<PylonIssue[]> {
  if (!process.env.PYLON_API_KEY) return []

  const rawIssues: { id: string; title: string; created_at: string; account_id: string }[] = []

  for (const type of ['ticket', 'conversation'] as const) {
    let cursor: string | null = null
    let page = 1

    while (true) {
      const params: Record<string, string> = { type }
      if (cursor) params.cursor = cursor
      else if (page > 1) params.page = String(page)

      const data = await fetchPageOfIssues(params)
      const items = (data.issues ?? data.data ?? data.results ?? []).filter(
        (i: { created_at: string }) => new Date(i.created_at) >= since
      )
      rawIssues.push(...items)

      // Stop paginating if we hit items older than `since`
      const allItems = data.issues ?? data.data ?? data.results ?? []
      const hasOlder = allItems.some(
        (i: { created_at: string }) => new Date(i.created_at) < since
      )
      if (hasOlder || !data.has_next_page || (!data.cursor && !data.next_page)) break

      cursor = data.cursor ?? null
      page++
      if (page > 50) break // safety cap
    }
  }

  // Resolve unique account IDs to names in parallel
  const uniqueAccountIds = [...new Set(rawIssues.map((i) => i.account_id).filter(Boolean))]
  const nameMap: Record<string, string> = {}
  await Promise.all(
    uniqueAccountIds.map(async (id) => {
      nameMap[id] = await resolveAccountName(id)
    })
  )

  return rawIssues.map((issue) => ({
    id: issue.id,
    title: issue.title ?? '',
    created_at: issue.created_at,
    account_name: nameMap[issue.account_id] ?? 'Unknown',
  }))
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
