"""Pull deal + associated contact/company data from HubSpot.

Reuses the top-level HUBSPOT_ACCESS_TOKEN when the onboarding-specific
one isn't set.
"""

from __future__ import annotations

import os
from typing import Any

import requests

from .config import settings
from .models import HubSpotSnapshot

HUBSPOT_API = "https://api.hubapi.com"


def _token() -> str:
    return settings.hubspot_access_token or os.environ.get("HUBSPOT_ACCESS_TOKEN", "")


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_token()}", "Content-Type": "application/json"}


def fetch_deal(deal_id: str) -> HubSpotSnapshot:
    deal_url = (
        f"{HUBSPOT_API}/crm/v3/objects/deals/{deal_id}"
        "?associations=contacts,companies&properties=dealname,amount,dealstage,pipeline"
    )
    deal = requests.get(deal_url, headers=_headers(), timeout=15).json()

    props: dict[str, Any] = deal.get("properties", {}) or {}
    associations = deal.get("associations", {}) or {}

    contact = _first_associated(associations, "contacts", "contacts")
    company = _first_associated(associations, "companies", "companies")

    return HubSpotSnapshot(
        deal_id=deal_id,
        deal_name=props.get("dealname"),
        company=company,
        primary_contact=contact,
        custom_fields=props,
    )


def _first_associated(associations: dict[str, Any], key: str, object_type: str) -> dict[str, Any]:
    results = (associations.get(key) or {}).get("results") or []
    if not results:
        return {}
    target_id = results[0].get("id")
    if not target_id:
        return {}
    resp = requests.get(
        f"{HUBSPOT_API}/crm/v3/objects/{object_type}/{target_id}",
        headers=_headers(),
        timeout=15,
    )
    return resp.json() if resp.ok else {}
