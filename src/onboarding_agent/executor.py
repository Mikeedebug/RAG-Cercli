"""Execute planned actions against the portal via Playwright macros.

- Auto tier runs immediately.
- Confirm-first tier is left in AWAITING_CONFIRMATION for a human to
  approve via the Slack notifier / approval endpoint.

The executor takes a browser context factory as a dependency so tests
can inject a fake page. In production, `playwright_context()` in
`browser.py` provides a logged-in portal session.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, ContextManager

from .audit import AuditLog
from .macros import (
    create_first_hire,
    create_tenant,
    delete_seed_entry,
    remove_admin_only_user,
)
from .models import (
    Action,
    ActionKind,
    ActionStatus,
    AutonomyTier,
    CustomerOnboarding,
)
from .store import OnboardingStore

MACROS: dict[ActionKind, Callable[[Any, dict[str, Any]], dict[str, Any]]] = {
    ActionKind.CREATE_TENANT: create_tenant.run,
    ActionKind.CREATE_FIRST_HIRE: create_first_hire.run,
    ActionKind.REMOVE_ADMIN_ONLY_USER: remove_admin_only_user.run,
    ActionKind.DELETE_SEED_ENTRY: delete_seed_entry.run,
}


class Executor:
    def __init__(
        self,
        store: OnboardingStore,
        audit: AuditLog,
        browser_ctx: Callable[[], ContextManager[Any]],
    ) -> None:
        self.store = store
        self.audit = audit
        self.browser_ctx = browser_ctx

    def run_pending(self, record: CustomerOnboarding) -> CustomerOnboarding:
        to_run = [a for a in record.actions if a.status == ActionStatus.PLANNED]
        if not to_run:
            return record

        with self.browser_ctx() as page:
            for action in to_run:
                if action.tier == AutonomyTier.CONFIRM_FIRST:
                    action.status = ActionStatus.AWAITING_CONFIRMATION
                    action.updated_at = datetime.utcnow()
                    self.audit.write(
                        record.id,
                        "action.awaiting_confirmation",
                        {"action_id": action.id, "kind": action.kind.value},
                    )
                    continue
                self._run_one(record, action, page)

        self.store.save(record)
        return record

    def run_approved(self, record: CustomerOnboarding, action_id: str) -> Action:
        action = next(a for a in record.actions if a.id == action_id)
        if action.status != ActionStatus.APPROVED:
            raise ValueError(f"action {action_id} is not approved: {action.status}")
        with self.browser_ctx() as page:
            self._run_one(record, action, page)
        self.store.save(record)
        return action

    def _run_one(self, record: CustomerOnboarding, action: Action, page: Any) -> None:
        macro = MACROS.get(action.kind)
        if not macro:
            action.status = ActionStatus.FAILED
            action.error = f"no macro registered for {action.kind}"
            action.updated_at = datetime.utcnow()
            self.audit.write(record.id, "action.no_macro", {"action_id": action.id})
            return

        action.status = ActionStatus.RUNNING
        action.updated_at = datetime.utcnow()
        self.audit.write(
            record.id,
            "action.start",
            {"action_id": action.id, "kind": action.kind.value, "params": action.params},
        )
        try:
            result = macro(page, action.params)
            action.status = ActionStatus.SUCCEEDED
            action.result = result
            action.updated_at = datetime.utcnow()
            if action.kind == ActionKind.CREATE_TENANT:
                record.tenant_id = result.get("tenant_id")
            self.audit.write(
                record.id,
                "action.succeeded",
                {"action_id": action.id, "result": result},
            )
        except Exception as exc:  # noqa: BLE001 — record everything, no staging
            action.status = ActionStatus.FAILED
            action.error = str(exc)
            action.updated_at = datetime.utcnow()
            self.audit.write(
                record.id,
                "action.failed",
                {"action_id": action.id, "error": str(exc)},
            )
