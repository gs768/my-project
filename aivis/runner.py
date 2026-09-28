"""Executes a tracking run: every active prompt x every enabled model."""
from __future__ import annotations

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date

from . import analysis, config, providers
from .db import Database, now

log = logging.getLogger("aivis.runner")
_active: dict[int, threading.Thread] = {}


def store_answer(db: Database, run_id: int, project_id: int, prompt_id: int, model: str,
                 answer: providers.Answer | None, entities: list[dict], error: str | None = None,
                 latency_ms: int | None = None, created_at: str | None = None) -> int:
    text = answer.text if answer else None
    with db.tx() as c:
        rid = c.execute(
            "INSERT INTO responses (run_id, project_id, prompt_id, model, model_version, text, error,"
            " latency_ms, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (run_id, project_id, prompt_id, model, answer.model_version if answer else None,
             text, error, latency_ms, created_at or now()),
        ).lastrowid
        if answer:
            for m in analysis.analyze_mentions(text, entities):
                c.execute("INSERT INTO mentions (response_id, entity_id, position, count, sentiment, snippet)"
                          " VALUES (?,?,?,?,?,?)",
                          (rid, m["entity_id"], m["position"], m["count"], m["sentiment"], m["snippet"]))
            for cit in analysis.extract_citations(answer.citations, text, entities):
                c.execute("INSERT INTO citations (response_id, url, domain, title, position, source_type)"
                          " VALUES (?,?,?,?,?,?)",
                          (rid, cit["url"], cit["domain"], cit["title"], cit["position"], cit["source_type"]))
    return rid


def reanalyze(db: Database, project_id: int) -> int:
    """Recompute mentions/citations for stored responses (after editing brands/aliases)."""
    entities = db.entities(project_id)
    rows = db.all("SELECT id, text FROM responses WHERE project_id = ? AND text IS NOT NULL", (project_id,))
    with db.tx() as c:
        for r in rows:
            old = [{"url": x["url"], "title": x["title"]} for x in
                   c.execute("SELECT url, title FROM citations WHERE response_id = ? ORDER BY position",
                             (r["id"],)).fetchall()]
            c.execute("DELETE FROM mentions WHERE response_id = ?", (r["id"],))
            c.execute("DELETE FROM citations WHERE response_id = ?", (r["id"],))
            for m in analysis.analyze_mentions(r["text"], entities):
                c.execute("INSERT INTO mentions (response_id, entity_id, position, count, sentiment, snippet)"
                          " VALUES (?,?,?,?,?,?)",
                          (r["id"], m["entity_id"], m["position"], m["count"], m["sentiment"], m["snippet"]))
            for cit in analysis.extract_citations(old, r["text"], entities):
                c.execute("INSERT INTO citations (response_id, url, domain, title, position, source_type)"
                          " VALUES (?,?,?,?,?,?)",
                          (r["id"], cit["url"], cit["domain"], cit["title"], cit["position"], cit["source_type"]))
    return len(rows)


def execute_run(db: Database, project_id: int, trigger: str = "manual", run_id: int | None = None,
                day: date | None = None, created_at: str | None = None) -> int:
    project = db.project(project_id)
    entities = db.entities(project_id)
    prompts = db.prompts(project_id, active_only=True)
    models = project["models"]
    jobs = [(p, m) for p in prompts for m in models for _ in range(config.SAMPLES_PER_PROMPT)]
    if run_id is None:
        run_id = db.insert("INSERT INTO runs (project_id, trigger, status, total, started_at) VALUES (?,?,?,?,?)",
                           (project_id, trigger, "running", len(jobs), created_at or now()))
    else:
        db.execute("UPDATE runs SET total = ? WHERE id = ?", (len(jobs), run_id))

    def work(job):
        prompt, model = job
        provider = providers.get(model, entities)
        t0 = time.monotonic()
        try:
            if isinstance(provider, providers.DemoProvider):
                answer = provider.ask(prompt["text"], project["country"], project["language"], day=day)
            else:
                answer = provider.ask(prompt["text"], project["country"], project["language"])
            err = None
        except Exception as e:  # noqa: BLE001 - one failed call shouldn't stop the run
            log.warning("%s failed on prompt %s: %s", model, prompt["id"], e)
            answer, err = None, str(e)[:1000]
        latency = int((time.monotonic() - t0) * 1000)
        store_answer(db, run_id, project_id, prompt["id"], model, answer, entities, err, latency, created_at)
        db.execute(f"UPDATE runs SET done = done + 1{', errors = errors + 1' if err else ''} WHERE id = ?",
                   (run_id,))

    with ThreadPoolExecutor(max_workers=max(1, config.MAX_WORKERS)) as pool:
        list(pool.map(work, jobs))
    stats = db.one("SELECT total, errors FROM runs WHERE id = ?", (run_id,))
    status = "failed" if stats["total"] and stats["errors"] == stats["total"] else "completed"
    db.execute("UPDATE runs SET status = ?, finished_at = ? WHERE id = ?", (status, created_at or now(), run_id))
    return run_id


def start_background_run(db: Database, project_id: int, trigger: str = "manual") -> int | None:
    """Kick off a run in a thread. Returns None if one is already running for the project."""
    t = _active.get(project_id)
    if t and t.is_alive():
        return None
    run_id = db.insert("INSERT INTO runs (project_id, trigger, status, total, started_at) VALUES (?,?,?,?,?)",
                       (project_id, trigger, "running", 0, now()))

    def target():
        try:
            execute_run(db, project_id, trigger, run_id)
        except Exception:
            log.exception("run %s crashed", run_id)
            db.execute("UPDATE runs SET status = 'failed', finished_at = ? WHERE id = ?", (now(), run_id))

    t = threading.Thread(target=target, daemon=True, name=f"run-{run_id}")
    _active[project_id] = t
    t.start()
    return run_id


def is_running(project_id: int) -> bool:
    t = _active.get(project_id)
    return bool(t and t.is_alive())


def recover_stale_runs(db: Database) -> None:
    """Runs left 'running' by a previous process can never finish; mark them."""
    db.execute("UPDATE runs SET status = 'interrupted', finished_at = ? WHERE status = 'running'", (now(),))
