'use client'

import { useState, useEffect, useCallback } from 'react'
import type { FeatureRequest, InsightCard } from '../lib/supabase'
import FeatureRequestList from '../components/FeatureRequestList'
import InsightFeed from '../components/InsightFeed'
import AccountView from '../components/AccountView'
import RefreshButton from '../components/RefreshButton'
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
  top_requests: { id: string; title: string; status: string }[]
}

type DashboardData = {
  feature_requests: FeatureRequest[]
  insight_cards: InsightCard[]
  accounts: AccountData[]
  last_refresh: { completed_at: string | null; status: string } | null
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshProgress, setRefreshProgress] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleProgressUpdate = (step: string) => {
    setRefreshProgress(step)
    setIsRefreshing(!!step)
  }

  const handleInsightAction = async (id: string, action: 'approved' | 'dismissed' | 'snoozed') => {
    const snoozeUntil =
      action === 'snoozed' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined

    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        insight_cards: prev.insight_cards.map((c) =>
          c.id === id ? { ...c, status: action, acted_at: new Date().toISOString() } : c
        ),
      }
    })

    await fetch(`/api/insight-cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, snoozed_until: snoozeUntil }),
    })
  }

  const pendingCount = data?.insight_cards.filter((c) => c.status === 'pending').length ?? 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center max-w-sm w-full mx-4">
            <div className="animate-spin h-10 w-10 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" style={{ borderWidth: 3, borderStyle: 'solid' }} />
            <p className="text-gray-700 font-medium">{refreshProgress || 'Refreshing...'}</p>
            <p className="text-xs text-gray-400 mt-2">This may take a minute</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Cercli Feature Radar</h1>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {data?.last_refresh?.completed_at ? (
              <span className="text-sm text-gray-500">
                Last refreshed {formatDistanceToNow(new Date(data.last_refresh.completed_at), { addSuffix: true })}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Never refreshed</span>
            )}
            <RefreshButton
              onRefreshComplete={fetchDashboard}
              onProgressUpdate={handleProgressUpdate}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-5 gap-6 mb-6">
          <div className="col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Top Feature Requests
              </h2>
              <FeatureRequestList
                featureRequests={data?.feature_requests ?? []}
                onChange={(updated) =>
                  setData((prev) => (prev ? { ...prev, feature_requests: updated } : prev))
                }
              />
            </div>
          </div>

          <div className="col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Insight Feed
              </h2>
              <InsightFeed cards={data?.insight_cards ?? []} onAction={handleInsightAction} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Account View
          </h2>
          <AccountView accounts={data?.accounts ?? []} />
        </div>
      </main>
    </div>
  )
}
