"""Runtime configuration, read from environment variables.

Nothing client-specific lives in the repository: client data comes from the
Sutton client master sheet, and rules / exclusions / queue state live in the
private "system" spreadsheet. The repo only holds code.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


def _req(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable {name}")
    return value


def _opt(name: str, default: str) -> str:
    return os.environ.get(name, "").strip() or default


@dataclass(frozen=True)
class Config:
    # Google OAuth client from the GCP project that has GBP API approval, plus a
    # refresh token minted for analytics@sdmark.net (see `python -m gbp_reviews auth`).
    google_client_id: str
    google_client_secret: str
    google_refresh_token: str

    # "Sutton Digital Clients - Master" spreadsheet (source of truth for clients).
    clients_sheet_id: str
    clients_tab: str

    # Private spreadsheet holding Rules / Exclusions / Queue / Batches / Notes Log.
    system_sheet_id: str

    slack_bot_token: str
    slack_channel_id: str

    anthropic_model: str
    min_review_age_days: int
    batch_lookback_days: int

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            google_client_id=_req("GOOGLE_CLIENT_ID"),
            google_client_secret=_req("GOOGLE_CLIENT_SECRET"),
            google_refresh_token=_req("GOOGLE_REFRESH_TOKEN"),
            clients_sheet_id=_req("CLIENTS_SHEET_ID"),
            clients_tab=_opt("CLIENTS_TAB", "Clients Master"),
            system_sheet_id=_req("SYSTEM_SHEET_ID"),
            slack_bot_token=_req("SLACK_BOT_TOKEN"),
            slack_channel_id=_req("SLACK_CHANNEL_ID"),
            anthropic_model=_opt("ANTHROPIC_MODEL", "claude-opus-5"),
            min_review_age_days=int(_opt("MIN_REVIEW_AGE_DAYS", "10")),
            # Poller keeps reading Slack threads of batches this recent.
            batch_lookback_days=int(_opt("BATCH_LOOKBACK_DAYS", "28")),
        )
