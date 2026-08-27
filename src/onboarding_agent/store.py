"""Persistence for `CustomerOnboarding` records.

File-backed JSON for the v1 scaffold — swap for a real DB when the flow
is stable. One file per onboarding, keyed by id.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .config import settings
from .models import CustomerOnboarding


class OnboardingStore:
    def __init__(self, root: str | Path | None = None) -> None:
        self.root = Path(root or settings.state_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, onboarding_id: str) -> Path:
        return self.root / f"{onboarding_id}.json"

    def save(self, record: CustomerOnboarding) -> None:
        record.updated_at = datetime.utcnow()
        self._path(record.id).write_text(record.model_dump_json(indent=2))

    def load(self, onboarding_id: str) -> CustomerOnboarding | None:
        path = self._path(onboarding_id)
        if not path.exists():
            return None
        return CustomerOnboarding.model_validate_json(path.read_text())

    def find_by_deal(self, deal_id: str) -> CustomerOnboarding | None:
        for path in self.root.glob("*.json"):
            data = json.loads(path.read_text())
            if data.get("deal_id") == deal_id:
                return CustomerOnboarding.model_validate(data)
        return None
