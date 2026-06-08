'use client'

import type { InsightCard as InsightCardType } from '../lib/supabase'
import InsightCard from './InsightCard'

type Props = {
  cards: InsightCardType[]
  onAction: (id: string, action: 'approved' | 'dismissed' | 'snoozed') => void
}

export default function InsightFeed({ cards, onAction }: Props) {
  const pending = cards.filter((c) => c.status === 'pending')
  const acted = cards.filter((c) => c.status !== 'pending').slice(0, 5)

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        All caught up. Refresh to check for new signals.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pending.map((card) => (
        <InsightCard key={card.id} card={card} onAction={onAction} />
      ))}
      {acted.map((card) => (
        <InsightCard key={card.id} card={card} onAction={onAction} dimmed />
      ))}
    </div>
  )
}
