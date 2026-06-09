'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type FR = { id: string; title: string; status: string; source: string; source_id: string; signal_date: string | null }
type InsightCard = { id: string; title: string; body: string; source: string | null; source_id: string | null; signal_date: string | null; status: string }
type AccountInfo = { name: string; tier: string | null; acv: number | null; pylon_id: string | null }

const PRESET_STATUSES = ['Under Review', 'Planned', 'In Progress', 'Shipped', "Won't Do"]

function statusColor(status: string): string {
  const s = status.toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'planned') return 'bg-blue-100 text-blue-700'
  if (s === 'inprogress') return 'bg-indigo-100 text-indigo-700'
  if (s === 'shipped') return 'bg-green-100 text-green-700'
  if (s === 'underreview') return 'bg-yellow-100 text-yellow-700'
  if (s === 'wontdo') return 'bg-gray-100 text-gray-500'
  if (!status || status === 'pending') return 'bg-gray-100 text-gray-400'
  return 'bg-purple-100 text-purple-700'
}

function StatusEditor({ frId, status, onChange }: { frId: string; status: string; onChange: (id: string, val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(status)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setDraft(status) }, [status])

  function commit(val: string) {
    setEditing(false)
    if (val.trim() && val.trim() !== status) onChange(frId, val.trim())
    else setDraft(status)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${statusColor(status)}`}
        title="Click to edit status"
      >
        {status && status !== 'pending' ? status : 'Set status'}
      </button>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          if (!e.relatedTarget?.closest?.('[data-preset]')) commit(draft)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft)
          if (e.key === 'Escape') { setEditing(false); setDraft(status) }
        }}
        className="text-xs font-medium px-2 py-0.5 rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-32"
        placeholder="Type status…"
      />
      <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-max">
        {PRESET_STATUSES.map((p) => (
          <button
            key={p}
            data-preset="true"
            onMouseDown={(e) => { e.preventDefault(); commit(p) }}
            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function sourceBadge(source: string | null, sourceId?: string) {
  if (source === 'demodesk') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Meeting call</span>
  }
  if (sourceId?.includes('nps')) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">NPS</span>
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
                      {sourceBadge(card.source, card.source_id)}
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
                    {sourceBadge(fr.source, fr.source_id)}
                    {fr.id ? (
                      <StatusEditor frId={fr.id} status={fr.status} onChange={handleStatusChange} />
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(fr.status)}`}>
                        {fr.status}
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
