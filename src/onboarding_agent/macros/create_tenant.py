"""Macro: create a tenant in the admin portal.

Placeholder selectors — fill these in from your actual portal recording.
The function is intentionally verbose so a reviewer can eyeball the
sequence against the recorded video/click-trail.
"""

from __future__ import annotations

from typing import Any


def run(page: Any, params: dict[str, Any]) -> dict[str, Any]:
    company_name = params["company_name"]
    plan = params.get("plan", "standard")

    page.goto(f"{page.context._portal_base_url}/admin/tenants/new")
    page.get_by_label("Company name").fill(company_name)
    page.get_by_label("Plan").select_option(plan)
    page.get_by_role("button", name="Create tenant").click()
    page.wait_for_url("**/admin/tenants/*")

    tenant_id = page.url.rstrip("/").rsplit("/", 1)[-1]
    return {"tenant_id": tenant_id, "company_name": company_name, "plan": plan}
