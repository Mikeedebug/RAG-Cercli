'use client'

import { useState } from 'react'
import type { Signal } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

type AccountData = {
  account_name: string
  signal_count: number
  sources: string[]
  last_activity: string | null
  signals: Signal[]
}

type Props = {
  accounts: AccountData[]
}

export default function AccountView({ accounts }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (accounts.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No account data yet.</p>
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <div key={account.account_name} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(account.account_name)}
            className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className={`text-gray-400 text-xs transition-transform ${expanded.has(account.account_name) ? 'rotate-90' : ''}`}>▶</span>
              <span className="font-medium text-sm text-gray-900">{account.account_name}</span>
              <div className="flex gap-1">
                {account.sources.map((s) => (
                  <span
                    key={s}
                    className={`px-1.5 py-0.5 text-xs rounded ${
                      s === 'pylon' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{account.signal_count} signals</span>
              {account.last_activity && (
                <span>{formatDistanceToNow(new Date(account.last_activity), { addSuffix: true })}</span>
              )}
            </div>
          </button>

          {expanded.has(account.account_name) && (
            <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
              {account.signals.map((sig) => (
                <div key={sig.id} className="p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">
                      {new Date(sig.signal_date).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded ${
                        sig.source === 'pylon' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
                      }`}
                    >
                      {sig.source}
                    </span>
                    <span className="font-medium text-gray-800">{sig.feature_request}</span>
                  </div>
                  {sig.verbatim_quote && (
                    <p className="text-xs text-gray-500 italic pl-2 border-l-2 border-gray-300">
                      &ldquo;{sig.verbatim_quote}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
