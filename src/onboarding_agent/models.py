"""Data models for the onboarding pipeline.

The flow produces a `CustomerOnboarding` record that accumulates state
across two triggers (HubSpot Closed Won, then Grain transcript ready)
and drives a list of `Action`s against the portal.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ActionKind(str, Enum):
    CREATE_TENANT = "create_tenant"
    CREATE_FIRST_HIRE = "create_first_hire"
    REMOVE_ADMIN_ONLY_USER = "remove_admin_only_user"
    DELETE_SEED_ENTRY = "delete_seed_entry"
    OTHER = "other"


class AutonomyTier(str, Enum):
    AUTO = "auto"
    CONFIRM_FIRST = "confirm_first"


class ActionStatus(str, Enum):
    PLANNED = "planned"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    APPROVED = "approved"
    REJECTED = "rejected"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


AUTO_ACTIONS: set[ActionKind] = {
    ActionKind.CREATE_TENANT,
    ActionKind.CREATE_FIRST_HIRE,
}


def tier_for(kind: ActionKind) -> AutonomyTier:
    return AutonomyTier.AUTO if kind in AUTO_ACTIONS else AutonomyTier.CONFIRM_FIRST


class Action(BaseModel):
    id: str
    kind: ActionKind
    tier: AutonomyTier
    params: dict[str, Any] = Field(default_factory=dict)
    rationale: str
    source: str
    status: ActionStatus = ActionStatus.PLANNED
    result: dict[str, Any] | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class HubSpotSnapshot(BaseModel):
    deal_id: str
    deal_name: str | None = None
    company: dict[str, Any] = Field(default_factory=dict)
    primary_contact: dict[str, Any] = Field(default_factory=dict)
    custom_fields: dict[str, Any] = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class GrainSnapshot(BaseModel):
    recording_id: str
    transcript: str
    summary: str | None = None
    call_at: datetime | None = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class OnboardingStage(str, Enum):
    DEAL_RECEIVED = "deal_received"
    TENANT_CREATED = "tenant_created"
    AWAITING_KICKOFF = "awaiting_kickoff"
    KICKOFF_PROCESSED = "kickoff_processed"
    COMPLETE = "complete"


class CustomerOnboarding(BaseModel):
    id: str
    deal_id: str
    stage: OnboardingStage = OnboardingStage.DEAL_RECEIVED
    hubspot: HubSpotSnapshot
    grain: GrainSnapshot | None = None
    actions: list[Action] = Field(default_factory=list)
    tenant_id: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
