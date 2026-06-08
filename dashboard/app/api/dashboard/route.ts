import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const [frsRes, cardsRes, signalsRes, accountsRes, logRes] = await Promise.all([
    supabase.from('feature_requests').select('*').order('rank', { ascending: true, nullsFirst: false }),
    supabase
      .from('insight_cards')
      .select('*')
      .in('status', ['pending', 'approved', 'dismissed'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('signals').select('*').order('signal_date', { ascending: false }),
    supabase.from('accounts').select('pylon_id, name, domain'),
    supabase
      .from('refresh_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const signals = signalsRes.data ?? []
  const canonicalAccounts = accountsRes.data ?? []
  const allFRs: { id: string; title: string; status: string }[] = frsRes.data ?? []

  // Map FR title (lowercase) → { id, status }
  const frByTitle: Record<string, { id: string; status: string }> = {}
  for (const fr of allFRs) {
    frByTitle[fr.title.toLowerCase()] = { id: fr.id, status: fr.status }
  }

  // Build signal map by account name
  const signalMap: Record<string, { count: number; sources: Set<string>; last_activity: string | null; feature_requests: string[] }> = {}
  for (const sig of signals) {
    if (!signalMap[sig.account_name]) {
      signalMap[sig.account_name] = { count: 0, sources: new Set(), last_activity: null, feature_requests: [] }
    }
    signalMap[sig.account_name].count++
    signalMap[sig.account_name].sources.add(sig.source)
    if (!signalMap[sig.account_name].last_activity) {
      signalMap[sig.account_name].last_activity = sig.signal_date
    }
    signalMap[sig.account_name].feature_requests.push(sig.feature_request)
  }

  // Also count pending insight cards per account
  const cards = cardsRes.data ?? []
  const pendingMap: Record<string, number> = {}
  for (const card of cards) {
    if (card.status === 'pending' && card.related_account) {
      pendingMap[card.related_account] = (pendingMap[card.related_account] ?? 0) + 1
    }
  }

  // Build account list from canonical accounts
  const accounts = canonicalAccounts.map((acc) => {
    const sigData = signalMap[acc.name] ?? { count: 0, sources: new Set(), last_activity: null, feature_requests: [] }
    const pendingCount = pendingMap[acc.name] ?? 0
    const totalActivity = sigData.count + pendingCount

    // Deduplicate FRs for this account and attach id + status
    const seen = new Set<string>()
    const accountFRs: { id: string; title: string; status: string }[] = []
    for (const title of sigData.feature_requests) {
      const key = title.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const fr = frByTitle[key]
      accountFRs.push({ id: fr?.id ?? '', title, status: fr?.status ?? 'under_review' })
    }

    return {
      account_name: acc.name,
      domain: acc.domain,
      pylon_id: acc.pylon_id,
      signal_count: sigData.count,
      pending_insights: pendingCount,
      total_activity: totalActivity,
      sources: Array.from(sigData.sources),
      last_activity: sigData.last_activity,
      top_requests: accountFRs,
    }
  }).sort((a, b) => b.total_activity - a.total_activity)

  return NextResponse.json({
    feature_requests: frsRes.data ?? [],
    insight_cards: cardsRes.data ?? [],
    accounts,
    last_refresh: logRes.data ?? null,
  })
}
