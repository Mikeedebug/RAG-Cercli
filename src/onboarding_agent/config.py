"""Runtime config for the onboarding agent."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class OnboardingSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ONBOARDING_", env_file=".env", extra="ignore")

    hubspot_access_token: str = ""
    hubspot_webhook_secret: str = ""

    grain_api_key: str = ""
    grain_webhook_secret: str = ""

    anthropic_api_key: str = ""
    planner_model: str = "claude-sonnet-5"

    portal_base_url: str = ""
    portal_admin_email: str = ""
    portal_admin_password: str = ""

    slack_webhook_url: str = ""
    slack_confirm_channel: str = "#onboarding-agent"

    notion_api_key: str = ""
    notion_sop_page_id: str = ""

    audit_log_dir: str = "./data/onboarding_audit"
    state_dir: str = "./data/onboarding_state"


settings = OnboardingSettings()
