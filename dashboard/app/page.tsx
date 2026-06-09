'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import RefreshButton from '../components/RefreshButton'

type RadarRow = {
  title: string
  category: string | null
  account_count: number
  accounts: string[]
  affected_acv: number
  status: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  'BULK ACTIONS': '📁', 'PAYROLL': '💸', 'REPORTS': '📋', 'PROFILE': '👤',
  'PERMISSIONS': '🔑', 'INTEGRATIONS': '🔗', 'EXPENSES': '🧾', 'TIME OFF': '🏝️',
  'LETTERS': '💌', 'COMPLIANCE': '⚖️', 'NOTIFICATIONS': '🔔', 'PAYMENTS': '💳', 'OTHER': '📌',
}

function statusColor(status: string): string {
  const s = status.toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'planned') return 'bg-blue-100 text-blue-700'
  if (s === 'inprogress') return 'bg-indigo-100 text-indigo-700'
  if (s === 'shipped' || s === 'completed') return 'bg-green-100 text-green-700'
  if (s === 'underreview') return 'bg-yellow-100 text-yellow-700'
  if (s === 'notstarted') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-400'
}

function statusLabel(s: string): string {
  if (!s || s === 'pending') return '—'
  return s
}

function AccountDrilldown({ accounts }: { accounts: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm underline-offset-2 hover:underline">
        {accounts.length}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-48">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customers</p>
            <div className="space-y-1">
              {accounts.map((a) => (
                <Link key={a} href={`/accounts/${encodeURIComponent(a)}`} onClick={() => setOpen(false)}
                  className="block text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors">
                  {a}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function HomePage() {
  const [rows, setRows] = useState<RadarRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/radar').then((r) => r.json()),
      fetch('/api/dashboard').then((r) => r.json()),
    ]).then(([radar, dash]) => {
      setRows(radar)
      setLastRefresh(dash?.last_refresh?.completed_at ?? null)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const categories = ['All', ...Array.from(new Set(rows.map((r) => r.category ?? 'OTHER'))).sort()]

  const filtered = rows.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'All' && (r.category ?? 'OTHER') !== categoryFilter) return false
    return true
  })

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center max-w-sm w-full mx-4">
            <div className="animate-spin h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Refreshing data…</p>
            <p className="text-xs text-gray-400 mt-2">This may take a minute</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Feature Radar</h1>
            <span className="text-xs text-gray-400">{rows.length} pain points</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Radar</Link>
            <Link href="/accounts" className="text-xs font-medium text-gray-500 hover:text-gray-800">Accounts</Link>
            {lastRefresh && <span className="text-xs text-gray-400">Updated {formatDistanceToNow(new Date(lastRefresh), { addSuffix: true })}</span>}
            <RefreshButton onRefreshComplete={load} onProgressUpdate={(s) => setIsRefreshing(!!s)} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <input type="text" placeholder="Search pain points…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <div className="flex gap-1 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${categoryFilter === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                {c !== 'All' ? `${CATEGORY_EMOJI[c] ?? '📌'} ${c}` : `All (${rows.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-36">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Pain Point</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-28"># Customers</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-28">Affected ACV</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-32">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const cat = row.category ?? 'OTHER'
                const emoji = CATEGORY_EMOJI[cat] ?? '📌'
                return (
                  <tr key={row.title} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-600">{emoji} {cat}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 leading-snug">{row.title}</td>
                    <td className="px-4 py-3 text-center">
                      <AccountDrilldown accounts={row.accounts} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      {row.affected_acv > 0 ? `$${row.affected_acv.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No results</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
