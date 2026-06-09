'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type AccountData = {
  account_name: string; tier?: string; acv?: number; signal_count: number
  pending_insights: number; total_activity: number; last_activity: string | null
  feature_requests: { id: string; title: string; status: string; source: string; signal_date: string | null }[]
}

type SortKey = 'account_name' | 'tier' | 'acv' | 'signal_count' | 'pending_insights' | 'last_activity'
type SortDir = 'asc' | 'desc'

const TIER_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 }

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-0.5 text-[9px] text-gray-300 group-hover:text-gray-400">↕</span>
  return <span className="ml-0.5 text-[9px] text-indigo-500">{dir === 'asc' ? '▲' : '▼'}</span>
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('signal_count')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then((d) => setAccounts(d.accounts ?? [])).finally(() => setLoading(false))
  }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      // Sensible default direction per column
      setSortDir(key === 'account_name' ? 'asc' : 'desc')
    }
  }

  const filtered = accounts
    .filter((a) => !search || a.account_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'account_name':
          cmp = a.account_name.localeCompare(b.account_name)
          break
        case 'tier':
          cmp = (TIER_ORDER[a.tier ?? ''] ?? 9) - (TIER_ORDER[b.tier ?? ''] ?? 9)
          break
        case 'acv':
          cmp = (a.acv ?? 0) - (b.acv ?? 0)
          break
        case 'signal_count':
          cmp = a.signal_count - b.signal_count
          break
        case 'pending_insights':
          cmp = a.pending_insights - b.pending_insights
          break
        case 'last_activity':
          cmp = (a.last_activity ?? '').localeCompare(b.last_activity ?? '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  function thClass(key: SortKey, align: 'left' | 'right' | 'center' = 'left') {
    const base = `px-4 py-3 text-xs font-semibold cursor-pointer select-none group transition-colors`
    const textAlign = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    const active = sortKey === key ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
    return `${base} ${textAlign} ${active}`
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-medium text-gray-500 hover:text-gray-800">← Radar</Link>
            <h1 className="text-xl font-bold text-gray-900">Accounts</h1>
            <span className="text-xs text-gray-400">{accounts.length} accounts</span>
          </div>
          <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={thClass('account_name')} onClick={() => handleSort('account_name')}>
                  Account <SortIcon active={sortKey === 'account_name'} dir={sortDir} />
                </th>
                <th className={`${thClass('tier')} w-20`} onClick={() => handleSort('tier')}>
                  Tier <SortIcon active={sortKey === 'tier'} dir={sortDir} />
                </th>
                <th className={`${thClass('acv', 'right')} w-28`} onClick={() => handleSort('acv')}>
                  ACV <SortIcon active={sortKey === 'acv'} dir={sortDir} />
                </th>
                <th className={`${thClass('signal_count', 'center')} w-20`} onClick={() => handleSort('signal_count')}>
                  Signals <SortIcon active={sortKey === 'signal_count'} dir={sortDir} />
                </th>
                <th className={`${thClass('pending_insights', 'center')} w-20`} onClick={() => handleSort('pending_insights')}>
                  Pending <SortIcon active={sortKey === 'pending_insights'} dir={sortDir} />
                </th>
                <th className={`${thClass('last_activity')} w-36`} onClick={() => handleSort('last_activity')}>
                  Last activity <SortIcon active={sortKey === 'last_activity'} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.account_name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/accounts/${encodeURIComponent(a.account_name)}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.account_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.tier ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{a.acv ? `$${a.acv.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">{a.signal_count || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {a.pending_insights > 0 ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{a.pending_insights}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {a.last_activity ? new Date(a.last_activity).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No accounts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
