'use client'

import { useState } from 'react'

type Props = {
  onRefreshComplete: () => void
  onProgressUpdate?: (step: string) => void
}

export default function RefreshButton({ onRefreshComplete, onProgressUpdate }: Props) {
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    onProgressUpdate?.('Initiating refresh...')

    const steps = [
      'Fetching Pylon data...',
      'Fetching Demodesk recordings...',
      'Analyzing transcripts with AI...',
      'Generating insights...',
    ]

    let stepIndex = 0
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        onProgressUpdate?.(steps[stepIndex++])
      }
    }, 3000)

    try {
      await fetch('/api/refresh', { method: 'POST' })
      onRefreshComplete()
    } finally {
      clearInterval(stepInterval)
      setLoading(false)
      onProgressUpdate?.('')
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          Refreshing...
        </span>
      ) : (
        'Refresh Now'
      )}
    </button>
  )
}
