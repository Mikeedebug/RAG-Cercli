import type { Metadata } from 'next'
import { Search, Users, SlidersHorizontal } from 'lucide-react'

export const metadata: Metadata = { title: 'Candidates' }

export default function CandidatesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>Candidates</h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            <Search size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
            <input type="text" placeholder="Search by name, role, company, skills…" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--foreground)', fontSize: '13.5px', width: '100%' }} />
          </div>
          {['Source', 'Stage', 'Location', 'Tags'].map((f) => (
            <button key={f} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--muted-foreground)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{f}</button>
          ))}
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--muted-foreground)', fontSize: '13px', cursor: 'pointer' }}><SlidersHorizontal size={13} />Filters</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 100px 80px 120px', padding: '8px 16px', background: 'var(--muted)', borderBottom: '1px solid var(--border)', gap: '0' }}>
            {['Name', 'Current Role', 'Location', 'Source', 'Apps', 'Last Activity'].map((col) => (
              <span key={col} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{col}</span>
            ))}
          </div>
          <div style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'var(--card)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)' }}>No candidates yet</p>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Candidates added to your roles will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
