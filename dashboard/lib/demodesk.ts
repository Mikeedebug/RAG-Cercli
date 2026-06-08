const DEMODESK_API_BASE = 'https://demodesk.com/api/v1'

export type DemodeskRecording = {
  token: string
  account_name: string
  start_date: string
}

export async function fetchDemodeskRecordings(since: Date): Promise<DemodeskRecording[]> {
  const apiKey = process.env.DEMODESK_API_KEY
  if (!apiKey) return []

  const res = await fetch(
    `${DEMODESK_API_BASE}/recordings?since=${since.toISOString()}`,
    { headers: { 'api-key': apiKey } }
  )
  if (!res.ok) throw new Error(`Demodesk recordings fetch failed: ${res.status}`)
  const data = await res.json()
  return data.recordings ?? data ?? []
}

export async function fetchDemodeskTranscript(token: string): Promise<string | null> {
  const apiKey = process.env.DEMODESK_API_KEY
  if (!apiKey) return null

  const res = await fetch(
    `${DEMODESK_API_BASE}/recordings/${token}/transcript`,
    { headers: { 'api-key': apiKey } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.transcript ?? data.text ?? null
}
