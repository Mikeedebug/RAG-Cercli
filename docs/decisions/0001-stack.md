# ADR 0001: Technology Stack

## Status: Accepted

## Context
Building a production-grade, AI-native ATS from scratch. Primary constraints: event-sourced state, single canonical candidate object, AI copilot as substrate not feature.

## Decisions

### Frontend: Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind + shadcn/ui
Rationale: App Router enables per-route streaming (critical for agent token streaming). React 19 concurrent features improve perceived latency. shadcn/ui gives unstyled-but-accessible primitives we can theme aggressively. TanStack Query for server state, Zustand for ephemeral client state.

### Backend: Node 20 + Hono
Rationale: Hono is lightweight (~15kb), has first-class TypeScript support, edge-ready, and its middleware model maps cleanly to our auth/audit/rate-limit concerns. Fastify is the alternative if we hit Hono limitations.

### Database: Postgres 16 + pgvector + Drizzle ORM
Rationale: pgvector eliminates a separate vector DB for the embedding search use case. Drizzle chosen over Prisma for its SQL-close abstraction (no N+1 footguns, explicit joins), better TypeScript inference, and migration control. Neon for managed Postgres (serverless connection pooling, branching for dev).

### Queue: Redis + BullMQ
Rationale: BullMQ is battle-tested, has repeatable jobs, rate limiting built-in, and is observable. Redis is already needed for session cache.

### Auth: Clerk (Slice 1–3), migrate to WorkOS for enterprise SSO
Rationale: Clerk ships auth UI and session management in hours. WorkOS is the right long-term choice for enterprise directory sync + SAML, but adds ops overhead. Plan: abstract behind an auth interface from day one so the swap is mechanical.

### LLM: Anthropic API
- Sonnet 4.6: default copilot model
- Haiku 4.5: CV parsing, intent classification, inline screening pass 1
- Opus 4.7: heavy reasoning (JD drafting, full-pipeline calibration, multi-candidate comparison)
Prompt caching enabled. Streaming enabled. Provider abstracted behind internal LLM interface.

### Embeddings: Voyage AI (voyage-3-large) initially; swap to Anthropic when available
Rationale: voyage-3-large scores best on retrieval benchmarks for professional text. Abstracted behind EmbeddingProvider interface.

### Storage: Cloudflare R2 (S3-compatible)
Rationale: No egress fees. S3-compatible SDK. Sufficient for CV/document storage.

### Observability: OpenTelemetry + Sentry + PostHog + Helicone
- OTEL traces on all services
- Sentry for error capture
- PostHog for product analytics
- Helicone as LLM observability proxy (zero-code LLM call inspection)

### Calendar/Email: Nylas (start), direct Google + Microsoft Graph (later)
Rationale: Nylas unifies both providers under one API, faster to ship. Migration path to direct APIs when volume justifies it.

### Deployment: Vercel (web), Railway (api + agent + worker), Neon (postgres)
