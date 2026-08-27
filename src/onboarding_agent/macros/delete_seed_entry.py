"""Macro: delete a fake/seed entry the sales team created for demo purposes."""

from __future__ import annotations

from typing import Any


def run(page: Any, params: dict[str, Any]) -> dict[str, Any]:
    tenant_id = params["tenant_id"]
    entry_id = params["entry_id"]
    entry_type = params.get("entry_type", "employee")

    page.goto(
        f"{page.context._portal_base_url}"
        f"/admin/tenants/{tenant_id}/{entry_type}s/{entry_id}"
    )
    page.get_by_role("button", name="Delete").click()
    page.get_by_role("button", name="Confirm delete").click()
    page.wait_for_selector("text=Deleted")
    return {"tenant_id": tenant_id, "entry_id": entry_id, "entry_type": entry_type}
