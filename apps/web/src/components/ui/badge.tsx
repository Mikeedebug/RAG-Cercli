import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'default'
  | 'outline'
  | 'sourced'
  | 'referral'
  | 'breach'
  | 'open'
  | 'draft'
  | 'paused'
  | 'closed'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  style?: React.CSSProperties
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    color: 'var(--foreground)',
    background: 'var(--muted)',
  },
  outline: {
    color: 'var(--foreground)',
    background: 'transparent',
    border: '1px solid var(--border)',
  },
  sourced: {
    color: 'var(--purple)',
    background: 'rgba(139,92,246,0.12)',
  },
  referral: {
    color: 'var(--blue)',
    background: 'rgba(59,130,246,0.12)',
  },
  breach: {
    color: 'var(--red)',
    background: 'rgba(239,68,68,0.12)',
  },
  open: {
    color: 'var(--green)',
    background: 'rgba(34,197,94,0.12)',
  },
  draft: {
    color: 'var(--muted-foreground)',
    background: 'var(--muted)',
  },
  paused: {
    color: 'var(--yellow)',
    background: 'rgba(234,179,8,0.12)',
  },
  closed: {
    color: 'var(--red)',
    background: 'rgba(239,68,68,0.12)',
  },
}

export function Badge({
  children,
  variant = 'default',
  className,
  style,
}: BadgeProps) {
  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
