'use client'

const STATUS_STYLES: Record<string, string> = {
  under_review: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  shipped: 'Shipped',
  rejected: 'Rejected',
}

const STATUSES = ['under_review', 'planned', 'in_progress', 'shipped', 'rejected']

type Props = {
  status: string
  onChange?: (status: string) => void
}

export default function StatusBadge({ status, onChange }: Props) {
  if (!onChange) {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {STATUS_LABELS[status] ?? status}
      </span>
    )
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer border-0 outline-none ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  )
}
