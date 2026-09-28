"""Wires the configured clients together for the weekly and poll jobs."""

from __future__ import annotations

from dataclasses import dataclass

from .clients import Client, parse_clients
from .config import Config
from .drafter import Drafter
from .google_api import BusinessProfile, GoogleSession, Sheets
from .slack import Slack
from .store import Store


@dataclass
class Context:
    cfg: Config
    sheets: Sheets
    gbp: BusinessProfile
    store: Store
    slack: Slack
    drafter: Drafter

    @classmethod
    def build(cls, cfg: Config) -> "Context":
        session = GoogleSession(cfg.google_client_id, cfg.google_client_secret, cfg.google_refresh_token)
        sheets = Sheets(session)
        return cls(
            cfg=cfg,
            sheets=sheets,
            gbp=BusinessProfile(session),
            store=Store(sheets, cfg.system_sheet_id),
            slack=Slack(cfg.slack_bot_token, cfg.slack_channel_id),
            drafter=Drafter(cfg.anthropic_model),
        )

    def client_rows(self) -> list[list[str]]:
        return self.sheets.get_values(self.cfg.clients_sheet_id, f"'{self.cfg.clients_tab}'!A1:DZ")

    def seo_clients(self) -> list[Client]:
        return parse_clients(self.client_rows())

    def all_clients(self) -> list[Client]:
        return parse_clients(self.client_rows(), seo_only=False)
