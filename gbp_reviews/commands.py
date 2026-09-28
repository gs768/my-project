"""Deterministic parsing of the short Slack thread commands.

Anything that isn't a clean command is treated as a free-form note and handed to
Claude (see Drafter.interpret_note), which can express the same operations.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

_REF_TOKEN = re.compile(r"^r?(\d+)(?:\s*-\s*r?(\d+))?$", re.I)

_VERBS = {
    "approve": "approve", "approved": "approve", "ok": "approve", "post": "approve", "yes": "approve",
    "client": "client_followup", "followup": "client_followup", "follow-up": "client_followup",
    "skip": "skip", "ignore": "skip",
}


@dataclass
class Command:
    type: str  # approve | client_followup | skip | edit
    refs: list[str] = field(default_factory=list)
    all: bool = False
    text: str = ""


def parse_refs(text: str) -> list[str] | None:
    """'R1, R3-R5 r7' -> ['R1','R3','R4','R5','R7']; None if anything isn't a ref."""
    normalised = re.sub(r"\s*[-–]\s*", "-", text.strip())  # "R3 - R5" -> "R3-R5"
    refs: list[str] = []
    for tok in re.split(r"[,\s]+", normalised):
        tok = tok.strip(",.;")
        if not tok or tok.lower() in {"and", "&"}:
            continue
        m = _REF_TOKEN.match(tok)
        if not m:
            return None
        lo = int(m.group(1))
        hi = int(m.group(2) or lo)
        if hi < lo or hi - lo > 500:
            return None
        refs.extend(f"R{n}" for n in range(lo, hi + 1))
    return refs or None


def parse_line(line: str) -> Command | None:
    line = line.strip().strip("`").strip()
    if not line:
        return None
    m = re.match(r"^edit\s+r?(\d+)\s*[:\-–]\s*(.+)$", line, re.I | re.S)
    if m:
        return Command("edit", [f"R{int(m.group(1))}"], text=m.group(2).strip())
    m = re.match(r"^(follow\s*up|[a-z-]+)\s*:?\s*(.*)$", line, re.I | re.S)
    if not m:
        return None
    verb = _VERBS.get(re.sub(r"\s+", "", m.group(1).lower()))
    if verb is None:
        return None
    rest = m.group(2).strip()
    if rest.lower() in {"all", "everything", "all auto", "all auto_reply"} and verb == "approve":
        # "approve all" = every item recommended for automatic reply.
        return Command(verb, all=True)
    refs = parse_refs(rest)
    if refs is None:
        return None
    return Command(verb, refs)


def parse_message(text: str) -> list[Command] | None:
    """All lines must be commands; otherwise return None (treat as a note)."""
    # Slack wraps pasted text in formatting; normalise a little.
    text = text.replace("’", "'").strip()
    if not text:
        return None
    # An edit may span multiple lines: take the whole message as its text.
    if re.match(r"^\s*`?edit\s+r?\d+\s*[:\-–]", text, re.I):
        cmd = parse_line(text)
        return [cmd] if cmd else None
    commands = []
    for line in text.splitlines():
        if not line.strip():
            continue
        cmd = parse_line(line)
        if cmd is None:
            return None
        commands.append(cmd)
    return commands or None
