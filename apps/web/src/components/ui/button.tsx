import { cn } from '@/lib/utils'

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  default: {
    background: 'var(--primary)',
    color: 'var(--primary-foreground)',
    border: 'none',
  },
  destructive: {
    background: 'var(--red)',
    color: '#fff',
    border: 'none',
  },
  outline: {
    background: 'transparent',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--foreground)',
    border: 'none',
  },
  link: {
    background: 'transparent',
    color: 'var(--primary)',
    border: 'none',
    textDecoration: 'underline',
    padding: '0',
  },
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: '12px', borderRadius: '5px' },
  md: { padding: '7px 14px', fontSize: '13px', borderRadius: '6px' },
  lg: { padding: '10px 20px', fontSize: '14px', borderRadius: '7px' },
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  style,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(className)}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.1s, background 0.1s',
        fontFamily: 'inherit',
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
