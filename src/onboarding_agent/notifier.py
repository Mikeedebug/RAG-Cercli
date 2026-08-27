"""Slack notifications for confirm-first actions and run summaries.

Sends a message with rationale + params so the reviewer can decide from
Slack without opening the portal. Approval flows back through the HTTP
endpoint `/approve/{action_id}`.
"""

from __future__ import annotations

import json

import requests

from .config import settings
from .models import Action, CustomerOnboarding


def notify_awaiting(record: CustomerOnboarding, action: Action, approve_url: str) -> None:
    if not settings.slack_webhook_url:
        return

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"Confirm: {action.kind.value}"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Customer*\n{record.hubspot.deal_name or record.deal_id}"},
                {"type": "mrkdwn", "text": f"*Source*\n{action.source}"},
            ],
        },
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*Rationale*\n{action.rationale}"}},
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Params*\n```{json.dumps(action.params, indent=2)}```"},
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Approve"},
                    "style": "primary",
                    "url": f"{approve_url}?decision=approve",
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Reject"},
                    "style": "danger",
                    "url": f"{approve_url}?decision=reject",
                },
            ],
        },
    ]
    requests.post(
        settings.slack_webhook_url,
        json={"channel": settings.slack_confirm_channel, "blocks": blocks},
        timeout=10,
    )


def notify_run_summary(record: CustomerOnboarding) -> None:
    if not settings.slack_webhook_url:
        return

    lines = [f"*Onboarding update — {record.hubspot.deal_name or record.deal_id}*"]
    for a in record.actions:
        lines.append(f"• `{a.kind.value}` — {a.status.value}")
    requests.post(
        settings.slack_webhook_url,
        json={"channel": settings.slack_confirm_channel, "text": "\n".join(lines)},
        timeout=10,
    )
