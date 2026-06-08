const DEMODESK_API_BASE = 'https://demodesk.com/api/v2'

export type DemodeskRecording = {
  token: string
  account_name: string
  start_date: string
}

function headers(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` }
}

export async function fetchDemodeskRecordings(since: Date): Promise<DemodeskRecording[]> {
  const apiKey = process.env.DEMODESK_API_KEY
  if (!apiKey) return []

  const recordings: DemodeskRecording[] = []
  let cursor: string | null = null

  while (true) {
    const params = new URLSearchParams({
      'filter[created_at_gteq]': since.toISOString(),
      'filter[postprocessing_status_eq]': 'done',
      'filter[status_eq]': 'ready',
      limit: '100',
    })
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`${DEMODESK_API_BASE}/recordings?${params}`, { headers: headers(apiKey), signal: AbortSignal.timeout(10000) })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Demodesk recordings fetch failed: ${res.status} - ${body.slice(0, 200)}`)
    }
    const data = await res.json()
    const items: Array<{ recordingToken: string; name: string; demoStartDate: string }> = data.data ?? []

    for (const item of items) {
      // Meeting names look like "TEZO <> CERCLI", "CERCLI X RZM ADMIN TRAINING", "CompanyName - ATS Demo"
      // Extract the non-Cercli party as the account name
      const name = item.name ?? ''
      let accountName = name
      const cercliPattern = /\bcercli\b/i
      if (cercliPattern.test(name)) {
        // Strip "CERCLI", connectors (<>, X, -), and common suffixes to get the other party
        accountName = name
          .replace(/\bcercli\b/gi, '')
          .replace(/\s*(<>|[Xx]|[-–—]|ADMIN TRAINING|DEMO|CALL|MEETING|INTRO|DISCOVERY|FOLLOW.?UP)\s*/gi, ' ')
          .trim()
          .replace(/^\W+|\W+$/g, '')
          .trim()
      } else if (name.includes(' - ')) {
        accountName = name.split(' - ')[0].trim()
      }
      if (!accountName) accountName = name || 'Unknown'
      recordings.push({
        token: item.recordingToken,
        account_name: accountName,
        start_date: item.demoStartDate,
      })
    }

    if (!data.meta?.hasNext) break
    cursor = data.meta?.nextCursor ?? null
    if (!cursor) break
  }

  return recordings
}

export async function fetchDemodeskTranscript(token: string): Promise<string | null> {
  const apiKey = process.env.DEMODESK_API_KEY
  if (!apiKey) return null

  const res = await fetch(
    `${DEMODESK_API_BASE}/recordings/${token}/transcript?format=plaintext`,
    { headers: headers(apiKey), signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) return null
  return res.text()
}
