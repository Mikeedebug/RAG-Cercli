import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const [signalsRes, accountsRes, frsRes, frMetaRes] = await Promise.all([
    supabase.from('signals').select('account_name, feature_request, source, source_id, category, importance, signal_date').order('account_name'),
    supabase.from('accounts').select('name, acv, tier'),
    supabase.from('feature_requests').select('title, status'),
    supabase.from('account_fr_meta').select('feature_request_title, rank, priority, fr_date').eq('is_active', true),
  ])

  const signals = signalsRes.data ?? []
  const accounts: { name: string; acv: number | null; tier: string | null }[] = accountsRes.data ?? []
  const frs: { title: string; status: string }[] = frsRes.data ?? []

  const acvByAccount: Record<string, number> = {}
  const tierByAccount: Record<string, string | null> = {}
  for (const a of accounts) {
    acvByAccount[a.name] = a.acv ?? 0
    tierByAccount[a.name] = a.tier ?? null
  }

  const statusByTitle: Record<string, string> = {}
  for (const fr of frs) statusByTitle[fr.title.toLowerCase()] = fr.status

  // Index account-level meta (rank overrides + priority + date) by FR title
  const metaByFR: Record<string, { rankSum: number; rankCount: number; priority: string | null; date: string | null }> = {}
  for (const m of frMetaRes.data ?? []) {
    const key = m.feature_request_title.toLowerCase()
    if (!metaByFR[key]) metaByFR[key] = { rankSum: 0, rankCount: 0, priority: null, date: null }
    if (m.rank != null) { metaByFR[key].rankSum += m.rank; metaByFR[key].rankCount++ }
    if (m.priority && !metaByFR[key].priority) metaByFR[key].priority = m.priority
    if (m.fr_date && !metaByFR[key].date) metaByFR[key].date = m.fr_date
  }

  // Aggregate signals by feature_request title
  const map: Record<string, {
    title: string; accounts: Set<string>; sources: Set<string>
    category: string | null; latestDate: string | null
  }> = {}

  for (const sig of signals) {
    const key = sig.feature_request.toLowerCase()
    if (!map[key]) map[key] = { title: sig.feature_request, accounts: new Set(), sources: new Set(), category: sig.category ?? null, latestDate: null }
    map[key].accounts.add(sig.account_name)
    if (sig.source) map[key].sources.add(sig.source)
    if (sig.source_id?.includes('nps')) map[key].sources.add('nps')
    if (!map[key].category && sig.category) map[key].category = sig.category
    if (sig.signal_date && (!map[key].latestDate || sig.signal_date > map[key].latestDate!)) map[key].latestDate = sig.signal_date
  }

  const now = new Date()
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const rows = Object.values(map)
    .map((item) => {
      const key = item.title.toLowerCase()
      const accountList = Array.from(item.accounts)
      const affected_acv = accountList.reduce((sum, a) => sum + (acvByAccount[a] ?? 0), 0)
      const meta = metaByFR[key]

      // If any account has set an explicit weight, average those
      let weight: number
      if (meta?.rankCount) {
        weight = Math.round(meta.rankSum / meta.rankCount)
      } else {
        // Same formula as account level
        const bestTier = accountList.includes('A') ? 'A' : accountList.find((a) => tierByAccount[a] === 'A') ? 'A' : accountList.find((a) => tierByAccount[a] === 'B') ? 'B' : 'C'
        const tierScore = bestTier === 'A' ? 4 : bestTier === 'B' ? 3 : 1
        const crossScore = accountList.length > 1 ? 2 : 0
        const date = meta?.date ?? item.latestDate
        const recencyScore = date && new Date(date) > monthAgo ? 2 : 1
        const priority = meta?.priority ?? null
        const priorityScore = priority === 'High' ? 2 : priority === 'Medium' ? 1 : 0
        weight = Math.min(tierScore + crossScore + recencyScore + priorityScore, 10)
      }

      return {
        title: item.title,
        category: item.category,
        importance: meta?.priority ?? 'mid',
        account_count: accountList.length,
        accounts: accountList,
        sources: Array.from(item.sources),
        affected_acv,
        weight,
        status: statusByTitle[key] ?? 'pending',
      }
    })
    .sort((a, b) => b.weight - a.weight || b.account_count - a.account_count || b.affected_acv - a.affected_acv)

  return NextResponse.json(rows)
}
