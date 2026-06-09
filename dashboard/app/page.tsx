'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import RefreshButton from '../components/RefreshButton'

type RadarRow = {
  title: string
  category: string | null
  importance: string
  account_count: number
  accounts: string[]
  sources: string[]
  affected_acv: number
  weight: number
  status: string
}

function sourceToChannel(source: string): string {
  if (source === 'demodesk') return 'Call'
  if (source === 'nps') return 'NPS'
  if (source === 'manual') return 'Manual'
  return 'Slack'
}

function rowChannels(sources: string[]): string[] {
  const channels = new Set(sources.map(sourceToChannel))
  return Array.from(channels)
}

const CATEGORY_EMOJI: Record<string, string> = {
  'BULK ACTIONS': '📁', 'PAYROLL': '💸', 'REPORTS': '📋', 'PROFILE': '👤',
  'PERMISSIONS': '🔑', 'INTEGRATIONS': '🔗', 'EXPENSES': '🧾', 'TIME OFF': '🏝️',
  'LETTERS': '💌', 'COMPLIANCE': '⚖️', 'NOTIFICATIONS': '🔔', 'PAYMENTS': '💳', 'OTHER': '📌',
}
const CATEGORIES = Object.keys(CATEGORY_EMOJI)

function statusColor(status: string): string {
  const s = (status ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'completed' || s === 'shipped') return 'bg-green-100 text-green-700'
  if (s === 'inprogress') return 'bg-yellow-100 text-yellow-700'
  if (s === 'planned') return 'bg-blue-100 text-blue-700'
  if (s === 'notstarted' || s === 'underreview') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-400'
}

const IMPORTANCE_LABEL: Record<string, { label: string; classes: string }> = {
  high: { label: 'High', classes: 'bg-red-100 text-red-700' },
  mid:  { label: 'Mid',  classes: 'bg-yellow-100 text-yellow-700' },
  low:  { label: 'Low',  classes: 'bg-gray-100 text-gray-500' },
}

