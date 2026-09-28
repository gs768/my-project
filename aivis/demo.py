"""Seed a demo project with 30 days of synthetic history."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from . import runner
from .db import Database

BRAND = ("Acme CRM", ["Acme"], ["acmecrm.com"])
COMPETITORS = [
    ("HubSpot", [], ["hubspot.com"], "#eb6834"),
    ("Salesforce", ["Sales Cloud"], ["salesforce.com"], "#1baf7a"),
    ("Pipedrive", [], ["pipedrive.com"], "#eda100"),
    ("Zoho CRM", ["Zoho"], ["zoho.com"], "#e87ba4"),
    ("Close", ["Close.com"], ["close.com"], "#008300"),
]
PROMPTS = [
    ("What is the best CRM for small businesses?", ["discovery", "smb"]),
    ("Which CRM is easiest to set up for a 10-person sales team?", ["discovery", "smb"]),
    ("Best CRM for startups in 2026", ["discovery"]),
    ("What are the best alternatives to Salesforce?", ["alternatives"]),
    ("HubSpot vs Pipedrive vs Acme CRM — which should I pick?", ["comparison", "branded"]),
    ("What CRM has the best email automation?", ["features"]),
    ("Most affordable CRM with a good mobile app", ["pricing"]),
    ("Which CRM integrates best with Gmail and Slack?", ["features"]),
    ("Is Acme CRM worth it?", ["branded"]),
    ("Top CRM tools for B2B SaaS companies", ["discovery", "enterprise"]),
]


def seed(db: Database, days: int = 30) -> int:
    pid = db.create_project("Acme CRM (demo)", BRAND[0], BRAND[1], BRAND[2],
                            models=["demo-a", "demo-b", "demo-c"])
    for name, aliases, domains, color in COMPETITORS:
        db.add_entity(pid, name, aliases, domains, color)
    for text, tags in PROMPTS:
        db.add_prompt(pid, text, tags)
    today = date.today()
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        stamp = datetime.combine(d, time(6, 0), timezone.utc).isoformat()
        runner.execute_run(db, pid, "scheduled", day=d, created_at=stamp)
    return pid
