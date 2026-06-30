import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, MapPin, Linkedin, Globe, Github, FileText, Clock, MessageSquare, Paperclip } from 'lucide-react'

export const metadata: Metadata = { title: 'Candidate Profile' }

const CANDIDATE = {
  id: 'c1',
  name: 'Sarah Chen',
  currentTitle: 'Senior Product Designer',
  currentCompany: 'Figma',
  location: 'San Francisco, CA',
  email: 'sarah.chen@example.com',
  linkedin: 'linkedin.com/in/sarahchen',
  github: 'github.com/sarahchen',
  website: 'sarahchen.design',
  applications: [
    { id: 'a1', role: 'Head of Design', stage: 'Final Interview', stageColor: 'var(--blue)', appliedAt: '2 days ago' },
  ],
  timeline: [] as { id: string; type: string; description: string; author: string; time: string }[],
  documents: [] as { id: string; name: string; size: string; uploadedAt: string }[],
  notes: [] as { id: string; body: string; author: string; createdAt: string }[],
}

function Section({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ color: 'var(--muted-foreground)' }}>{icon}</span>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function EmptyCard({ message }: { message: string }) {
  return <div style={{ padding: '20px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--muted-foreground)', textAlign: 'center' }}>{message}</div>
}

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 28px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <Link href="/candidates" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: '12px', marginBottom: '12px' }}><ChevronLeft size={13} />Candidates</Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
            {CANDIDATE.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>{CANDIDATE.name}</h1>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>{CANDIDATE.currentTitle} at {CANDIDATE.currentCompany}</p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-foreground)' }}><MapPin size={12} />{CANDIDATE.location}</span>
              {CANDIDATE.linkedin && <a href={`https://${CANDIDATE.linkedin}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-foreground)', textDecoration: 'none' }}><Linkedin size={12} />LinkedIn</a>}
              {CANDIDATE.github && <a href={`https://${CANDIDATE.github}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-foreground)', textDecoration: 'none' }}><Github size={12} />GitHub</a>}
              {CANDIDATE.website && <a href={`https://${CANDIDATE.website}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-foreground)', textDecoration: 'none' }}><Globe size={12} />Website</a>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Send email</button>
            <button style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Add to role</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: '760px' }}>
          <Section title="Active Applications" icon={<FileText size={13} />}>
            {CANDIDATE.applications.length === 0 ? <EmptyCard message="No active applications." /> : (
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {CANDIDATE.applications.map((app, i) => (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < CANDIDATE.applications.length - 1 ? '1px solid var(--border)' : undefined, background: 'var(--card)' }}>
                    <span style={{ fontWeight: 500, color: 'var(--foreground)', fontSize: '13.5px' }}>{app.role}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, color: app.stageColor, background: `${app.stageColor}1a` }}>{app.stage}</span>
                      <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{app.appliedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Timeline" icon={<Clock size={13} />}>
            {CANDIDATE.timeline.length === 0 ? <EmptyCard message="Events and stage changes will appear here." /> : null}
          </Section>

          <Section title="Documents" icon={<Paperclip size={13} />} action={<button style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', fontSize: '12px', cursor: 'pointer' }}>Upload</button>}>
            {CANDIDATE.documents.length === 0 ? <EmptyCard message="No documents uploaded." /> : null}
          </Section>

          <Section title="Notes" icon={<MessageSquare size={13} />} action={<button style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', fontSize: '12px', cursor: 'pointer' }}>Add note</button>}>
            {CANDIDATE.notes.length === 0 ? <EmptyCard message="No notes yet." /> : null}
          </Section>
        </div>
      </div>
    </div>
  )
}
