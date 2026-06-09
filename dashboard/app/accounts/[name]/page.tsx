'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type FR = { id: string; title: string; status: string; source: string; signal_date: string | null }
type InsightCard = { id: string; title: string; body: string; source: string | null; signal_date: string | null; status: string }
type AccountInfo = { name: string; tier: string | null; acv: number | null; pylon_id: string | null }

const STATUS_OPTIONS = [
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'shipped', label: 'Shipped', color: 'bg-green-100 text-green-700' },
  { value: 'wont_do', label: "Won't Do", color: 'bg-gray-100 text-gray-600' },
]

function statusColor(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.color ?? 'bg-gray-100 text-gray-600'
}

function sourceBadge(source: string | null) {
  if (source === 'demodesk') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Meeting call</span>
  }
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Slack</span>
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AccountPage({ params }: { params: Promise<{ name: string }> }) {
  const [accountName, setAccountName] = useState<string>('')
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [frs, setFrs] = useState<FR[]>([])
  const [cards, setCards] = useState<InsightCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(({ name }) => {
      const decoded = decodeURIComponent(name)
      setAccountName(decoded)
      fetch(`/api/accounts/${encodeURIComponent(decoded)}`)
        .then((r) => r.json())
        .then((json) => {
          setAccount(json.account)
          setFrs(json.feature_requests ?? [])
          setCards(json.insight_cards ?? [])
        })
        .finally(() => setLoading(false))
    })
  }, [params])

  const handleStatusChange = async (frId: string, newStatus: string) => {
    setFrs((prev) => prev.map((fr) => (fr.id === frId ? { ...fr, status: newStatus } : fr)))
    await fetch(`/api/feature-requests/${frId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const handleInsightAction = async (id: string, action: 'approved' | 'dismissed') => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    await fetch(`/api/insight-cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium">
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{accountName}</h1>
            {account?.tier && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {account.tier}
              </span>
            )}
            {account?.acv != null && (
              <span className="text-xs text-gray-500">
                ACV: ${account.acv.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Pending Insights */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Pending Insights
            {cards.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{cards.length}</span>
            )}
          </h2>

          {cards.length === 0 ? (
            <p className="text-sm text-gray-400">No pending insights.</p>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{card.title}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sourceBadge(card.source)}
                      {card.signal_date && (
                        <span className="text-xs text-gray-400">{formatDate(card.signal_date)}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{card.body}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInsightAction(card.id, 'approved')}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleInsightAction(card.id, 'dismissed')}
                      className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Feature Requests */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Feature Requests
            {frs.length > 0 && (
              <span className="ml-2 text-gray-400 font-normal normal-case text-xs">({frs.length})</span>
            )}
          </h2>

          {frs.length === 0 ? (
            <p className="text-sm text-gray-400">No feature requests recorded.</p>
          ) : (
            <div className="space-y-2">
              {frs.map((fr) => (
                <div key={fr.id || fr.title} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{fr.title}</p>
                    {fr.signal_date && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(fr.signal_date)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sourceBadge(fr.source)}
                    {fr.id ? (
                      <select
                        value={fr.status}
                        onChange={(e) => handleStatusChange(fr.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 ${statusColor(fr.status)}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(fr.status)}`}>
                        {STATUS_OPTIONS.find((o) => o.value === fr.status)?.label ?? fr.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
