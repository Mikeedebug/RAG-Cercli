import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [frsRes, cardsRes, signalsRes, logRes] = await Promise.all([
    supabase.from('feature_requests').select('*').order('rank', { ascending: true, nullsFirst: false }),
    supabase
      .from('insight_cards')
      .select('*')
      .in('status', ['pending', 'approved', 'dismissed'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('signals').select('*').order('signal_date', { ascending: false }),
    supabase
      .from('refresh_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  // Group signals by account
  const signals = signalsRes.data ?? []
  const accountMap: Record<string, { account_name: string; signals: typeof signals; sources: Set<string> }> = {}
  for (const sig of signals) {
    if (!accountMap[sig.account_name]) {
      accountMap[sig.account_name] = {
        account_name: sig.account_name,
        signals: [],
        sources: new Set(),
      }
    }
    accountMap[sig.account_name].signals.push(sig)
    accountMap[sig.account_name].sources.add(sig.source)
  }

  const accounts = Object.values(accountMap)
    .map((a) => ({
      account_name: a.account_name,
      signal_count: a.signals.length,
      sources: Array.from(a.sources),
      last_activity: a.signals[0]?.signal_date ?? null,
      signals: a.signals,
    }))
    .sort((a, b) => b.signal_count - a.signal_count)

  return NextResponse.json({
    feature_requests: frsRes.data ?? [],
    insight_cards: cardsRes.data ?? [],
    accounts,
    last_refresh: logRes.data ?? null,
  })
}
