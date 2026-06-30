import Link from 'next/link'
import { Inbox, Briefcase, Users, BarChart2, Settings, ChevronDown } from 'lucide-react'

const navItems = [
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/roles', label: 'Roles', icon: Briefcase },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--background)',
      }}
    >
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <div
          style={{
            padding: '18px 16px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              background: 'var(--primary)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="2" fill="white" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--foreground)',
              letterSpacing: '-0.01em',
            }}
          >
            Recruit
          </span>
        </div>

        <nav style={{ flex: 1, padding: '8px 8px' }}>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '6px',
                color: 'var(--muted-foreground)',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: 500,
                transition: 'background 0.1s, color 0.1s',
                marginBottom: '2px',
              }}
              className="nav-item"
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        <div
          style={{
            padding: '12px 8px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--foreground)',
              width: '100%',
              cursor: 'pointer',
              fontSize: '13.5px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: 'white',
                flexShrink: 0,
              }}
            >
              MQ
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Miquel Q.
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--muted-foreground)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                miquel@cercli.com
              </div>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          </button>
          <Link
            href="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '6px',
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: 500,
              marginTop: '2px',
            }}
            className="nav-item"
          >
            <Settings size={15} strokeWidth={1.75} />
            Settings
          </Link>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>

      <style>{`
        .nav-item:hover {
          background: var(--muted);
          color: var(--foreground);
        }
        .nav-item:focus-visible {
          outline: 2px solid var(--ring);
          outline-offset: -2px;
        }
      `}</style>
    </div>
  )
}
