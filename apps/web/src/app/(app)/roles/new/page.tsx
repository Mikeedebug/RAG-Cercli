'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { createRole } from '@/lib/api'

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Sales', 'Marketing',
  'Customer Success', 'Finance', 'Legal', 'People & HR', 'Operations',
]

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary']

const PIPELINE_TEMPLATES = [
  { id: 'standard', label: 'Standard (Applied → Screen → Interview → Offer)' },
  { id: 'technical', label: 'Technical (Applied → Screen → Take-home → Interview → Offer)' },
  { id: 'exec', label: 'Executive (Applied → Screen → Panel → Board → Offer)' },
  { id: 'fast', label: 'Fast-track (Applied → Interview → Offer)' },
]

const HIRING_MANAGERS = [
  { id: 'u1', name: 'Miquel Q.' },
  { id: 'u2', name: 'Ana R.' },
  { id: 'u3', name: 'James T.' },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '0.02em' }}>
        {label}
        {required && <span style={{ color: 'var(--red)', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '8px 12px',
  background: 'var(--input)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--foreground)',
  fontSize: '13.5px',
  outline: 'none',
  width: '100%',
}

export default function NewRolePage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await createRole({
        title: fd.get('title') as string,
        department: fd.get('department') as string,
        location: fd.get('location') as string,
        employment_type: fd.get('employment_type') as string,
        hiring_manager_id: fd.get('hiring_manager_id') as string,
        pipeline_template: fd.get('pipeline_template') as string,
      })
      window.location.href = '/roles'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 28px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <Link
          href="/roles"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: '12px', marginBottom: '10px' }}
        >
          <ChevronLeft size={13} />
          Roles
        </Link>
        <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>New Role</h1>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Field label="Job Title" required>
            <input name="title" type="text" placeholder="e.g. Senior Frontend Engineer" required style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Department" required>
              <select name="department" required style={inputStyle}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d.toLowerCase().replace(/[^a-z]/g, '_')}>{d}</option>)}
              </select>
            </Field>
            <Field label="Employment Type" required>
              <select name="employment_type" required style={inputStyle}>
                <option value="">Select type</option>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t.toLowerCase().replace('-', '_')}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Location" required>
            <input name="location" type="text" placeholder="e.g. Remote · EU, London, New York" required style={inputStyle} />
          </Field>

          <Field label="Hiring Manager">
            <select name="hiring_manager_id" style={inputStyle}>
              <option value="">Unassigned</option>
              {HIRING_MANAGERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>

          <Field label="Pipeline Template" required>
            <select name="pipeline_template" required style={inputStyle}>
              <option value="">Select template</option>
              {PIPELINE_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="submit" disabled={submitting} style={{ padding: '9px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13.5px', fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Creating…' : 'Create Role'}
            </button>
            <Link href="/roles" style={{ padding: '9px 20px', background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13.5px', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
