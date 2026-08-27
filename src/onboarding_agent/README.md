# HR Onboarding Agent

Automates backend portal configuration for new customers, triggered by
HubSpot deals reaching Closed Won and enriched with the kickoff call
transcript from Grain.

## Pipeline

```
HubSpot Closed Won ──► webhook ──► fetch deal ──► planner ─┐
                                                            │
Grain recording ready ──► webhook ──► fetch transcript ────┤
                                                            │
                              Notion SOP rules ────────────►│
                                                            ▼
                                                       action plan
                                                            │
                                            ┌───────────────┴───────────────┐
                                            ▼                               ▼
                                       AUTO tier                    CONFIRM-FIRST tier
                                (create tenant,                 (remove admin-only,
                                 create first hire)              delete seed entry)
                                            │                               │
                                            ▼                               ▼
                                    Playwright macro                Slack approval
                                            │                               │
                                            └──────────► audit log ◄────────┘
```

## Autonomy tiers

- **Auto**: additive, expected on every customer (`create_tenant`,
  `create_first_hire`). Runs immediately.
- **Confirm-first**: destructive or judgment-driven
  (`remove_admin_only_user`, `delete_seed_entry`). Posted to Slack; a
  human clicks Approve/Reject; approved actions execute on the next run.

Every action carries `rationale` + `source` so a reviewer can see which
input justified it before clicking Approve.

## Safety net

No staging, so the append-only audit log at `data/onboarding_audit/`
records every observation, planner output, and portal action with
before/after payloads. That log is the only forensic tool if a run
misbehaves.

## Running

```bash
uvicorn src.onboarding_agent.webhooks:app --port 8080
```

Point HubSpot's Deal `dealstage` webhook at `POST /webhooks/hubspot`
and Grain's recording-ready webhook at `POST /webhooks/grain`.

## Adding a portal macro

1. Record the click flow in your admin portal.
2. Add `src/onboarding_agent/macros/<kind>.py` with a `run(page, params)`
   function that returns a result dict.
3. Register it in `executor.MACROS` and add the enum value in
   `models.ActionKind`.
4. Decide the tier in `AUTO_ACTIONS` — destructive stays confirm-first.

## Tests

```bash
python -m pytest tests/test_orchestrator.py
```
