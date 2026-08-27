"""FastAPI app exposing the HubSpot + Grain webhooks and approval endpoint."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request

from .config import settings
from .models import ActionStatus
from .orchestrator import Orchestrator

app = FastAPI(title="HR Onboarding Agent")
orchestrator = Orchestrator()


def _verify_hubspot(body: bytes, signature: str | None) -> None:
    if not settings.hubspot_webhook_secret:
        return
    if not signature:
        raise HTTPException(status_code=401, detail="missing signature")
    expected = hmac.new(
        settings.hubspot_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="bad signature")


@app.post("/webhooks/hubspot")
async def hubspot_webhook(
    request: Request,
    x_hubspot_signature_v3: str | None = Header(default=None),
) -> dict[str, Any]:
    body = await request.body()
    _verify_hubspot(body, x_hubspot_signature_v3)
    events = await request.json()
    if not isinstance(events, list):
        events = [events]

    results = []
    for event in events:
        if event.get("subscriptionType") != "deal.propertyChange":
            continue
        if event.get("propertyName") != "dealstage":
            continue
        if event.get("propertyValue") != "closedwon":
            continue
        deal_id = str(event["objectId"])
        record = orchestrator.on_deal_closed_won(deal_id)
        results.append({"deal_id": deal_id, "onboarding_id": record.id})
    return {"processed": results}


@app.post("/webhooks/grain")
async def grain_webhook(request: Request) -> dict[str, Any]:
    payload = await request.json()
    recording_id = payload.get("recording_id") or payload.get("id")
    deal_id = payload.get("deal_id") or _match_deal_from_grain(payload)
    if not recording_id or not deal_id:
        raise HTTPException(status_code=400, detail="missing recording_id or deal_id")
    record = orchestrator.on_grain_ready(deal_id, recording_id)
    return {"onboarding_id": record.id, "actions": len(record.actions)}


def _match_deal_from_grain(payload: dict[str, Any]) -> str | None:
    # Fallback: match a Grain call to a HubSpot deal by attendee email.
    # Implement against your Grain payload shape.
    return None


@app.get("/approve/{onboarding_id}/{action_id}")
def approve(onboarding_id: str, action_id: str, decision: str = "approve") -> dict[str, Any]:
    record = orchestrator.store.load(onboarding_id)
    if not record:
        raise HTTPException(status_code=404, detail="onboarding not found")
    action = next((a for a in record.actions if a.id == action_id), None)
    if not action:
        raise HTTPException(status_code=404, detail="action not found")
    if action.status != ActionStatus.AWAITING_CONFIRMATION:
        return {"status": action.status.value, "note": "not awaiting confirmation"}

    if decision == "reject":
        action.status = ActionStatus.REJECTED
        orchestrator.store.save(record)
        orchestrator.audit.write(record.id, "action.rejected", {"action_id": action.id})
        return {"status": "rejected"}

    action.status = ActionStatus.APPROVED
    orchestrator.store.save(record)
    orchestrator.audit.write(record.id, "action.approved", {"action_id": action.id})
    orchestrator.executor.run_approved(record, action.id)
    return {"status": action.status.value}
