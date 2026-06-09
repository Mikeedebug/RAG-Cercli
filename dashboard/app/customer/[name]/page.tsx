'use client'

import { useEffect, useState } from 'react'

type FR = { id: string; title: string; status: string; source: string; source_id: string; signal_date: string | null }
type InsightCard = { id: string; title: string; body: string; source: string | null; source_id: string | null; signal_date: string | null }

function statusColor(status: string): string {
  const s = status.toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'planned') return 'bg-blue-100 text-blue-700'
  if (s === 'inprogress') return 'bg-indigo-100 text-indigo-700'
  if (s === 'shipped') return 'bg-green-100 text-green-700'
  if (s === 'underreview') return 'bg-yellow-100 text-yellow-700'
  if (s === 'wontdo') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-400'
}

function statusLabel(status: string): string {
  if (!status || status === 'pending') return 'Under Review'
  return status
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function CustomerPage({ params }: { params: Promise<{ name: string }> }) {
  const [accountName, setAccountName] = useState('')
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
          setFrs(json.feature_requests ?? [])
          setCards(json.insight_cards ?? [])
        })
        .finally(() => setLoading(false))
    })
  }, [params])

  const acknowledge = async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    await fetch(`/api/insight-cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approved' }),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-700 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{accountName}</h1>
          <p className="text-sm text-gray-500 mt-1">Feature request tracker</p>
        </div>

        {/* Pending insights — things needing acknowledgement */}
        {cards.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              New updates
            </h2>
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-sm text-gray-900 mb-1">{card.title}</p>
                  <p className="text-sm text-gray-600 mb-3">{card.body}</p>
                  <button
                    onClick={() => acknowledge(card.id)}
                    className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature requests table */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Feature requests
          </h2>

          {frs.length === 0 ? (
            <p className="text-sm text-gray-400">No feature requests recorded.</p>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Feature Request</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-28">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-20">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {frs.map((fr, i) => (
                    <tr key={fr.id || fr.title} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium leading-snug">{fr.title}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(fr.status)}`}>
                          {statusLabel(fr.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(fr.signal_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