function ImportanceCell({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [imp, setImp] = useState(value ?? 'mid')
  useEffect(() => { setImp(value ?? 'mid') }, [value])

  if (editing) return (
    <select value={imp} autoFocus onBlur={() => setEditing(false)}
      onChange={(e) => { const v = e.target.value; setImp(v); onChange(v); setEditing(false) }}
      className="text-xs border border-indigo-300 rounded px-1 py-0.5 focus:outline-none">
      {['high', 'mid', 'low'].map((v) => <option key={v} value={v}>{IMPORTANCE_LABEL[v].label}</option>)}
    </select>
  )
  const { label, classes } = IMPORTANCE_LABEL[imp] ?? IMPORTANCE_LABEL.mid
  return (
    <button onClick={() => setEditing(true)} title="Click to change importance"
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes} hover:opacity-80 transition-opacity`}>
      {label}
    </button>
  )
}

function CategoryCell({ title, value, onChange }: { title: string; value: string | null; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [cat, setCat] = useState(value ?? 'OTHER')
  useEffect(() => { setCat(value ?? 'OTHER') }, [value])

  if (editing) return (
    <select value={cat} autoFocus onBlur={() => setEditing(false)}
      onChange={(e) => { const v = e.target.value; setCat(v); onChange(v); setEditing(false) }}
      className="text-xs border border-indigo-300 rounded px-1 py-0.5 focus:outline-none">
      {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
    </select>
  )
  return (
    <button onClick={() => setEditing(true)} className="text-left text-xs font-medium text-gray-600 hover:bg-gray-100 rounded px-1 py-0.5 w-full transition-colors" title="Click to change category">
      {CATEGORY_EMOJI[cat] ?? '📌'} {cat}
    </button>
  )
}

function AccountDrilldown({ accounts }: { accounts: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex justify-center">
      <button onClick={() => setOpen(!open)} className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm hover:underline underline-offset-2">
        {accounts.length}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-52">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customers requesting this</p>
            <div className="space-y-0.5">
              {accounts.map((a) => (
                <Link key={a} href={`/accounts/${encodeURIComponent(a)}`} onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {a[0]?.toUpperCase()}
                  </span>
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
  const [channelFilter, setChannelFilter] = useState('All')
  const [importanceFilter, setImportanceFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'importance' | 'category'>('importance')

  // Merge state
  const [mergeMode, setMergeMode] = useState(false)
  const [mergeSelected, setMergeSelected] = useState<string[]>([])
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [mergeTitle, setMergeTitle] = useState('')
  const [mergeCategory, setMergeCategory] = useState('')
  const [merging, setMerging] = useState(false)

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

  const IMPORTANCE_SCORE: Record<string, number> = { high: 20, mid: 10, low: 5 }

  const updateCategory = (title: string, category: string) => {
    setRows((prev) => prev.map((r) => r.title === title ? { ...r, category } : r))
    fetch('/api/radar/category', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature_request: title, category }) })
  }

  const updateImportance = (title: string, importance: string) => {
    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.title !== title) return r
        const tierABonus = r.weight >= 50 ? 50 : 0  // preserve tier bonus
        const multiBonus = r.account_count > 1 ? 30 : 0
        return { ...r, importance, weight: tierABonus + multiBonus + (IMPORTANCE_SCORE[importance] ?? 10) }
      })
      return [...updated].sort((a, b) => b.weight - a.weight || b.account_count - a.account_count || b.affected_acv - a.affected_acv)
    })
    fetch('/api/radar/importance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature_request: title, importance }) })
  }

  const toggleMergeSelect = (title: string) => {
    setMergeSelected((prev) => prev.includes(title) ? prev.filter((x) => x !== title) : prev.length < 2 ? [...prev, title] : prev)
  }

  const openMergeDialog = () => {
    const [a, b] = mergeSelected.map((t) => rows.find((r) => r.title === t))
    if (!a || !b) return
    // Default: use the one with more accounts as the keep title
    const keep = a.account_count >= b.account_count ? a : b
    setMergeTitle(keep.title)
    setMergeCategory(keep.category ?? 'OTHER')
    setShowMergeDialog(true)
  }

  const confirmMerge = async () => {
    setMerging(true)
    const [titleA, titleB] = mergeSelected
    const keepTitle = mergeTitle.trim()
    const discardTitle = keepTitle === titleA ? titleB : titleA

    await fetch('/api/radar/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keep_title: keepTitle, discard_title: discardTitle, merged_category: mergeCategory }) })

    // Merge rows locally
    const keepRow = rows.find((r) => r.title === keepTitle)!
    const discardRow = rows.find((r) => r.title === discardTitle)!
    const mergedAccounts = Array.from(new Set([...keepRow.accounts, ...discardRow.accounts]))
    const mergedACV = mergedAccounts.reduce((sum, a) => {
      const existing = keepRow.accounts.includes(a) ? (keepRow.affected_acv / keepRow.accounts.length) : (discardRow.affected_acv / discardRow.accounts.length)
      return sum + existing
    }, 0)

    setRows((prev) => prev
      .filter((r) => r.title !== discardTitle)
      .map((r) => r.title === keepTitle ? { ...r, title: keepTitle, accounts: mergedAccounts, account_count: mergedAccounts.length, affected_acv: mergedACV, category: mergeCategory } : r)
    )

    setMerging(false); setShowMergeDialog(false); setMergeMode(false); setMergeSelected([])
  }

  const IMPORTANCE_ORDER: Record<string, number> = { high: 0, mid: 1, low: 2 }

  const CHANNELS = ['All', 'Call', 'Slack', 'NPS']
  const IMPORTANCE_LEVELS = ['All', 'High', 'Mid', 'Low']
  const categories = ['All', ...Array.from(new Set(rows.map((r) => r.category ?? 'OTHER'))).sort()]
  const filtered = rows
    .filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'All' && (r.category ?? 'OTHER') !== categoryFilter) return false
      if (channelFilter !== 'All' && !rowChannels(r.sources ?? []).includes(channelFilter)) return false
      if (importanceFilter !== 'All' && r.importance.toLowerCase() !== importanceFilter.toLowerCase()) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'category') {
        const ca = a.category ?? 'OTHER'
        const cb = b.category ?? 'OTHER'
        return ca.localeCompare(cb) || b.weight - a.weight
      }
      // importance: sort by weight desc (weight already encodes importance + tier + multi-customer)
      return b.weight - a.weight || (IMPORTANCE_ORDER[a.importance] ?? 1) - (IMPORTANCE_ORDER[b.importance] ?? 1)
    })

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center max-w-sm w-full mx-4">
            <div className="animate-spin h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Refreshing data…</p>
          </div>
        </div>
      )}

      {/* Merge dialog */}
      {showMergeDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-1">Merge pain points</h3>
            <p className="text-xs text-gray-500 mb-4">Merging: <span className="font-medium">{mergeSelected.join(' + ')}</span></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Merged title</label>
                <input value={mergeTitle} onChange={(e) => setMergeTitle(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                <select value={mergeCategory} onChange={(e) => setMergeCategory(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={confirmMerge} disabled={!mergeTitle.trim() || merging}
                className="flex-1 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {merging ? 'Merging…' : 'Confirm merge'}
              </button>
              <button onClick={() => { setShowMergeDialog(false); setMergeSelected([]) }}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Feature Radar</h1>
            <span className="text-xs text-gray-400">{rows.length} pain points</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-medium text-indigo-600">Radar</Link>
            <Link href="/accounts" className="text-xs font-medium text-gray-500 hover:text-gray-800">Accounts</Link>
            {lastRefresh && <span className="text-xs text-gray-400 hidden sm:block">Updated {formatDistanceToNow(new Date(lastRefresh), { addSuffix: true })}</span>}
            <RefreshButton onRefreshComplete={load} onProgressUpdate={(s) => setIsRefreshing(!!s)} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <input type="text" placeholder="Search pain points…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <div className="flex gap-1 flex-wrap flex-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${categoryFilter === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                {c !== 'All' ? `${CATEGORY_EMOJI[c] ?? '📌'} ${c}` : `All (${rows.length})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setSortBy('importance')}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${sortBy === 'importance' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Importance
            </button>
            <button onClick={() => setSortBy('category')}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${sortBy === 'category' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Category
            </button>
          </div>
          <button onClick={() => { setMergeMode(!mergeMode); setMergeSelected([]) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${mergeMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            {mergeMode ? 'Cancel merge' : 'Merge rows'}
          </button>
          {mergeMode && mergeSelected.length === 2 && (
            <button onClick={openMergeDialog} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0">
              Merge selected →
            </button>
          )}
        </div>

        {/* Second filter row: Channel + Priority */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Channel</span>
            <div className="flex gap-1">
              {CHANNELS.map((ch) => (
                <button key={ch} onClick={() => setChannelFilter(ch)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${channelFilter === ch ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Priority</span>
            <div className="flex gap-1">
              {IMPORTANCE_LEVELS.map((lvl) => (
                <button key={lvl} onClick={() => setImportanceFilter(lvl)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${importanceFilter === lvl ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          {(channelFilter !== 'All' || importanceFilter !== 'All') && (
            <button onClick={() => { setChannelFilter('All'); setImportanceFilter('All') }}
              className="text-xs text-gray-400 hover:text-gray-600 underline">
              Clear filters
            </button>
          )}
        </div>

        {mergeMode && <p className="text-xs text-gray-400 mb-3">{mergeSelected.length === 0 ? 'Select 2 rows to merge.' : mergeSelected.length === 1 ? 'Select one more row.' : 'Ready — click Merge selected.'}</p>}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {mergeMode && <th className="w-8 px-3 py-3" />}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Weight</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-44">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Pain Point</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-24">Importance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-28"># Customers</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-28">Affected ACV</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-32">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const isSelected = mergeSelected.includes(row.title)
                return (
                  <tr key={row.title}
                    className={`border-b border-gray-100 last:border-0 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'} ${mergeMode ? 'cursor-pointer' : ''}`}
                    onClick={mergeMode ? () => toggleMergeSelect(row.title) : undefined}>
                    {mergeMode && (
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleMergeSelect(row.title)}
                          disabled={!isSelected && mergeSelected.length === 2}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-indigo-700">{row.weight}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <CategoryCell title={row.title} value={row.category} onChange={(v) => updateCategory(row.title, v)} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.title}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <ImportanceCell title={row.title} value={row.importance} onChange={(v) => updateImportance(row.title, v)} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <AccountDrilldown accounts={row.accounts} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      {row.affected_acv > 0 ? `$${row.affected_acv.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.status && row.status !== 'pending'
                        ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(row.status)}`}>{row.status}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No results</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
