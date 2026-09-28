"""Read the client master sheet and pick the Google Business Profiles to audit."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# Row 1 of "Clients Master" is a group-header row; row 2 holds the column names.
HEADER_ROW = 2

COL_CLIENT = "Client Location"
COL_BUSINESS = "Business Name"
COL_WEBSITE = "Website"
COL_MANAGER = "Account Manager"
COL_SEO = "SEO"
COL_STATUS = "Client Status"
COL_INQUIRIES = "General Inquiries - Emails"
COL_LOCATION_ID = "GBP Location ID"
COL_RESOURCE = "GBP Resource Name"
COL_FIRM_TYPE = "Type of Firm"
COL_PRACTICE = "Practice Area"
COL_GBP_URL = "GBP URL"

_EMAIL_RE = re.compile(r"[\w.+'-]+@[\w-]+(?:\.[\w-]+)+")


@dataclass
class Client:
    row_number: int
    client_location: str
    business_name: str
    website: str
    account_manager: str
    status: str
    contacts: list[str]
    location_id: str
    resource_name: str
    firm_type: str
    practice_area: str
    gbp_url: str
    raw: dict[str, str] = field(default_factory=dict, repr=False)


def _truthy(value: str) -> bool:
    return value.strip().upper() in {"TRUE", "YES", "Y", "1", "X", "✓", "✔"}


def _header_index(headers: list[str]) -> dict[str, int]:
    """First occurrence wins: the sheet repeats names like SEO/Website in later groups."""
    index: dict[str, int] = {}
    for i, name in enumerate(headers):
        key = name.strip()
        if key and key not in index:
            index[key] = i
    return index


def parse_emails(value: str) -> list[str]:
    seen: list[str] = []
    for email in _EMAIL_RE.findall(value or ""):
        if email.lower() not in (e.lower() for e in seen):
            seen.append(email)
    return seen


def location_id_for(location_id: str, resource_name: str) -> str:
    location_id = (location_id or "").strip()
    if location_id.isdigit():
        return location_id
    match = re.search(r"locations/(\d+)", resource_name or "")
    return match.group(1) if match else ""


def parse_clients(values: list[list[str]], seo_only: bool = True) -> list[Client]:
    """Return client rows (by default only SEO-active ones) from raw sheet values."""
    if len(values) < HEADER_ROW:
        raise ValueError("Client sheet has no header row")
    headers = values[HEADER_ROW - 1]
    idx = _header_index(headers)
    missing = [c for c in (COL_CLIENT, COL_SEO) if c not in idx]
    if missing:
        raise ValueError(f"Client sheet is missing columns: {missing}")

    def cell(row: list[str], name: str) -> str:
        i = idx.get(name)
        return row[i].strip() if i is not None and i < len(row) else ""

    clients: list[Client] = []
    for offset, row in enumerate(values[HEADER_ROW:], start=HEADER_ROW + 1):
        name = cell(row, COL_CLIENT)
        if not name or (seo_only and not _truthy(cell(row, COL_SEO))):
            continue
        clients.append(
            Client(
                row_number=offset,
                client_location=name,
                business_name=cell(row, COL_BUSINESS) or name,
                website=cell(row, COL_WEBSITE),
                account_manager=cell(row, COL_MANAGER),
                status=cell(row, COL_STATUS),
                contacts=parse_emails(cell(row, COL_INQUIRIES)),
                location_id=location_id_for(cell(row, COL_LOCATION_ID), cell(row, COL_RESOURCE)),
                resource_name=cell(row, COL_RESOURCE),
                firm_type=cell(row, COL_FIRM_TYPE),
                practice_area=cell(row, COL_PRACTICE),
                gbp_url=cell(row, COL_GBP_URL),
                raw={h.strip(): cell(row, h.strip()) for h in headers if h.strip()},
            )
        )
    return clients
