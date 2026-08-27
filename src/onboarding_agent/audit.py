"""Append-only audit log.

With no staging, this is the only after-the-fact safety net: every
observation, decision, and portal action gets recorded here with a
timestamp and correlation id.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import settings


class AuditLog:
    def __init__(self, root: str | Path | None = None) -> None:
        self.root = Path(root or settings.audit_log_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, onboarding_id: str) -> Path:
        return self.root / f"{onboarding_id}.jsonl"

    def write(self, onboarding_id: str, event: str, payload: dict[str, Any]) -> None:
        line = {
            "ts": datetime.utcnow().isoformat(),
            "onboarding_id": onboarding_id,
            "event": event,
            "payload": payload,
        }
        with self._path(onboarding_id).open("a") as f:
            f.write(json.dumps(line, default=str) + "\n")
