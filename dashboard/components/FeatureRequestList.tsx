'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import type { FeatureRequest } from '@/lib/supabase'
import StatusBadge from './StatusBadge'
import { formatDistanceToNow } from 'date-fns'

type Props = {
  featureRequests: FeatureRequest[]
  onChange: (updated: FeatureRequest[]) => void
}

export default function FeatureRequestList({ featureRequests, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showBacklog, setShowBacklog] = useState(false)

  const ranked = featureRequests.filter((f) => f.rank !== null).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
  const backlog = featureRequests.filter((f) => f.rank === null).sort((a, b) => b.signal_count - a.signal_count)

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const reordered = Array.from(ranked)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)

    const updated = reordered.map((fr, i) => ({ ...fr, rank: i + 1 }))

    // Optimistic update
    const newAll = [...updated, ...backlog]
    onChange(newAll)

    // Persist
    await Promise.all(
      updated.map((fr) =>
        fetch(`/api/feature-requests/${fr.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rank: fr.rank }),
        })
      )
    )
  }

  const handleStatusChange = async (id: string, status: string) => {
    const updated = featureRequests.map((fr) => (fr.id === id ? { ...fr, status: status as FeatureRequest['status'] } : fr))
    onChange(updated)
    await fetch(`/api/feature-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  const handleTitleSave = async (id: string) => {
    if (!editTitle.trim()) return
    const updated = featureRequests.map((fr) => (fr.id === id ? { ...fr, title: editTitle } : fr))
    onChange(updated)
    setEditingId(null)
    await fetch(`/api/feature-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle }),
    })
  }

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="top10">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {ranked.map((fr, index) => (
                <Draggable key={fr.id} draggableId={fr.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white rounded-lg border p-3 flex items-center gap-3 transition-shadow ${
                        snapshot.isDragging ? 'shadow-lg border-indigo-300' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div {...provided.dragHandleProps} className="text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="3" y="3" width="3" height="3" rx="1" />
                          <rect x="10" y="3" width="3" height="3" rx="1" />
                          <rect x="3" y="9" width="3" height="3" rx="1" />
                          <rect x="10" y="9" width="3" height="3" rx="1" />
                        </svg>
                      </div>

                      <span className="text-sm font-bold text-gray-400 w-5 flex-shrink-0">#{fr.rank}</span>

                      <div className="flex-1 min-w-0">
                        {editingId === fr.id ? (
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleTitleSave(fr.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleTitleSave(fr.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="w-full text-sm font-medium border-b border-indigo-400 outline-none bg-transparent"
                          />
                        ) : (
                          <span
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600 truncate block"
                            onClick={() => {
                              setEditingId(fr.id)
                              setEditTitle(fr.title)
                            }}
                          >
                            {fr.title}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge status={fr.status} onChange={(s) => handleStatusChange(fr.id, s)} />
                        <span className="text-xs text-gray-500">{fr.signal_count} signals</span>
                        <span className="text-xs text-gray-400">{fr.account_count} accounts</span>
                        {fr.last_signal_at && (
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(fr.last_signal_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {backlog.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowBacklog(!showBacklog)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <span className={`transition-transform ${showBacklog ? 'rotate-90' : ''}`}>▶</span>
            Backlog ({backlog.length} items)
          </button>

          {showBacklog && (
            <div className="mt-2 space-y-1">
              {backlog.map((fr) => (
                <div key={fr.id} className="bg-gray-50 rounded border border-gray-200 p-2.5 flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700">{fr.title}</span>
                  <StatusBadge status={fr.status} onChange={(s) => handleStatusChange(fr.id, s)} />
                  <span className="text-xs text-gray-400">{fr.signal_count} signals</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {featureRequests.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No signals yet. Click Refresh Now to pull data from Pylon and Demodesk.</p>
        </div>
      )}
    </div>
  )
}
