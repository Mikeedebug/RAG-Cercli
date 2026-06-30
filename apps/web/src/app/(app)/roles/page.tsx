import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'

export const metadata: Metadata = { title: 'Roles' }

const TABS = ['All', 'Open', 'Draft', 'Paused', 'Closed'] as const

export default function RolesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '20px 28px 0',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--foreground)',
            }}
          >
            Roles
          </h1>
          <Link
            href="/roles/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'opacity 0.1s',
            }}
          >
            <Plus size={14} />
            New Role
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '0' }}>
          {TABS.map((tab) => (
            <Link
              key={tab}
              href={`/roles?tab=${tab.toLowerCase()}`}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: tab === 'All' ? 'var(--foreground)' : 'var(--muted-foreground)',
                textDecoration: 'none',
                borderBottom: tab === 'All' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 100px 80px 1fr 100px',
              gap: '0',
              padding: '8px 16px',
              background: 'var(--muted)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {['Title', 'Department', 'Location', 'Status', 'Applicants', 'Recruiter', 'Created'].map(
              (col) => (
                <span
                  key={col}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {col}
                </span>
              )
            )}
          </div>

          <div
            style={{
              padding: '48px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--card)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Briefcase size={18} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)' }}>
              No roles yet
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
              Create your first role to start tracking applicants.
            </p>
            <Link
              href="/roles/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                marginTop: '4px',
              }}
            >
              <Plus size={13} />
              Create a role
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
