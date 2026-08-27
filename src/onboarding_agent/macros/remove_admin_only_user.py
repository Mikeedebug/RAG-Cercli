"""Macro: remove an admin-only user from a payroll run.

Destructive — only invoked after human confirmation.
"""

from __future__ import annotations

from typing import Any


def run(page: Any, params: dict[str, Any]) -> dict[str, Any]:
    tenant_id = params["tenant_id"]
    email = params["email"]

    page.goto(f"{page.context._portal_base_url}/admin/tenants/{tenant_id}/payroll/users")
    row = page.get_by_role("row", name=email)
    row.get_by_role("button", name="Actions").click()
    page.get_by_role("menuitem", name="Remove from payroll").click()
    page.get_by_role("button", name="Confirm").click()
    page.wait_for_selector(f"text=Removed {email}")
    return {"tenant_id": tenant_id, "email": email}
