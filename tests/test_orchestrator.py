"""End-to-end orchestration test using in-memory fakes for HubSpot,
Grain, planner, and Playwright."""

from __future__ import annotations

import tempfile
import uuid
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from src.onboarding_agent.audit import AuditLog
from src.onboarding_agent.executor import Executor
from src.onboarding_agent.models import (
    Action,
    ActionKind,
    ActionStatus,
    AutonomyTier,
    GrainSnapshot,
    HubSpotSnapshot,
    tier_for,
)
from src.onboarding_agent.orchestrator import Orchestrator
from src.onboarding_agent.store import OnboardingStore


class FakePage:
    def __init__(self) -> None:
        self.calls: list[str] = []


@contextmanager
def fake_browser():
    yield FakePage()


def _fake_deal_snapshot(deal_id: str) -> HubSpotSnapshot:
    return HubSpotSnapshot(
        deal_id=deal_id,
        deal_name="Acme HR",
        company={"properties": {"name": "Acme"}},
        primary_contact={
            "properties": {
                "firstname": "Ada",
                "lastname": "Lovelace",
                "email": "ada@acme.test",
                "jobtitle": "Head of People",
            }
        },
        custom_fields={"amount": "12000", "dealstage": "closedwon"},
    )


def _fake_grain_snapshot(recording_id: str) -> GrainSnapshot:
    return GrainSnapshot(
        recording_id=recording_id,
        transcript=(
            "Customer said: please remove the sales@acme.test admin user "
            "from the initial payroll run, and delete the two demo employees."
        ),
        summary="Kickoff: cleanup admin-only user + demo entries.",
    )


def _fake_setup_plan(record, _sop):
    return [
        Action(
            id=uuid.uuid4().hex,
            kind=ActionKind.CREATE_TENANT,
            tier=tier_for(ActionKind.CREATE_TENANT),
            params={"company_name": "Acme", "plan": "standard"},
            rationale="Deal Closed Won for Acme.",
            source="hubspot",
        ),
        Action(
            id=uuid.uuid4().hex,
            kind=ActionKind.CREATE_FIRST_HIRE,
            tier=tier_for(ActionKind.CREATE_FIRST_HIRE),
            params={
                "tenant_id": "TENANT_FROM_MACRO",
                "hire": {
                    "first_name": "Ada",
                    "last_name": "Lovelace",
                    "email": "ada@acme.test",
                    "role": "Head of People",
                },
            },
            rationale="Primary contact on HubSpot deal.",
            source="hubspot",
        ),
    ]


def _fake_full_plan(record, _sop):
    actions = _fake_setup_plan(record, _sop)
    actions.append(
        Action(
            id=uuid.uuid4().hex,
            kind=ActionKind.REMOVE_ADMIN_ONLY_USER,
            tier=tier_for(ActionKind.REMOVE_ADMIN_ONLY_USER),
            params={"tenant_id": "T-1", "email": "sales@acme.test"},
            rationale="Customer asked on kickoff call to remove sales admin.",
            source="grain",
        )
    )
    return actions


def _fake_macros():
    return {
        ActionKind.CREATE_TENANT: lambda page, params: {
            "tenant_id": "T-1",
            "company_name": params["company_name"],
            "plan": params["plan"],
        },
        ActionKind.CREATE_FIRST_HIRE: lambda page, params: {
            "tenant_id": params["tenant_id"],
            "email": params["hire"]["email"],
        },
        ActionKind.REMOVE_ADMIN_ONLY_USER: lambda page, params: {
            "tenant_id": params["tenant_id"],
            "email": params["email"],
        },
        ActionKind.DELETE_SEED_ENTRY: lambda page, params: params,
    }


def test_closed_won_then_grain_end_to_end():
    with tempfile.TemporaryDirectory() as tmp:
        state_dir = Path(tmp) / "state"
        audit_dir = Path(tmp) / "audit"
        store = OnboardingStore(state_dir)
        audit = AuditLog(audit_dir)

        with patch("src.onboarding_agent.executor.MACROS", _fake_macros()):
            executor = Executor(store, audit, fake_browser)
            orch = Orchestrator(
                store=store,
                audit=audit,
                executor=executor,
                sop_loader=lambda: "no admin-only users in payroll; delete seed data",
            )

            with patch(
                "src.onboarding_agent.orchestrator.fetch_deal", _fake_deal_snapshot
            ), patch(
                "src.onboarding_agent.orchestrator.plan", _fake_setup_plan
            ):
                record = orch.on_deal_closed_won("D-123")

        assert record.tenant_id == "T-1"
        setup_actions = [a for a in record.actions if a.tier == AutonomyTier.AUTO]
        assert all(a.status == ActionStatus.SUCCEEDED for a in setup_actions)

        with patch("src.onboarding_agent.executor.MACROS", _fake_macros()):
            executor2 = Executor(store, audit, fake_browser)
            orch2 = Orchestrator(
                store=store,
                audit=audit,
                executor=executor2,
                sop_loader=lambda: "",
            )
            with patch(
                "src.onboarding_agent.orchestrator.fetch_recording",
                lambda rid: _fake_grain_snapshot(rid),
            ), patch(
                "src.onboarding_agent.orchestrator.plan", _fake_full_plan
            ), patch(
                "src.onboarding_agent.orchestrator.notify_awaiting", lambda *a, **k: None
            ), patch(
                "src.onboarding_agent.orchestrator.notify_run_summary", lambda *a, **k: None
            ):
                record = orch2.on_grain_ready("D-123", "R-999")

        confirm_actions = [
            a for a in record.actions if a.tier == AutonomyTier.CONFIRM_FIRST
        ]
        assert confirm_actions, "expected at least one confirm-first action"
        assert all(
            a.status == ActionStatus.AWAITING_CONFIRMATION for a in confirm_actions
        )
