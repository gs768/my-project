"""Daily scheduled runs, in-process."""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

from . import config, runner
from .db import Database

log = logging.getLogger("aivis.scheduler")


def due_projects(db: Database, when: datetime) -> list[int]:
    if when.hour < config.SCHEDULE_HOUR_UTC:
        return []
    today = when.date().isoformat()
    out = []
    for p in db.projects():
        if not p["models"] or not db.prompts(p["id"], active_only=True):
            continue
        done = db.one("SELECT 1 FROM runs WHERE project_id = ? AND trigger = 'scheduled' "
                      "AND date(started_at) = ?", (p["id"], today))
        if not done:
            out.append(p["id"])
    return out


def start(db: Database) -> threading.Event:
    stop = threading.Event()

    def loop():
        while not stop.wait(60):
            try:
                for pid in due_projects(db, datetime.now(timezone.utc)):
                    log.info("starting scheduled run for project %s", pid)
                    runner.start_background_run(db, pid, "scheduled")
            except Exception:
                log.exception("scheduler tick failed")

    threading.Thread(target=loop, daemon=True, name="scheduler").start()
    return stop
