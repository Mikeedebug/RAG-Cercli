'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type AccountData = {
  account_name: string; tier?: string; acv?: number; signal_count: number
  pending_insights: number; total_activity: number; last_activity: string | null
  feature_requests: { id: string; title: string; status: string; source: string; signal_date: string | null }[]
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then((d) => setAccounts(d.accounts ?? [])).finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter((a) => !search || a.account_name.toLowerCase().includes(search.toLowerCase()))

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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Account</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">Tier</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-24">ACV</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Signals</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Pending</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-32">Last activity</th>
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
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
