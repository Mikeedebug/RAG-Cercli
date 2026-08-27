"""Glue: run the pipeline stages against a CustomerOnboarding record.

Two entry points, one per trigger:
- `on_deal_closed_won` — HubSpot webhook. Fetches deal, plans setup
  actions (no transcript yet), runs auto tier, marks awaiting kickoff.
- `on_grain_ready` — Grain webhook. Fetches transcript, re-plans with
  call context, runs auto tier + queues confirm-first actions.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Callable

from .audit import AuditLog
from .executor import Executor
from .grain_source import fetch_recording
from .hubspot_source import fetch_deal
from .models import CustomerOnboarding, OnboardingStage
from .notifier import notify_awaiting, notify_run_summary
from .planner import plan
from .store import OnboardingStore


class Orchestrator:
    def __init__(
        self,
        store: OnboardingStore | None = None,
        audit: AuditLog | None = None,
        executor: Executor | None = None,
        sop_loader: Callable[[], str] | None = None,
        approve_url_for: Callable[[str, str], str] | None = None,
    ) -> None:
        self.store = store or OnboardingStore()
        self.audit = audit or AuditLog()
        if executor is None:
            from .browser import playwright_context
            executor = Executor(self.store, self.audit, playwright_context)
        self.executor = executor
        self.sop_loader = sop_loader or (lambda: "")
        self.approve_url_for = approve_url_for or (
            lambda onboarding_id, action_id: f"/approve/{onboarding_id}/{action_id}"
        )

    def on_deal_closed_won(self, deal_id: str) -> CustomerOnboarding:
        existing = self.store.find_by_deal(deal_id)
        if existing:
            self.audit.write(existing.id, "trigger.duplicate_closed_won", {"deal_id": deal_id})
            return existing

        snapshot = fetch_deal(deal_id)
        record = CustomerOnboarding(id=uuid.uuid4().hex, deal_id=deal_id, hubspot=snapshot)
        self.store.save(record)
        self.audit.write(record.id, "trigger.closed_won", {"deal_id": deal_id})

        record.actions = plan(record, self.sop_loader())
        self.store.save(record)
        self.audit.write(record.id, "plan.emitted", {"count": len(record.actions)})

        record = self.executor.run_pending(record)
        record.stage = OnboardingStage.AWAITING_KICKOFF
        self.store.save(record)
        self._notify_awaiting(record)
        notify_run_summary(record)
        return record

    def on_grain_ready(self, deal_id: str, recording_id: str) -> CustomerOnboarding:
        record = self.store.find_by_deal(deal_id)
        if not record:
            snapshot = fetch_deal(deal_id)
            record = CustomerOnboarding(id=uuid.uuid4().hex, deal_id=deal_id, hubspot=snapshot)

        record.grain = fetch_recording(recording_id)
        record.stage = OnboardingStage.KICKOFF_PROCESSED
        record.updated_at = datetime.utcnow()
        self.store.save(record)
        self.audit.write(record.id, "trigger.grain_ready", {"recording_id": recording_id})

        planned_ids = {a.id for a in record.actions}
        new_actions = plan(record, self.sop_loader())
        for a in new_actions:
            if a.id not in planned_ids:
                record.actions.append(a)
        self.store.save(record)
        self.audit.write(record.id, "plan.updated", {"count": len(record.actions)})

        record = self.executor.run_pending(record)
        self._notify_awaiting(record)
        notify_run_summary(record)
        return record

    def _notify_awaiting(self, record: CustomerOnboarding) -> None:
        for action in record.actions:
            if action.status.value == "awaiting_confirmation":
                url = self.approve_url_for(record.id, action.id)
                notify_awaiting(record, action, url)
