"""Fetch a kickoff-call transcript from Grain.

Grain's public API exposes recordings and their transcripts by id.
This module only pulls; matching a recording to an onboarding record
happens in the webhook handler (by attendee email, deal contact, etc.).
"""

from __future__ import annotations

from datetime import datetime

import requests

from .config import settings
from .models import GrainSnapshot

GRAIN_API = "https://api.grain.com/_/public-api"


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.grain_api_key}"}


def fetch_recording(recording_id: str) -> GrainSnapshot:
    meta = requests.get(
        f"{GRAIN_API}/recordings/{recording_id}", headers=_headers(), timeout=15
    ).json()
    transcript_resp = requests.get(
        f"{GRAIN_API}/recordings/{recording_id}/transcript.vtt",
        headers=_headers(),
        timeout=15,
    )
    transcript = transcript_resp.text if transcript_resp.ok else ""

    call_at = None
    started = meta.get("start_datetime") or meta.get("started_at")
    if started:
        try:
            call_at = datetime.fromisoformat(started.replace("Z", "+00:00"))
        except ValueError:
            call_at = None

    return GrainSnapshot(
        recording_id=recording_id,
        transcript=transcript,
        summary=meta.get("summary"),
        call_at=call_at,
    )
