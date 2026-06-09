'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type FR = {
  id: string; title: string; status: string; source: string; source_id: string
  signal_date: string | null; priority: string | null; estimated_release: string | null
  comments: string | null; category?: string
}
type InsightCard = { id: string; title: string; body: string; source: string | null; source_id: string | null; signal_date: string | null; status: string }
type AccountInfo = { name: string; tier: string | null; acv: number | null; pylon_id: string | null }

const CATEGORY_EMOJI: Record<string, string> = {
  'BULK ACTIONS': '📁', 'PAYROLL': '💸', 'REPORTS': '📋', 'PROFILE': '👤',
  'PERMISSIONS': '🔑', 'INTEGRATIONS': '🔗', 'EXPENSES': '🧾', 'TIME OFF': '🏝️',
  'LETTERS': '💌', 'COMPLIANCE': '⚖️', 'NOTIFICATIONS': '🔔', 'PAYMENTS': '💳', 'OTHER': '📌',
}
const CATEGORIES = Object.keys(CATEGORY_EMOJI)
const PRESET_STATUSES = ['Not started', 'In progress', 'Completed', 'Planned', "Won't Do"]

function priorityColor(p: string | null): string {
  if (p === 'High') return 'bg-red-100 text-red-700'
  if (p === 'Medium') return 'bg-yellow-100 text-yellow-700'
  if (p === 'Low') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-400'
}

function statusColor(status: string): string {
  const s = (status ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'completed' || s === 'shipped') return 'bg-green-100 text-green-700'
  if (s === 'inprogress') return 'bg-yellow-100 text-yellow-700'
  if (s === 'planned') return 'bg-blue-100 text-blue-700'
  if (s === 'notstarted') return 'bg-red-100 text-red-700'
  if (s === 'wontdo') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-400'
}

function sourceBadge(source: string | null, sourceId?: string | null) {
  if (source === 'demodesk') return <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">Call</span>
  if (sourceId?.includes('nps')) return <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">NPS</span>
  if (source === 'manual') return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Manual</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600">Slack</span>
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

// Inline editable text cell
function EditCell({ value, placeholder, onSave, multiline }: { value: string | null; placeholder: string; onSave: (v: string) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value ?? '') }, [value])

  function commit() {
    setEditing(false)
    if (draft !== (value ?? '')) onSave(draft)
  }

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value ?? ''); setEditing(true) }}
        className={`text-left w-full text-xs rounded px-1 py-0.5 hover:bg-gray-100 transition-colors ${value ? 'text-gray-800' : 'text-gray-300 italic'}`}>
        {value || placeholder}
      </button>
    )
  }
  const shared = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !multiline) commit(); if (e.key === 'Escape') setEditing(false) },
    className: 'text-xs border border-indigo-300 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white',
    placeholder,
  }
  return multiline
    ? <textarea {...shared} rows={2} ref={ref as React.Ref<HTMLTextAreaElement>} />
    : <input {...shared} ref={ref as React.Ref<HTMLInputElement>} />
}

// Inline category selector
function CategoryCell({ value, title, frId, onSave }: { value?: string; title: string; frId: string; onSave: (v: string) => void }) {
  const [cat, setCat] = useState(value ?? '')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!value && frId) {
      setLoading(true)
      fetch('/api/categorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
        .then((r) => r.json()).then((d) => { if (d.category) { setCat(d.category); onSave(d.category) } })
        .finally(() => setLoading(false))
    }
  }, [frId, value, title, onSave])

  const emoji = CATEGORY_EMOJI[cat] ?? '📌'

  if (loading) return <span className="text-xs text-gray-300 italic">…</span>

  if (editing) {
    return (
      <select value={cat} autoFocus onBlur={() => setEditing(false)}
        onChange={(e) => { setCat(e.target.value); onSave(e.target.value); setEditing(false) }}
        className="text-xs border border-indigo-300 rounded px-1 py-0.5 focus:outline-none w-36">
        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
      </select>
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded px-1 py-0.5 w-full">
      {cat ? `${emoji} ${cat}` : <span className="text-gray-300 italic font-normal">+ category</span>}
    </button>
  )
}

