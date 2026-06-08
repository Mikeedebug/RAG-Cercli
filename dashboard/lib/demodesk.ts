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

    const res = await fetch(`${DEMODESK_API_BASE}/recordings?${params}`, { headers: headers(apiKey) })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Demodesk recordings fetch failed: ${res.status} - ${body.slice(0, 200)}`)
    }
    const data = await res.json()
    const items: Array<{ recordingToken: string; name: string; demoStartDate: string }> = data.data ?? []

    for (const item of items) {
      // Extract account name: "CompanyName - Meeting Type" → "CompanyName"
      const nameParts = item.name?.split(' - ')
      const accountName = nameParts && nameParts.length > 1 ? nameParts[0].trim() : (item.name ?? 'Unknown')
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
    { headers: headers(apiKey) }
  )
  if (!res.ok) return null
  return res.text()
}
