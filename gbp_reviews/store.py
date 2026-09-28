"""Private system spreadsheet: rules, exclusions, the review queue, batches, notes.

Everything the team may want to read or hand-edit lives here rather than in the
(public) repository. Each tab's first row is its header.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from .google_api import Sheets

GLOBAL = "ALL"

TABS: dict[str, list[str]] = {
    "Rules": ["Client Location", "Rule", "Active", "Added By", "Added On", "Source"],
    "Exclusions": ["Client Location", "Reason", "Active", "Added By", "Added On", "Source"],
    "Queue": [
        "Item ID", "Batch ID", "Ref", "Client Location", "Location ID", "Review Name",
        "Reviewer", "Stars", "Review Date", "Review Text", "Recommendation", "Reason",
        "Proposed Reply", "Final Reply", "Status", "Decided By", "Decided At", "Posted At",
        "Notes",
    ],
    "Batches": ["Batch ID", "Slack TS", "Created At", "Last Processed TS", "Status"],
    "Notes Log": ["Timestamp", "Batch ID", "Slack User", "Message", "Actions Applied"],
}

# Queue statuses
PENDING = "pending"
APPROVED = "approved"          # approved in Slack, waiting to be posted to Google
POSTED = "posted"
CLIENT_FOLLOWUP = "client_followup"
SKIPPED = "skipped"            # team said never reply; not proposed again
SUPERSEDED = "superseded"      # rolled into a newer weekly batch
ALREADY_REPLIED = "already_replied"
ERROR = "error"
OPEN_STATUSES = {PENDING, APPROVED, ERROR}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _col_letter(i: int) -> str:
    s, n = "", i + 1
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def _is_true(v: str) -> bool:
    return str(v).strip().upper() in {"TRUE", "YES", "1", ""}  # blank Active = active


@dataclass
class Row:
    tab: str
    number: int  # 1-based sheet row
    data: dict[str, str] = field(default_factory=dict)

    def get(self, key: str) -> str:
        return self.data.get(key, "")


class Store:
    def __init__(self, sheets: Sheets, spreadsheet_id: str):
        self.sheets = sheets
        self.id = spreadsheet_id
        self._pending_updates: list[dict] = []

    # ------------------------------------------------------------------ setup

    def ensure_tabs(self) -> list[str]:
        existing = set(self.sheets.sheet_titles(self.id))
        missing = [t for t in TABS if t not in existing]
        self.sheets.add_sheets(self.id, missing)
        for tab in TABS:
            header = self.sheets.get_values(self.id, f"'{tab}'!1:1")
            if not header or not any(header[0]):
                self.sheets.batch_update_values(
                    self.id, [{"range": f"'{tab}'!A1", "values": [TABS[tab]]}]
                )
        return missing

    # ------------------------------------------------------------------ generic

    def rows(self, tab: str) -> list[Row]:
        values = self.sheets.get_values(self.id, f"'{tab}'!A1:Z")
        if not values:
            return []
        header = [h.strip() for h in values[0]]
        out = []
        for n, raw in enumerate(values[1:], start=2):
            if not any(c.strip() for c in raw):
                continue
            out.append(Row(tab, n, {h: (raw[i] if i < len(raw) else "") for i, h in enumerate(header)}))
        return out

    def append(self, tab: str, records: list[dict]) -> None:
        cols = TABS[tab]
        self.sheets.append_rows(self.id, f"'{tab}'", [[r.get(c, "") for c in cols] for r in records])

    def set(self, row: Row, changes: dict[str, str]) -> None:
        """Queue cell updates (keyed by column name); call flush() to write."""
        cols = TABS[row.tab]
        for col, value in changes.items():
            if col not in cols:
                raise KeyError(f"{row.tab} has no column {col}")
            row.data[col] = value
            self._pending_updates.append(
                {"range": f"'{row.tab}'!{_col_letter(cols.index(col))}{row.number}", "values": [[value]]}
            )

    def flush(self) -> None:
        updates, self._pending_updates = self._pending_updates, []
        for i in range(0, len(updates), 500):
            self.sheets.batch_update_values(self.id, updates[i : i + 500])

    # ------------------------------------------------------------------ rules / exclusions

    def active_rules(self) -> list[Row]:
        return [r for r in self.rows("Rules") if r.get("Rule").strip() and _is_true(r.get("Active"))]

    def rules_for(self, rules: list[Row], client_location: str) -> tuple[list[str], list[str]]:
        key = client_location.strip().lower()
        global_rules = [r.get("Rule") for r in rules if r.get("Client Location").strip().upper() == GLOBAL]
        client_rules = [r.get("Rule") for r in rules if r.get("Client Location").strip().lower() == key]
        return global_rules, client_rules

    def active_exclusions(self) -> list[Row]:
        return [
            r for r in self.rows("Exclusions")
            if r.get("Client Location").strip() and _is_true(r.get("Active"))
        ]

    def add_rule(self, client_location: str, rule: str, by: str, source: str) -> None:
        self.append("Rules", [{
            "Client Location": client_location, "Rule": rule, "Active": "TRUE",
            "Added By": by, "Added On": now_iso(), "Source": source,
        }])

    def deactivate_rule(self, client_location: str, contains: str) -> int:
        n = 0
        for r in self.active_rules():
            if (r.get("Client Location").strip().lower() == client_location.strip().lower()
                    and contains.strip().lower() in r.get("Rule").lower()):
                self.set(r, {"Active": "FALSE"})
                n += 1
        self.flush()
        return n

    def add_exclusion(self, client_location: str, reason: str, by: str, source: str) -> None:
        self.append("Exclusions", [{
            "Client Location": client_location, "Reason": reason, "Active": "TRUE",
            "Added By": by, "Added On": now_iso(), "Source": source,
        }])

    def remove_exclusion(self, client_location: str) -> int:
        n = 0
        for r in self.active_exclusions():
            if r.get("Client Location").strip().lower() == client_location.strip().lower():
                self.set(r, {"Active": "FALSE"})
                n += 1
        self.flush()
        return n

    # ------------------------------------------------------------------ queue / batches

    def queue(self) -> list[Row]:
        return self.rows("Queue")

    def batches(self) -> list[Row]:
        return self.rows("Batches")

    def log_note(self, batch_id: str, user: str, message: str, actions: str) -> None:
        self.append("Notes Log", [{
            "Timestamp": now_iso(), "Batch ID": batch_id, "Slack User": user,
            "Message": message, "Actions Applied": actions,
        }])
