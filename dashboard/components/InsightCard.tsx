'use client'

import type { InsightCard as InsightCardType } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  new_signal: { label: 'New Signal', color: 'bg-yellow-50 border-yellow-200', dot: '🟡' },
  cluster_forming: { label: 'Cluster Forming', color: 'bg-red-50 border-red-200', dot: '🔴' },
  rank_suggestion: { label: 'Rank Suggestion', color: 'bg-blue-50 border-blue-200', dot: '🔵' },
  status_update: { label: 'Status Update', color: 'bg-gray-50 border-gray-200', dot: '⚪' },
}

type Props = {
  card: InsightCardType
  onAction: (id: string, action: 'approved' | 'dismissed' | 'snoozed') => void
  dimmed?: boolean
}

export default function InsightCard({ card, onAction, dimmed }: Props) {
  const config = TYPE_CONFIG[card.type] ?? TYPE_CONFIG.status_update

  return (
    <div
      className={`rounded-lg border p-4 transition-opacity ${config.color} ${dimmed ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{config.dot}</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{config.label}</span>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatDistanceToNow(new Date(card.created_at), { addSuffix: true })}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h4>
      <p className="text-sm text-gray-700 mb-2">{card.body}</p>

      {card.action && (
        <p className="text-xs italic text-gray-500 mb-3">Suggested: {card.action}</p>
      )}

      {card.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(card.id, 'approved')}
            className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onAction(card.id, 'dismissed')}
            className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => onAction(card.id, 'snoozed')}
            className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300 transition-colors"
          >
            Snooze 7d
          </button>
        </div>
      )}
    </div>
  )
}
