'use client'

import { useEffect, useRef, useState } from 'react'

type FR = {
  id: string; title: string; status: string; source: string; source_id: string; signal_date: string | null
  priority: string | null; estimated_release: string | null; comments: string | null; category?: string
}
type InsightCard = { id: string; title: string; body: string }

const CATEGORY_EMOJI: Record<string, string> = {
  'BULK ACTIONS': '📁', 'PAYROLL': '💸', 'REPORTS': '📋', 'PROFILE': '👤',
  'PERMISSIONS': '🔑', 'INTEGRATIONS': '🔗', 'EXPENSES': '🧾', 'TIME OFF': '🏝️',
  'LETTERS': '💌', 'COMPLIANCE': '⚖️', 'NOTIFICATIONS': '🔔', 'PAYMENTS': '💳', 'OTHER': '📌',
}

function statusColor(status: string): string {
  const s = (status ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'completed' || s === 'shipped') return 'bg-green-100 text-green-700'
  if (s === 'inprogress') return 'bg-yellow-100 text-yellow-700'
  if (s === 'planned') return 'bg-blue-100 text-blue-700'
  if (s === 'notstarted') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-400'
}

function statusLabel(s: string): string {
  if (!s || s === 'pending') return 'Not started'
  return s
}

function priorityColor(p: string | null): string {
  if (p === 'High') return 'bg-red-100 text-red-700'
  if (p === 'Medium') return 'bg-yellow-100 text-yellow-700'
  if (p === 'Low') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-50 text-gray-400'
}

function InlineEdit({ value, placeholder, onSave, multiline }: { value: string | null; placeholder: string; onSave: (v: string) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== (value ?? '')) onSave(draft)
  }

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value ?? ''); setEditing(true) }}
        className={`text-left text-xs hover:bg-gray-100 rounded px-1 py-0.5 w-full transition-colors ${value ? 'text-gray-700' : 'text-gray-300 italic'}`}>
        {value || placeholder}
      </button>
    )
  }

  const props = {
    ref, value: draft, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !multiline) commit(); if (e.key === 'Escape') setEditing(false) },
    className: 'text-xs border border-indigo-300 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300',
    placeholder,
  }

  return multiline ? <textarea {...props} rows={2} ref={ref as React.Ref<HTMLTextAreaElement>} /> : <input {...props} ref={ref as React.Ref<HTMLInputElement>} />
}

function PrioritySelect({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  return (
    <select value={value ?? ''} onChange={(e) => onSave(e.target.value)}
      className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300 ${priorityColor(value)}`}>
      <option value="">—</option>
      <option value="High">High</option>
      <option value="Medium">Medium</option>
      <option value="Low">Low</option>
    </select>
  )
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

  const saveMeta = async (title: string, field: string, value: string) => {
    await fetch('/api/fr-meta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_name: accountName, feature_request_title: title, [field]: value }),
    })
  }

  const updateFR = (title: string, field: string, value: string) => {
    setFrs((prev) => prev.map((fr) => fr.title === title ? { ...fr, [field]: value } : fr))
    saveMeta(title, field, value)
  }

  const acknowledge = async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    await fetch(`/api/insight-cards/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approved' }),
    })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-700 rounded-full" /></div>

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{accountName} × Cercli</h1>
          <p className="text-sm text-gray-400 mt-1">Feature request tracker — click any cell to edit</p>
        </div>

        {/* Updates */}
        {cards.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">New updates</h2>
            <div className="space-y-2">
              {cards.map((card) => (
                <div key={card.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{card.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{card.body}</p>
                  </div>
                  <button onClick={() => acknowledge(card.id)} className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0">Got it</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Requests Table */}
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#7ab648] text-white">
                <th className="text-left px-4 py-3 text-xs font-semibold w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold w-36">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Issue Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold w-28">Importance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold w-32">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold w-28">Est. Release</th>
                <th className="text-left px-4 py-3 text-xs font-semibold w-48">Comments</th>
              </tr>
            </thead>
            <tbody>
              {frs.map((fr, i) => {
                const cat = fr.category ?? 'OTHER'
                const emoji = CATEGORY_EMOJI[cat] ?? '📌'
                return (
                  <tr key={fr.title} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-gray-700">{emoji} {cat}</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 leading-snug">{fr.title}</td>
                    <td className="px-4 py-2.5">
                      <PrioritySelect value={fr.priority} onSave={(v) => updateFR(fr.title, 'priority', v)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(fr.status)}`}>
                        {statusLabel(fr.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <InlineEdit value={fr.estimated_release} placeholder="TBC" onSave={(v) => updateFR(fr.title, 'estimated_release', v)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <InlineEdit value={fr.comments} placeholder="Add comment…" onSave={(v) => updateFR(fr.title, 'comments', v)} multiline />
                    </td>
                  </tr>
                )
              })}
              {frs.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No feature requests recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