// Status dropdown cell
function StatusCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(value)}`}>
        {value && value !== 'pending' ? value : 'Not started'}
      </button>
    )
  }
  return (
    <div className="relative">
      <input ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => { if (!e.relatedTarget?.closest?.('[data-preset]')) { onSave(draft); setEditing(false) } }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onSave(draft); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
        className="text-xs border border-indigo-300 rounded px-2 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
      <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-max">
        {PRESET_STATUSES.map((p) => (
          <button key={p} data-preset="true" onMouseDown={(e) => { e.preventDefault(); onSave(p); setEditing(false) }}
            className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50 text-gray-700">{p}</button>
        ))}
      </div>
    </div>
  )
}

export default function AccountPage({ params }: { params: Promise<{ name: string }> }) {
  const [accountName, setAccountName] = useState<string>('')
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [frs, setFrs] = useState<FR[]>([])
  const [cards, setCards] = useState<InsightCard[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddFR, setShowAddFR] = useState(false)
  const [newFRTitle, setNewFRTitle] = useState('')
  const [newFRNote, setNewFRNote] = useState('')
  const [addingFR, setAddingFR] = useState(false)

  const [mergeMode, setMergeMode] = useState(false)
  const [mergeSelected, setMergeSelected] = useState<string[]>([])
  const [mergeBody, setMergeBody] = useState('')
  const [showMergeEditor, setShowMergeEditor] = useState(false)
  const [merging, setMerging] = useState(false)

  const loadData = (name: string) => {
    fetch(`/api/accounts/${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((json) => { setAccount(json.account); setFrs(json.feature_requests ?? []); setCards(json.insight_cards ?? []) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    params.then(({ name }) => { const d = decodeURIComponent(name); setAccountName(d); loadData(d) })
  }, [params])

  const saveMeta = (title: string, field: string, value: string) => {
    fetch('/api/fr-meta', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_name: accountName, feature_request_title: title, [field]: value }) })
  }

  const updateFR = (title: string, field: string, value: string) => {
    setFrs((prev) => prev.map((fr) => fr.title === title ? { ...fr, [field]: value } : fr))
    if (field === 'status') {
      const fr = frs.find((f) => f.title === title)
      if (fr?.id) {
        fetch(`/api/feature-requests/${fr.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: value }) })
        return
      }
    }
    saveMeta(title, field, value)
  }

  const handleInsightAction = async (id: string, action: 'approved' | 'dismissed') => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    await fetch(`/api/insight-cards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
  }

  const handleAddFR = async () => {
    if (!newFRTitle.trim()) return
    setAddingFR(true)
    const res = await fetch(`/api/accounts/${encodeURIComponent(accountName)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_request: newFRTitle.trim(), note: newFRNote.trim() || undefined }),
    })
    if (res.ok) {
      setFrs((prev) => [{ id: '', title: newFRTitle.trim(), status: 'pending', source: 'manual', source_id: 'manual', signal_date: new Date().toISOString(), priority: null, estimated_release: null, comments: null }, ...prev])
      setNewFRTitle(''); setNewFRNote(''); setShowAddFR(false)
    }
    setAddingFR(false)
  }

  const toggleMergeSelect = (id: string) =>
    setMergeSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev)

  const confirmMerge = async () => {
    setMerging(true)
    const [keepId, discardId] = mergeSelected
    await fetch('/api/insight-cards/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keep_id: keepId, discard_id: discardId, merged_body: mergeBody }) })
    setCards((prev) => prev.filter((c) => c.id !== discardId).map((c) => c.id === keepId ? { ...c, body: mergeBody } : c))
    setMerging(false); setMergeMode(false); setMergeSelected([]); setShowMergeEditor(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/accounts" className="text-gray-500 hover:text-gray-800 text-sm font-medium">← Accounts</Link>
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{accountName}</h1>
            {account?.tier && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{account.tier}</span>}
            {account?.acv != null && <span className="text-xs text-gray-500">ACV: ${account.acv.toLocaleString()}</span>}
          </div>
          <Link href={`/customer/${encodeURIComponent(accountName)}`} className="text-xs font-medium px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            Customer view →
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Pending Insights */}
        {(cards.length > 0 || mergeMode) && (
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Pending Insights{cards.length > 0 && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{cards.length}</span>}
              </h2>
              {cards.length >= 2 && (
                <button onClick={() => { setMergeMode(!mergeMode); setMergeSelected([]); setShowMergeEditor(false) }}
                  className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${mergeMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  {mergeMode ? 'Cancel' : 'Merge insights'}
                </button>
              )}
            </div>
            {mergeMode && <p className="text-xs text-gray-400 mb-3">{mergeSelected.length < 2 ? `Select ${2 - mergeSelected.length} more.` : 'Ready.'}</p>}
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.id} className={`rounded-xl border p-4 transition-colors ${mergeMode && mergeSelected.includes(card.id) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    {mergeMode && <input type="checkbox" checked={mergeSelected.includes(card.id)} onChange={() => toggleMergeSelect(card.id)} className="mt-1 h-4 w-4 rounded cursor-pointer flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{card.title}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sourceBadge(card.source, card.source_id)}
                          {card.signal_date && <span className="text-xs text-gray-400">{formatDate(card.signal_date)}</span>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{card.body}</p>
                      {!mergeMode && (
                        <div className="flex gap-2">
                          <button onClick={() => handleInsightAction(card.id, 'approved')} className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Approve</button>
                          <button onClick={() => handleInsightAction(card.id, 'dismissed')} className="px-3 py-1 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Dismiss</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {mergeMode && mergeSelected.length === 2 && !showMergeEditor && (
              <button onClick={() => { const [a, b] = mergeSelected.map((id) => cards.find((c) => c.id === id)); setMergeBody(`${a?.body ?? ''}\n\n${b?.body ?? ''}`); setShowMergeEditor(true) }}
                className="mt-3 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Merge selected →</button>
            )}
            {showMergeEditor && (
              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-sm font-medium text-indigo-700 mb-2">Edit merged insight</p>
                <textarea value={mergeBody} onChange={(e) => setMergeBody(e.target.value)} rows={4}
                  className="w-full text-sm border border-indigo-300 rounded-lg p-2 focus:outline-none resize-none bg-white" />
                <div className="flex gap-2 mt-2">
                  <button onClick={confirmMerge} disabled={merging} className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg disabled:opacity-50">{merging ? 'Merging…' : 'Confirm'}</button>
                  <button onClick={() => { setShowMergeEditor(false); setMergeSelected([]) }} className="px-4 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Feature Requests Table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Feature Requests{frs.length > 0 && <span className="ml-2 text-gray-400 font-normal normal-case text-xs">({frs.length}) — click any cell to edit</span>}
            </h2>
            <div className="flex items-center gap-2">
              {cards.length >= 2 && !mergeMode && (
                <button onClick={() => setMergeMode(true)} className="text-xs font-medium px-3 py-1 rounded-lg border bg-white text-gray-600 border-gray-200 hover:border-indigo-300">Merge insights</button>
              )}
              <button onClick={() => setShowAddFR(!showAddFR)} className="text-xs font-medium px-3 py-1 rounded-lg border bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 transition-colors">
                {showAddFR ? 'Cancel' : '+ Add'}
              </button>
            </div>
          </div>

          {showAddFR && (
            <div className="bg-white rounded-xl border border-indigo-200 p-4 mb-3">
              <input type="text" placeholder="Feature request title…" value={newFRTitle} onChange={(e) => setNewFRTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddFR() }} autoFocus
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <textarea placeholder="Verbatim quote or note (optional)…" value={newFRNote} onChange={(e) => setNewFRNote(e.target.value)} rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              <div className="flex gap-2">
                <button onClick={handleAddFR} disabled={!newFRTitle.trim() || addingFR} className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{addingFR ? 'Adding…' : 'Add'}</button>
                <button onClick={() => { setShowAddFR(false); setNewFRTitle(''); setNewFRNote('') }} className="px-4 py-1.5 text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#7ab648] text-white">
                  <th className="text-left px-3 py-3 text-xs font-semibold w-8">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold w-10">Src</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold w-36">Category</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold">Pain Point</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold w-28">Importance</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold w-32">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold w-24">Est. Release</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold w-52">Comments</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold w-20">Date</th>
                </tr>
              </thead>
              <tbody>
                {frs.map((fr, i) => (
                  <tr key={fr.title} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2">{sourceBadge(fr.source, fr.source_id)}</td>
                    <td className="px-3 py-2">
                      <CategoryCell value={fr.category} title={fr.title} frId={fr.id || fr.title}
                        onSave={(v) => updateFR(fr.title, 'category', v)} />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 leading-snug">{fr.title}</td>
                    <td className="px-3 py-2">
                      <select value={fr.priority ?? ''} onChange={(e) => updateFR(fr.title, 'priority', e.target.value)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300 ${priorityColor(fr.priority)}`}>
                        <option value="">—</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <StatusCell value={fr.status} onSave={(v) => updateFR(fr.title, 'status', v)} />
                    </td>
                    <td className="px-3 py-2">
                      <EditCell value={fr.estimated_release} placeholder="TBC" onSave={(v) => updateFR(fr.title, 'estimated_release', v)} />
                    </td>
                    <td className="px-3 py-2">
                      <EditCell value={fr.comments} placeholder="Add comment…" onSave={(v) => updateFR(fr.title, 'comments', v)} multiline />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{formatDate(fr.signal_date)}</td>
                  </tr>
                ))}
                {frs.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No feature requests recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
