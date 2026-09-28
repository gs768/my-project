"""SQLite storage layer."""
import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    language TEXT NOT NULL DEFAULT 'en',
    models TEXT NOT NULL DEFAULT '[]',          -- JSON list of provider keys
    created_at TEXT NOT NULL
);

-- Brands tracked in a project. Exactly one has is_own = 1 (your brand).
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_own INTEGER NOT NULL DEFAULT 0,
    aliases TEXT NOT NULL DEFAULT '[]',          -- JSON list
    domains TEXT NOT NULL DEFAULT '[]',          -- JSON list
    color TEXT NOT NULL DEFAULT '#888888'
);

CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',             -- JSON list
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'running',
    total INTEGER NOT NULL DEFAULT 0,
    done INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    finished_at TEXT
);

CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    model_version TEXT,
    text TEXT,
    error TEXT,
    latency_ms INTEGER,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_responses_project ON responses(project_id, created_at);

CREATE TABLE IF NOT EXISTS mentions (
    id INTEGER PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,                   -- 1 = first tracked brand mentioned
    count INTEGER NOT NULL,
    sentiment INTEGER,                           -- 0..100, 50 = neutral
    snippet TEXT
);
CREATE INDEX IF NOT EXISTS idx_mentions_response ON mentions(response_id);

CREATE TABLE IF NOT EXISTS citations (
    id INTEGER PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    title TEXT,
    position INTEGER NOT NULL,
    source_type TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_citations_response ON citations(response_id);
"""

# Categorical palette (validated for CVD separation in this order). Slot 1 is
# always your brand; competitors take the following slots in order.
PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]

_lock = threading.Lock()


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect(path: str | None = None) -> sqlite3.Connection:
    path = path or config.DATABASE_PATH
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(SCHEMA)
    return conn


class Database:
    """Thin wrapper that serialises writes across worker threads."""

    def __init__(self, path: str | None = None):
        self.conn = connect(path)

    @contextmanager
    def tx(self):
        with _lock:
            try:
                yield self.conn
                self.conn.commit()
            except Exception:
                self.conn.rollback()
                raise

    def all(self, sql: str, params=()) -> list[dict]:
        with _lock:
            return [dict(r) for r in self.conn.execute(sql, params).fetchall()]

    def one(self, sql: str, params=()) -> dict | None:
        with _lock:
            row = self.conn.execute(sql, params).fetchone()
        return dict(row) if row else None

    def insert(self, sql: str, params=()) -> int:
        with self.tx() as c:
            return c.execute(sql, params).lastrowid

    def execute(self, sql: str, params=()) -> None:
        with self.tx() as c:
            c.execute(sql, params)

    # ---- projects -----------------------------------------------------
    def create_project(self, name, brand, aliases=(), domains=(), country="US",
                       language="en", models=()) -> int:
        with self.tx() as c:
            pid = c.execute(
                "INSERT INTO projects (name, country, language, models, created_at) VALUES (?,?,?,?,?)",
                (name, country, language, json.dumps(list(models)), now()),
            ).lastrowid
            c.execute(
                "INSERT INTO entities (project_id, name, is_own, aliases, domains, color) VALUES (?,?,1,?,?,?)",
                (pid, brand, json.dumps(list(aliases)), json.dumps(list(domains)), PALETTE[0]),
            )
        return pid

    def project(self, pid: int) -> dict | None:
        p = self.one("SELECT * FROM projects WHERE id = ?", (pid,))
        if p:
            p["models"] = json.loads(p["models"])
        return p

    def projects(self) -> list[dict]:
        rows = self.all("SELECT * FROM projects ORDER BY id")
        for p in rows:
            p["models"] = json.loads(p["models"])
        return rows

    def update_project(self, pid, **fields):
        if "models" in fields:
            fields["models"] = json.dumps(list(fields["models"]))
        cols = ", ".join(f"{k} = ?" for k in fields)
        self.execute(f"UPDATE projects SET {cols} WHERE id = ?", (*fields.values(), pid))

    # ---- entities -----------------------------------------------------
    def entities(self, pid: int) -> list[dict]:
        rows = self.all("SELECT * FROM entities WHERE project_id = ? ORDER BY is_own DESC, name", (pid,))
        for e in rows:
            e["aliases"] = json.loads(e["aliases"])
            e["domains"] = json.loads(e["domains"])
        return rows

    def next_color(self, pid: int) -> str:
        used = {e["color"] for e in self.entities(pid)}
        return next((c for c in PALETTE[1:] if c not in used), "#8a8984")

    def add_entity(self, pid, name, aliases=(), domains=(), color=None, is_own=False) -> int:
        color = color or self.next_color(pid)
        return self.insert(
            "INSERT INTO entities (project_id, name, is_own, aliases, domains, color) VALUES (?,?,?,?,?,?)",
            (pid, name, int(is_own), json.dumps(list(aliases)), json.dumps(list(domains)), color),
        )

    def update_entity(self, eid, name, aliases, domains, color):
        self.execute(
            "UPDATE entities SET name = ?, aliases = ?, domains = ?, color = ? WHERE id = ?",
            (name, json.dumps(list(aliases)), json.dumps(list(domains)), color, eid),
        )

    # ---- prompts ------------------------------------------------------
    def prompts(self, pid: int, active_only=False) -> list[dict]:
        sql = "SELECT * FROM prompts WHERE project_id = ?"
        if active_only:
            sql += " AND active = 1"
        rows = self.all(sql + " ORDER BY id", (pid,))
        for p in rows:
            p["tags"] = json.loads(p["tags"])
        return rows

    def add_prompt(self, pid, text, tags=()) -> int:
        return self.insert(
            "INSERT INTO prompts (project_id, text, tags, created_at) VALUES (?,?,?,?)",
            (pid, text.strip(), json.dumps(sorted({t.strip().lower() for t in tags if t.strip()})), now()),
        )
