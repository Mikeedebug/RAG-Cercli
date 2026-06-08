'use client'

import type { InsightCard as InsightCardType } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

const SOURCE_LABEL: Record<string, string> = {
  pylon: 'Support ticket',
  demodesk: 'Sales call',
}

type Props = {
  card: InsightCardType
  onAction: (id: string, action: 'approved' | 'dismissed' | 'snoozed') => void
  dimmed?: boolean
}

export default function InsightCard({ card, onAction, dimmed }: Props) {
  const sourceLabel = SOURCE_LABEL[(card as { source?: string }).source ?? ''] ?? 'Signal'
  const isActed = card.status !== 'pending'

  return (
    <div
      className={`rounded-lg border p-4 transition-opacity ${
        isActed ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
      } ${dimmed ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
          {card.related_account ?? 'Unknown account'}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatDistanceToNow(new Date(card.created_at), { addSuffix: true })}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h4>

      {card.body && (
        <p className="text-xs text-gray-500 italic mb-3 line-clamp-2">
          &ldquo;{card.body}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{sourceLabel}</span>

        {!isActed ? (
          <div className="flex gap-2">
            <button
              onClick={() => onAction(card.id, 'approved')}
              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 transition-colors"
            >
              Add to FR list
            </button>
            <button
              onClick={() => onAction(card.id, 'dismissed')}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <span className={`text-xs font-medium ${
            card.status === 'approved' ? 'text-green-600' : 'text-gray-400'
          }`}>
            {card.status === 'approved' ? 'Added' : 'Dismissed'}
          </span>
        )}
      </div>
    </div>
  )
}
