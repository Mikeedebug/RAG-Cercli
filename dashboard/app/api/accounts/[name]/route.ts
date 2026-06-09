import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const accountName = decodeURIComponent(name)

  const [accountRes, signalsRes, insightCardsRes, allFRsRes] = await Promise.all([
    supabase.from('accounts').select('name, tier, acv, pylon_id').eq('name', accountName).single(),
    supabase.from('signals').select('*').eq('account_name', accountName).order('signal_date', { ascending: false }),
    supabase.from('insight_cards').select('*').eq('related_account', accountName).eq('status', 'pending'),
    supabase.from('feature_requests').select('id, title, status'),
  ])

  const signals = signalsRes.data ?? []
  const allFRs: { id: string; title: string; status: string }[] = allFRsRes.data ?? []

  // Map FR title (lowercase) → { id, status }
  const frByTitle: Record<string, { id: string; status: string }> = {}
  for (const fr of allFRs) {
    frByTitle[fr.title.toLowerCase()] = { id: fr.id, status: fr.status }
  }

  // Deduplicate signals by feature_request title
  const seen = new Set<string>()
  const featureRequests: { id: string; title: string; status: string; source: string; signal_date: string | null }[] = []
  for (const sig of signals) {
    const key = sig.feature_request.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const fr = frByTitle[key]
    featureRequests.push({
      id: fr?.id ?? '',
      title: sig.feature_request,
      status: fr?.status ?? 'under_review',
      source: sig.source,
      signal_date: sig.signal_date ?? null,
    })
  }

  const acc = accountRes.data
  const account = acc
    ? { name: acc.name, tier: acc.tier ?? null, acv: acc.acv ?? null, pylon_id: acc.pylon_id ?? null }
    : { name: accountName, tier: null, acv: null, pylon_id: null }

  const insightCards = (insightCardsRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    body: c.body,
    source: c.source ?? null,
    signal_date: c.signal_date ?? null,
    status: c.status,
  }))

  return NextResponse.json({ account, feature_requests: featureRequests, insight_cards: insightCards })
}
