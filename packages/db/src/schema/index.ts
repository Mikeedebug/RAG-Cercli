/**
 * Central schema barrel. Import from '@ats/db/schema' to get all tables,
 * enums, types, and relations for use in queries and migrations.
 */

// ─── Organization & Users ─────────────────────────────────────────────────────
export {
  orgPlanEnum,
  userRoleEnum,
  organizations,
  users,
  organizationsRelations,
  usersRelations,
} from './organization'

export type { Organization, NewOrganization, User, NewUser } from './organization'

// ─── Roles & Pipelines ────────────────────────────────────────────────────────
export {
  roleStatusEnum,
  employmentTypeEnum,
  stageTypeEnum,
  pipelineTemplates,
  roles,
  pipelineStages,
  pipelineTemplatesRelations,
  rolesRelations,
  pipelineStagesRelations,
} from './roles'

export type {
  PipelineTemplate,
  NewPipelineTemplate,
  Role,
  NewRole,
  PipelineStage,
  NewPipelineStage,
} from './roles'

// ─── Candidates ───────────────────────────────────────────────────────────────
export {
  vector,
  candidateSourceEnum,
  gdprLawfulBasisEnum,
  candidates,
  candidatesRelations,
} from './candidates'

export type { Candidate, NewCandidate } from './candidates'

// ─── Applications ─────────────────────────────────────────────────────────────
export {
  applicationStatusEnum,
  actorTypeEnum,
  applications,
  stageTransitions,
  applicationsRelations,
  stageTransitionsRelations,
} from './applications'

export type {
  Application,
  NewApplication,
  StageTransition,
  NewStageTransition,
} from './applications'

// ─── Events ───────────────────────────────────────────────────────────────────
export {
  eventActorTypeEnum,
  events,
} from './events'

export type {
  Event,
  NewEvent,
  ApplicationStageChangedPayload,
  CandidateCreatedPayload,
  RolePublishedPayload,
  AgentScreeningCompletedPayload,
} from './events'

// ─── Agent ────────────────────────────────────────────────────────────────────
export {
  memoryScopeEnum,
  agentSessions,
  agentMemory,
  agentSessionsRelations,
  agentMemoryRelations,
} from './agent'

export type {
  AgentSession,
  NewAgentSession,
  AgentMemory,
  NewAgentMemory,
} from './agent'
