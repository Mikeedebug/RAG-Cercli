"""Macro: create the first hire from HubSpot deal details."""

from __future__ import annotations

from typing import Any


def run(page: Any, params: dict[str, Any]) -> dict[str, Any]:
    tenant_id = params["tenant_id"]
    hire = params["hire"]

    page.goto(f"{page.context._portal_base_url}/admin/tenants/{tenant_id}/hires/new")
    page.get_by_label("First name").fill(hire["first_name"])
    page.get_by_label("Last name").fill(hire["last_name"])
    page.get_by_label("Work email").fill(hire["email"])
    if hire.get("role"):
        page.get_by_label("Role").fill(hire["role"])
    if hire.get("start_date"):
        page.get_by_label("Start date").fill(hire["start_date"])
    page.get_by_role("button", name="Create hire").click()
    page.wait_for_selector("text=Hire created")
    return {"tenant_id": tenant_id, "email": hire["email"]}
