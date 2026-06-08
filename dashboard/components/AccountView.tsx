'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

type AccountData = {
  account_name: string
  domain?: string
  pylon_id?: string
  signal_count: number
  pending_insights: number
  total_activity: number
  sources: string[]
  last_activity: string | null
  top_requests: string[]
}

type Props = {
  accounts: AccountData[]
}

// Deterministic color from account name
const AVATAR_COLORS = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-yellow-100 text-yellow-700',
  'bg-lime-100 text-lime-700',
  'bg-green-100 text-green-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
  'bg-sky-100 text-sky-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
]

function avatarColor(name: string): string {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

function getStatus(account: AccountData): { label: string; color: string; border: string } {
  const { signal_count, pending_insights, last_activity } = account
  const daysSinceActivity = last_activity
    ? (Date.now() - new Date(last_activity).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity

  if (signal_count === 0 && pending_insights === 0) {
    return { label: 'No activity', color: 'text-gray-500 bg-gray-100', border: 'border-l-gray-200' }
  }
  if (signal_count >= 5 || (pending_insights >= 3 && daysSinceActivity < 30)) {
    return { label: 'High volume', color: 'text-red-700 bg-red-100', border: 'border-l-red-400' }
  }
  if (daysSinceActivity > 60 && signal_count > 0) {
    return { label: 'Quiet', color: 'text-orange-700 bg-orange-100', border: 'border-l-orange-400' }
  }
  if (pending_insights > 0 || signal_count > 0) {
    return { label: 'Active', color: 'text-green-700 bg-green-100', border: 'border-l-green-400' }
  }
  return { label: 'New', color: 'text-blue-700 bg-blue-100', border: 'border-l-blue-400' }
}

export default function AccountView({ accounts }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'no-activity'>('all')

  const maxActivity = Math.max(...accounts.map((a) => a.total_activity), 1)

  const filtered = accounts.filter((a) => {
    if (search && !a.account_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'active' && a.total_activity === 0) return false
    if (filter === 'no-activity' && a.total_activity > 0) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search accounts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="flex gap-1">
          {(['all', 'active', 'no-activity'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {f === 'all' ? `All (${accounts.length})` : f === 'active' ? 'Active' : 'No activity'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((account) => {
          const status = getStatus(account)
          const barWidth = Math.round((account.total_activity / maxActivity) * 100)
          const color = avatarColor(account.account_name)

          return (
            <div
              key={account.account_name}
              className={`bg-white rounded-xl border border-gray-200 border-l-4 ${status.border} p-4 hover:shadow-sm transition-shadow`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
                    {initials(account.account_name)}
                  </div>
                  <span className="font-semibold text-sm text-gray-900 leading-tight">
                    {account.account_name}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-700 tabular-nums">
                  {account.total_activity}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-gray-100 rounded-full mb-3">
                <div
                  className={`h-1 rounded-full ${
                    account.total_activity === 0 ? 'bg-gray-200' :
                    status.label === 'High volume' ? 'bg-red-400' :
                    status.label === 'Quiet' ? 'bg-orange-400' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Activity summary */}
              <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                {account.signal_count > 0 && `${account.signal_count} approved signal${account.signal_count !== 1 ? 's' : ''}`}
                {account.signal_count > 0 && account.pending_insights > 0 && ' · '}
                {account.pending_insights > 0 && `${account.pending_insights} pending review`}
                {account.total_activity === 0 && 'No signals yet'}
                {account.last_activity && ` · ${formatDistanceToNow(new Date(account.last_activity), { addSuffix: true })}`}
              </p>

              {/* Top requests */}
              {account.top_requests.length > 0 && (
                <p className="text-xs text-gray-400 italic line-clamp-1">
                  {account.top_requests[0]}
                </p>
              )}

              <div className="mt-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
