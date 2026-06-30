'use client'

import { AlertTriangle } from 'lucide-react'
import { getStageBadgeColor, getScoreBadgeColor } from '@/lib/utils'

export interface Stage {
  id: string
  name: string
  type: string
  sla_hours: number
  order: number
}

export interface Application {
  id: string
  candidate_id: string
  candidate_name: string
  candidate_title: string
  stage_id: string
  screening_score?: number
  time_in_stage_hours: number
}

interface KanbanBoardProps {
  stages: Stage[]
  applications: Application[]
}

function CandidateCard({
  application,
  stage,
}: {
  application: Application
  stage: Stage
}) {
  const slaBreached = application.time_in_stage_hours > stage.sla_hours
  const slaWarning =
    !slaBreached && application.time_in_stage_hours > stage.sla_hours * 0.75

  const daysInStage = Math.floor(application.time_in_stage_hours / 24)
  const hoursInStage = application.time_in_stage_hours % 24

  const timeLabel =
    daysInStage > 0
      ? `${daysInStage}d ${hoursInStage}h`
      : `${application.time_in_stage_hours}h`

  const scoreColors =
    application.screening_score !== undefined
      ? getScoreBadgeColor(application.screening_score)
      : null

  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--card)',
        border: `1px solid ${slaBreached ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
        borderRadius: '7px',
        marginBottom: '6px',
        cursor: 'pointer',
        transition: 'border-color 0.1s',
      }}
      tabIndex={0}
      role="button"
      aria-label={`${application.candidate_name} — ${stage.name}`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 500,
              fontSize: '13px',
              color: 'var(--foreground)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {application.candidate_name}
          </div>
          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--muted-foreground)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '2px',
            }}
          >
            {application.candidate_title}
          </div>
        </div>

        {scoreColors && application.screening_score !== undefined && (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              color: scoreColors.color,
              background: scoreColors.background,
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {application.screening_score}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        {slaBreached ? (
          <AlertTriangle
            size={11}
            style={{ color: 'var(--red)', flexShrink: 0 }}
            aria-label="SLA breached"
          />
        ) : slaWarning ? (
          <AlertTriangle
            size={11}
            style={{ color: 'var(--yellow)', flexShrink: 0 }}
            aria-label="SLA warning"
          />
        ) : null}
        <span
          style={{
            fontSize: '11px',
            color: slaBreached
              ? 'var(--red)'
              : slaWarning
                ? 'var(--yellow)'
                : 'var(--muted-foreground)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timeLabel}
          {slaBreached ? ' · SLA breached' : slaWarning ? ' · SLA warning' : ''}
        </span>
      </div>
    </div>
  )
}

export function KanbanBoard({ stages, applications }: KanbanBoardProps) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        height: '100%',
        overflowX: 'auto',
        paddingBottom: '12px',
      }}
    >
      {sortedStages.map((stage) => {
        const stageApps = applications.filter((a) => a.stage_id === stage.id)
        const colors = getStageBadgeColor(stage.type)

        return (
          <div
            key={stage.id}
            style={{
              width: '240px',
              minWidth: '240px',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 12px 8px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colors.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {stage.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--muted-foreground)',
                  fontVariantNumeric: 'tabular-nums',
                  background: 'var(--muted)',
                  padding: '1px 7px',
                  borderRadius: '20px',
                }}
              >
                {stageApps.length}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                padding: '8px',
                overflowY: 'auto',
              }}
            >
              {stageApps.length === 0 ? (
                <div
                  style={{
                    padding: '24px 8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  No candidates
                </div>
              ) : (
                stageApps.map((app) => (
                  <CandidateCard key={app.id} application={app} stage={stage} />
                ))
              )}
            </div>

            <div
              style={{
                padding: '6px 12px',
                borderTop: '1px solid var(--border)',
                fontSize: '11px',
                color: 'var(--muted-foreground)',
              }}
            >
              SLA: {stage.sla_hours >= 24 ? `${stage.sla_hours / 24}d` : `${stage.sla_hours}h`}
            </div>
          </div>
        )
      })}
    </div>
  )
}
