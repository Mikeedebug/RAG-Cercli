import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase env vars not configured')
    _client = createClient(url, key)
  }
  return _client
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = new Proxy({} as SupabaseClient, { get: (_, p) => (getClient() as any)[p] })

export type Signal = {
  id: string
  account_name: string
  source: string
  source_id: string
  feature_request: string
  verbatim_quote: string | null
  signal_date: string
  created_at: string
}

export type FeatureRequest = {
  id: string
  title: string
  rank: number | null
  status: string
  signal_count: number
  account_count: number
  last_signal_at: string | null
  created_at: string
  updated_at: string
}

export type InsightCard = {
  id: string
  type: string
  title: string
  body: string
  related_fr_id: string | null
  related_account: string | null
  signal_ids: string[]
  action: string | null
  status: string
  acted_at: string | null
  snoozed_until: string | null
  created_at: string
}
