"""Playwright browser context factory: logs into the admin portal once."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from playwright.sync_api import Page, sync_playwright

from .config import settings


@contextmanager
def playwright_context() -> Iterator[Page]:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.context._portal_base_url = settings.portal_base_url  # macros read this

        page.goto(f"{settings.portal_base_url}/login")
        page.get_by_label("Email").fill(settings.portal_admin_email)
        page.get_by_label("Password").fill(settings.portal_admin_password)
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url("**/admin/**")

        try:
            yield page
        finally:
            context.close()
            browser.close()
