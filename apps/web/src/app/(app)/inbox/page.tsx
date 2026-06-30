import type { Metadata } from 'next'
import { AlertTriangle, Clock, Zap } from 'lucide-react'

export const metadata: Metadata = { title: 'Inbox' }

const recentActivity: {
  id: string
  type: 'application' | 'stage_change' | 'note' | 'sla_breach'
  candidate: string
  role: string
  detail: string
  time: string
}[] = []

export default function InboxPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '20px 28px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--foreground)',
              letterSpacing: '-0.02em',
            }}
          >
            Inbox
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
            Items requiring your attention
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'var(--muted)',
            borderRadius: '20px',
            fontSize: '12px',
            color: 'var(--muted-foreground)',
          }}
        >
          <Clock size={11} />
          All caught up
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <section style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <AlertTriangle size={13} style={{ color: 'var(--red)' }} />
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--foreground)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              SLA Breaches
            </h2>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--muted-foreground)',
                background: 'var(--muted)',
                padding: '1px 7px',
                borderRadius: '20px',
              }}
            >
              0
            </span>
          </div>

          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '32px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--card)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', textAlign: 'center' }}>
              No SLA breaches — all candidates are within stage time limits.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '80px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <Zap size={13} style={{ color: 'var(--yellow)' }} />
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--foreground)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Recent Activity
            </h2>
          </div>

          {recentActivity.length === 0 ? (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '32px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--card)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={16} style={{ color: 'var(--muted-foreground)' }} />
              </div>
              <p
                style={{ fontSize: '13px', color: 'var(--muted-foreground)', textAlign: 'center' }}
              >
                Activity from your open roles will appear here.
              </p>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'var(--card)',
              }}
            >
              {recentActivity.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : undefined,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                      {item.candidate}
                    </span>
                    <span style={{ color: 'var(--muted-foreground)' }}> · {item.detail}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          padding: '12px 28px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: 'var(--input)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'text',
          }}
          title="Agent copilot — available in Slice 3"
        >
          <Zap size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '13.5px', color: 'var(--muted-foreground)' }}>
            What do you want to do?
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: 'var(--muted-foreground)',
              background: 'var(--muted)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            ⌘K
          </span>
        </div>
      </div>
    </div>
  )
}
