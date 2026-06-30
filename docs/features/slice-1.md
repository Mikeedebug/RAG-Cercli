# Slice 1: Auth, Org, Users, Roles, Candidates, Pipeline, Events

## What Was Built

Slice 1 delivers the foundational data model and API surface for a functioning ATS. Everything required to manage an organization's job openings, build a candidate pool, and track applications through a custom pipeline is in place.

### Packages

- **`packages/types`** — shared TypeScript enums and Zod-validated types for all entities (`EventType`, `Role`, `Candidate`, `Application`, etc.). Zero runtime dependencies.
- **`packages/db`** — Drizzle ORM schema, client, and the `writeEvent` helper. Tables: `organizations`, `users`, `roles`, `pipeline_templates`, `pipeline_stages`, `candidates`, `applications`, `stage_transitions`, `events`, `agent_sessions`, `agent_memory`.
- **`packages/llm`** — thin wrapper around the Anthropic SDK (`@anthropic-ai/sdk`). Exports a configured client, model constants, and shared LLM types. Not used in Slice 1 routes yet; present for Slice 3+.
- **`apps/api`** — Hono HTTP gateway (port 3001). Auth via Clerk JWT middleware; org/role scoped on every request.
- **`apps/web`** — Next.js 15 frontend (port 3000). Clerk `<ClerkProvider>`, TanStack Query, Zustand. Pages: candidates list/detail, roles list/new/detail with Kanban board.

### API Routes Delivered

| Method | Path | Description |
|--------|------|-------------|
| POST | `/organizations` | Create a new tenant (admin only) |
| GET | `/organizations/:id` | Get own organization |
| PATCH | `/organizations/:id` | Update branding/settings (admin only) |
| GET | `/users` | List org users |
| POST | `/users` | Invite user (admin only) |
| GET | `/users/:id` | Get user |
| PATCH | `/users/:id` | Update user role/permissions |
| DELETE | `/users/:id` | Deactivate user (admin only) |
| GET | `/roles` | List roles with filters |
| POST | `/roles` | Create role (draft) |
| GET | `/roles/:id` | Get role with pipeline stages |
| PATCH | `/roles/:id` | Update role fields |
| POST | `/roles/:id/publish` | Publish role (status → open) |
| POST | `/roles/:id/close` | Close role (filled or cancelled) |
| POST | `/roles/:id/pause` | Pause role |
| GET | `/candidates` | List/search candidates (paginated) |
| POST | `/candidates` | Create candidate with dedup check |
| GET | `/candidates/:id` | Get candidate with applications |
| PATCH | `/candidates/:id` | Update candidate profile |
| POST | `/candidates/merge` | Merge two candidate records |
| POST | `/applications` | Create application (candidate + role) |
| GET | `/applications/:id` | Get application with transition history |
| POST | `/applications/:id/advance` | Advance to next pipeline stage |
| POST | `/applications/:id/reject` | Reject application |
| POST | `/applications/:id/withdraw` | Withdraw application |
| PATCH | `/applications/:id` | Update recruiter/screening data |
| GET | `/pipeline-templates` | List pipeline templates |
| POST | `/pipeline-templates` | Create template |
| GET | `/pipeline-templates/:id` | Get template |
| PATCH | `/pipeline-templates/:id` | Update template |
| GET | `/events` | Query event log (filtered) |

---

## The Event Model

The `events` table is append-only. Every service mutation writes a row via `writeEvent()` from `packages/db/src/events.ts`. The function is the only authorized way to record state changes.

### Events Emitted in Slice 1

| Event type | Trigger | Payload fields |
|---|---|---|
| `organization.created` | POST `/organizations` | `name`, `subdomain` |
| `organization.updated` | PATCH `/organizations/:id` | `changed_fields[]` |
| `user.invited` | POST `/users` | `email`, `role` |
| `user.updated` | PATCH `/users/:id` | `changed_fields[]` |
| `user.deactivated` | DELETE `/users/:id` | `email` |
| `role.created` | POST `/roles` | `title`, `department` |
| `role.updated` | PATCH `/roles/:id` | `changed_fields[]` |
| `role.published` | POST `/roles/:id/publish` | `title`, `department` |
| `role.closed` | POST `/roles/:id/close` | `reason` (`filled` or `cancelled`) |
| `role.paused` | POST `/roles/:id/pause` | — |
| `candidate.created` | POST `/candidates` | `full_name`, `source` |
| `candidate.updated` | PATCH `/candidates/:id` | `changed_fields[]` |
| `candidate.merged` | POST `/candidates/merge` | `primary_id`, `secondary_id` |
| `application.created` | POST `/applications` | `candidate_id`, `role_id`, `stage_id` |
| `application.stage_changed` | POST `/applications/:id/advance` | `from_stage_id`, `from_stage_label`, `to_stage_id`, `to_stage_label` |
| `application.rejected` | POST `/applications/:id/reject` | `rejection_reason` |
| `application.withdrawn` | POST `/applications/:id/withdraw` | — |
| `pipeline_template.created` | POST `/pipeline-templates` | `name`, `stage_count` |
| `pipeline_template.updated` | PATCH `/pipeline-templates/:id` | `changed_fields[]` |

---

## Known Limitations

1. **Full-text / vector search not implemented.** `GET /candidates?q=` accepts the `q` parameter but the service layer currently performs a simple `ilike` on `full_name`. Hybrid vector+BM25 search (pgvector + `ts_vector`) is deferred to Slice 4.
2. **No Clerk webhook sync.** `users` rows are created by `POST /users` (invite flow). A Clerk `user.created` webhook handler to auto-sync SSO signups is not yet wired up.
3. **Pipeline advancement is strictly sequential.** `advance_application` moves to the next stage by `position` order. There is no support for skipping stages or branching pipelines in Slice 1.
4. **No file storage integration.** CV and document uploads are schema-ready (`R2_*` env vars present) but the Cloudflare R2 upload/download routes are not implemented until Slice 4.
5. **Hiring decision (`application.hired`) not implemented.** The `APPLICATION_HIRED` event type and a dedicated `/applications/:id/hire` endpoint are defined in types but not yet routed.
6. **No rate limiting or pagination cursors on the event log.** `GET /events` returns all matching events for the organization. Cursor-based pagination should be added before production use.
7. **`packages/llm` client is unconfigured at runtime.** The Helicone proxy header and model selection logic exist but no route in Slice 1 calls the LLM. The package is ready for Slice 3.
8. **Web UI is read-only stub.** The Next.js frontend renders candidates, roles, and a Kanban board but mutations (create role, advance candidate) are not yet wired to the API. Full interactivity is completed alongside each corresponding slice.
