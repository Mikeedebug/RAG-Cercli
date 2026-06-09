import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const [signalsRes, accountsRes, frsRes] = await Promise.all([
    supabase.from('signals').select('account_name, feature_request, source_id, category').order('account_name'),
    supabase.from('accounts').select('name, acv'),
    supabase.from('feature_requests').select('title, status'),
  ])

  const signals = signalsRes.data ?? []
  const accounts: { name: string; acv: number | null }[] = accountsRes.data ?? []
  const frs: { title: string; status: string }[] = frsRes.data ?? []

  const acvByAccount: Record<string, number> = {}
  for (const a of accounts) acvByAccount[a.name] = a.acv ?? 0

  const statusByTitle: Record<string, string> = {}
  for (const fr of frs) statusByTitle[fr.title.toLowerCase()] = fr.status

  // Aggregate: group signals by feature_request title
  const map: Record<string, { title: string; accounts: Set<string>; category: string | null }> = {}
  for (const sig of signals) {
    const key = sig.feature_request.toLowerCase()
    if (!map[key]) map[key] = { title: sig.feature_request, accounts: new Set(), category: sig.category ?? null }
    map[key].accounts.add(sig.account_name)
    if (!map[key].category && sig.category) map[key].category = sig.category
  }

  const rows = Object.values(map)
    .map((item) => {
      const accountList = Array.from(item.accounts)
      const affected_acv = accountList.reduce((sum, a) => sum + (acvByAccount[a] ?? 0), 0)
      return {
        title: item.title,
        category: item.category,
        account_count: accountList.length,
        accounts: accountList,
        affected_acv,
        status: statusByTitle[item.title.toLowerCase()] ?? 'pending',
      }
    })
    .sort((a, b) => b.account_count - a.account_count || b.affected_acv - a.affected_acv)

  return NextResponse.json(rows)
}
