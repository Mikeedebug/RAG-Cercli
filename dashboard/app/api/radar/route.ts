import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

const IMPORTANCE_SCORE: Record<string, number> = { high: 20, mid: 10, low: 5 }

export async function GET() {
  const [signalsRes, accountsRes, frsRes] = await Promise.all([
    supabase.from('signals').select('account_name, feature_request, source_id, category, importance').order('account_name'),
    supabase.from('accounts').select('name, acv, tier'),
    supabase.from('feature_requests').select('title, status'),
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

  // Aggregate: group signals by feature_request title
  const map: Record<string, {
    title: string
    accounts: Set<string>
    category: string | null
    importance: string
  }> = {}

  for (const sig of signals) {
    const key = sig.feature_request.toLowerCase()
    if (!map[key]) map[key] = { title: sig.feature_request, accounts: new Set(), category: sig.category ?? null, importance: sig.importance ?? 'mid' }
    map[key].accounts.add(sig.account_name)
    if (!map[key].category && sig.category) map[key].category = sig.category
    // Take the highest importance across all signals for this feature
    const current = IMPORTANCE_SCORE[map[key].importance] ?? 10
    const incoming = IMPORTANCE_SCORE[sig.importance ?? 'mid'] ?? 10
    if (incoming > current) map[key].importance = sig.importance ?? 'mid'
  }

  const rows = Object.values(map)
    .map((item) => {
      const accountList = Array.from(item.accounts)
      const affected_acv = accountList.reduce((sum, a) => sum + (acvByAccount[a] ?? 0), 0)

      // Weight calculation
      const tierABonus = accountList.some((a) => tierByAccount[a] === 'A') ? 50 : 0
      const multiCustomerBonus = accountList.length > 1 ? 30 : 0
      const importanceScore = IMPORTANCE_SCORE[item.importance] ?? 10
      const weight = tierABonus + multiCustomerBonus + importanceScore

      return {
        title: item.title,
        category: item.category,
        importance: item.importance,
        account_count: accountList.length,
        accounts: accountList,
        affected_acv,
        weight,
        status: statusByTitle[item.title.toLowerCase()] ?? 'pending',
      }
    })
    .sort((a, b) => b.weight - a.weight || b.account_count - a.account_count || b.affected_acv - a.affected_acv)

  return NextResponse.json(rows)
}
