import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, MapPin, Building2 } from 'lucide-react'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import type { Stage, Application } from '@/components/pipeline/KanbanBoard'

export const metadata: Metadata = { title: 'Role Detail' }

const DEMO_STAGES: Stage[] = [
  { id: 's1', name: 'Applied', type: 'application', sla_hours: 48, order: 0 },
  { id: 's2', name: 'Screening', type: 'screening', sla_hours: 72, order: 1 },
  { id: 's3', name: 'Interview', type: 'interview', sla_hours: 96, order: 2 },
  { id: 's4', name: 'Offer', type: 'offer', sla_hours: 48, order: 3 },
]

const DEMO_APPS: Application[] = []

const SUB_NAV = ['Pipeline', 'Details', 'Communications', 'Analytics']

export default function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 28px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <Link href="/roles" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: '12px', marginBottom: '10px' }}>
          <ChevronLeft size={13} />
          Roles
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>Senior Frontend Engineer</h1>
              <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: 'var(--green)', background: 'rgba(34,197,94,0.12)', letterSpacing: '0.02em' }}>OPEN</span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-foreground)' }}><Building2 size={12} />Engineering</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-foreground)' }}><MapPin size={12} />Remote · EU</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Edit</button>
            <button style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Add Candidate</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0' }}>
          {SUB_NAV.map((item) => (
            <button key={item} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 500, color: item === 'Pipeline' ? 'var(--foreground)' : 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: item === 'Pipeline' ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-1px' }}>{item}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <KanbanBoard stages={DEMO_STAGES} applications={DEMO_APPS} />
      </div>
    </div>
  )
}
