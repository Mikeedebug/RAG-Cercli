"""Turn onboarding inputs into a structured action plan.

Uses Claude with a strict JSON-schema tool call so the planner cannot
hand back free-form text. Every action carries a `rationale` and
`source` field naming which fact (deal property, transcript excerpt,
Notion rule) justified it — that trace is what a human reviewer sees
on confirm-first actions.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from anthropic import Anthropic

from .config import settings
from .models import Action, ActionKind, CustomerOnboarding, tier_for

PLANNER_SYSTEM = """You are the planner for an HR platform's onboarding agent.

Given: HubSpot deal data, kickoff-call transcript (may be absent), and
company SOP rules, emit the exact list of backend portal actions to run
for this customer. Actions must come from the enumerated `kind` values.

Every action MUST include:
- rationale: one short sentence naming the concrete fact that justifies it
- source: one of `hubspot`, `grain`, `sop`, or a combination like `hubspot+sop`

Do not invent actions the inputs don't justify. If the transcript is
missing, plan only the setup actions the deal data supports.
"""

ACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": [k.value for k in ActionKind],
                    },
                    "params": {"type": "object"},
                    "rationale": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["kind", "params", "rationale", "source"],
            },
        }
    },
    "required": ["actions"],
}


def _build_prompt(record: CustomerOnboarding, sop_text: str) -> str:
    parts = [
        "# HubSpot deal",
        json.dumps(record.hubspot.model_dump(mode="json"), indent=2, default=str),
    ]
    if record.grain:
        parts += [
            "# Kickoff call (Grain transcript)",
            record.grain.summary or "",
            "---",
            record.grain.transcript[:12000],
        ]
    else:
        parts += ["# Kickoff call", "(not available yet)"]
    parts += ["# SOP rules (Notion)", sop_text or "(no SOP loaded)"]
    return "\n\n".join(parts)


def plan(record: CustomerOnboarding, sop_text: str = "") -> list[Action]:
    client = Anthropic(api_key=settings.anthropic_api_key)
    prompt = _build_prompt(record, sop_text)

    response = client.messages.create(
        model=settings.planner_model,
        max_tokens=4096,
        system=PLANNER_SYSTEM,
        tools=[
            {
                "name": "emit_plan",
                "description": "Emit the structured onboarding action plan.",
                "input_schema": ACTION_SCHEMA,
            }
        ],
        tool_choice={"type": "tool", "name": "emit_plan"},
        messages=[{"role": "user", "content": prompt}],
    )

    tool_block = next((b for b in response.content if b.type == "tool_use"), None)
    if not tool_block:
        return []
    raw: dict[str, Any] = tool_block.input  # type: ignore[assignment]

    actions: list[Action] = []
    for a in raw.get("actions", []):
        kind = ActionKind(a["kind"])
        actions.append(
            Action(
                id=uuid.uuid4().hex,
                kind=kind,
                tier=tier_for(kind),
                params=a.get("params", {}),
                rationale=a["rationale"],
                source=a["source"],
            )
        )
    return actions
