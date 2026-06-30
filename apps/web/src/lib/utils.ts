import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return DATE_FORMATTER.format(d)
}

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
]

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelativeTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const elapsed = d.getTime() - Date.now()

  for (const { unit, ms } of UNITS) {
    if (Math.abs(elapsed) >= ms || unit === 'minute') {
      return RTF.format(Math.round(elapsed / ms), unit)
    }
  }
  return 'just now'
}

export interface BadgeColors {
  color: string
  background: string
}

export function getStageBadgeColor(stageType: string): BadgeColors {
  switch (stageType) {
    case 'application':
      return { color: 'var(--muted-foreground)', background: 'var(--muted)' }
    case 'screening':
      return { color: 'var(--blue)', background: 'rgba(59,130,246,0.12)' }
    case 'interview':
      return { color: 'var(--purple)', background: 'rgba(139,92,246,0.12)' }
    case 'assessment':
      return { color: 'var(--yellow)', background: 'rgba(234,179,8,0.12)' }
    case 'offer':
      return { color: 'var(--green)', background: 'rgba(34,197,94,0.12)' }
    case 'hired':
      return { color: 'var(--green)', background: 'rgba(34,197,94,0.2)' }
    case 'rejected':
      return { color: 'var(--red)', background: 'rgba(239,68,68,0.12)' }
    default:
      return { color: 'var(--muted-foreground)', background: 'var(--muted)' }
  }
}

export function getSourceBadgeColor(source: string): BadgeColors {
  switch (source) {
    case 'sourced':
      return { color: 'var(--purple)', background: 'rgba(139,92,246,0.12)' }
    case 'referral':
      return { color: 'var(--blue)', background: 'rgba(59,130,246,0.12)' }
    case 'career_page':
      return { color: 'var(--muted-foreground)', background: 'var(--muted)' }
    case 'linkedin':
      return { color: '#60a5fa', background: 'rgba(10,102,194,0.15)' }
    case 'agency':
      return { color: 'var(--yellow)', background: 'rgba(234,179,8,0.12)' }
    default:
      return { color: 'var(--muted-foreground)', background: 'var(--muted)' }
  }
}

export function getStatusBadgeColor(status: string): BadgeColors {
  switch (status) {
    case 'open':
      return { color: 'var(--green)', background: 'rgba(34,197,94,0.12)' }
    case 'draft':
      return { color: 'var(--muted-foreground)', background: 'var(--muted)' }
    case 'paused':
      return { color: 'var(--yellow)', background: 'rgba(234,179,8,0.12)' }
    case 'closed':
      return { color: 'var(--red)', background: 'rgba(239,68,68,0.12)' }
    default:
      return { color: 'var(--muted-foreground)', background: 'var(--muted)' }
  }
}

export function getScoreBadgeColor(score: number): BadgeColors {
  if (score >= 80) return { color: 'var(--green)', background: 'rgba(34,197,94,0.12)' }
  if (score >= 60) return { color: 'var(--yellow)', background: 'rgba(234,179,8,0.12)' }
  return { color: 'var(--red)', background: 'rgba(239,68,68,0.12)' }
}
