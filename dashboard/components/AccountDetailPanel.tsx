'use client'

import { useState, useEffect } from 'react'
import type { InsightCard } from '../lib/supabase'

type FR = { id: string; title: string; status: string; source: string; signal_date: string | null }

type AccountData = {
  account_name: string
  domain?: string
  pylon_id?: string
  tier?: string
  acv?: number
  signal_count: number
  pending_insights: number
  total_activity: number
  sources: string[]
  last_activity: string | null
  feature_requests: FR[]
}

type Props = {
  account: AccountData | null
  insightCards: InsightCard[]
  onClose: () => void
  onAction: (id: string, action: 'approved' | 'dismissed' | 'snoozed') => void
}

const STATUS_OPTIONS = [
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'shipped', label: 'Shipped', color: 'bg-green-100 text-green-700' },
  { value: 'wont_do', label: "Won't Do", color: 'bg-gray-100 text-gray-500' },
]

function formatACV(acv: number): string {
  return '$' + acv.toLocaleString('en-US')
}

export default function AccountDetailPanel({ account, insightCards, onClose, onAction }: Props) {
  const [frStatuses, setFRStatuses] = useState<Record<string, string>>({})

  // Reset local FR statuses when account changes
  useEffect(() => {
    if (account) {
      const initial: Record<string, string> = {}
      for (const fr of account.feature_requests) {
        initial[fr.id] = fr.status
      }
      setFRStatuses(initial)
    }
  }, [account])

  const isOpen = account !== null

  const pendingInsights = isOpen
    ? insightCards.filter(
        (c) => c.status === 'pending' && c.related_account === account!.account_name
      )
    : []

  const updateFRStatus = async (fr: FR, newStatus: string) => {
    setFRStatuses((prev) => ({ ...prev, [fr.id]: newStatus }))
    if (fr.id) {
      await fetch(`/api/feature-requests/${fr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {account && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{account.account_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {account.tier && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {account.tier}
                    </span>
                  )}
                  {account.acv != null && (
                    <span className="text-sm text-gray-500">{formatACV(account.acv)}</span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-8">
              {/* Section 1: Pending Insights */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pending Insights
                </h3>
                {pendingInsights.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No pending insights</p>
                ) : (
                  <div className="space-y-3">
                    {pendingInsights.map((card) => {
                      const isCall = card.source === 'demodesk'
                      return (
                        <div key={card.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                isCall
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {isCall ? 'Meeting call' : 'Slack'}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">{card.title}</p>
                          <p className="text-sm text-gray-500 italic mb-3">{card.body}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onAction(card.id, 'approved')}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                            >
                              Add to FR list
                            </button>
                            <button
                              onClick={() => onAction(card.id, 'dismissed')}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Section 2: Feature Requests */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Feature Requests
                </h3>
                {account.feature_requests.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No feature requests yet</p>
                ) : (
                  <div className="space-y-2">
                    {account.feature_requests.map((fr) => {
                      const isCall = fr.source === 'demodesk'
                      const currentStatus = frStatuses[fr.id] ?? fr.status
                      const statusOpt =
                        STATUS_OPTIONS.find((s) => s.value === currentStatus) ?? STATUS_OPTIONS[0]
                      return (
                        <div
                          key={fr.id || fr.title}
                          className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                        >
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                              isCall
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {isCall ? 'Meeting call' : 'Slack'}
                          </span>
                          <span className="text-sm text-gray-800 flex-1 leading-snug">{fr.title}</span>
                          <select
                            value={currentStatus}
                            onChange={(e) => updateFRStatus(fr, e.target.value)}
                            className={`text-xs rounded px-1.5 py-0.5 border-0 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300 flex-shrink-0 ${statusOpt.color}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  )
}
