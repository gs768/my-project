"""FastAPI web app: dashboard pages, JSON API and CSV exports."""
from __future__ import annotations

import base64
import csv
import io
import logging
import secrets
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from . import analysis, config, metrics, providers, runner, scheduler, suggest
from .db import Database

log = logging.getLogger("aivis")
HERE = Path(__file__).parent
templates = Jinja2Templates(directory=HERE / "templates")
templates.env.globals["model_label"] = providers.label
templates.env.filters["pct"] = lambda v: "–" if v is None else f"{v:.0f}%"
templates.env.globals["cfg"] = config


def url_with(request, **changes) -> str:
    """Current URL with some query params replaced (None removes them)."""
    params = [(k, v) for k, v in request.query_params.multi_items() if k not in changes]
    params += [(k, str(v)) for k, v in changes.items() if v is not None]
    from urllib.parse import urlencode
    return request.url.path + ("?" + urlencode(params) if params else "")


templates.env.globals["url_with"] = url_with
templates.env.filters["num"] = lambda v: "–" if v is None else f"{v:.1f}"


def _split(s: str) -> list[str]:
    return [x.strip() for x in (s or "").replace("\n", ",").split(",") if x.strip()]


def create_app(db_path: str | None = None, start_scheduler: bool = True) -> FastAPI:
    db = Database(db_path)

    @asynccontextmanager
    async def lifespan(app):
        runner.recover_stale_runs(db)
        stop = scheduler.start(db) if (start_scheduler and config.SCHEDULE) else None
        yield
        if stop:
            stop.set()

    app = FastAPI(title="AI Visibility Tracker", lifespan=lifespan)
    app.state.db = db
    app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")

    @app.middleware("http")
    async def basic_auth(request: Request, call_next):
        if config.AUTH_PASSWORD:
            header = request.headers.get("authorization", "")
            ok = False
            if header.startswith("Basic "):
                try:
                    user, _, pw = base64.b64decode(header[6:]).decode().partition(":")
                    ok = (secrets.compare_digest(user, config.AUTH_USER or user)
                          and secrets.compare_digest(pw, config.AUTH_PASSWORD))
                except Exception:
                    ok = False
            if not ok:
                return Response("Authentication required", 401, {"WWW-Authenticate": 'Basic realm="aivis"'})
        return await call_next(request)

    # ---- helpers ------------------------------------------------------
    def project_or_404(pid: int) -> dict:
        p = db.project(pid)
        if not p:
            raise HTTPException(404, "project not found")
        return p

    def filters_from(request: Request, pid: int) -> metrics.Filters:
        q = request.query_params
        days = int(q.get("days") or 30)
        f = metrics.default_filters(db, pid, days)
        if q.get("start"):
            f.start = date.fromisoformat(q["start"])
        if q.get("end"):
            f.end = date.fromisoformat(q["end"])
        f.models = [m for m in q.getlist("model") if m]
        f.tag = q.get("tag") or None
        return f

    def render(request: Request, name: str, pid: int | None = None, **ctx):
        base = {"request": request, "projects": db.projects()}
        if pid is not None:
            p = project_or_404(pid)
            f = ctx.get("f")
            base.update(project=p, pid=pid, running=runner.is_running(pid),
                        all_tags=metrics.tags(db, pid), all_models=metrics.models_used(db, pid),
                        days=int(request.query_params.get("days") or 30),
                        qs=str(request.query_params), sel_models=f.models if f else [],
                        sel_tag=f.tag if f else None)
        base.update(ctx)
        return templates.TemplateResponse(request, name, base)

    def back(url: str):
        return RedirectResponse(url, status_code=303)

    # ---- projects -----------------------------------------------------
    @app.get("/", response_class=HTMLResponse)
    def home(request: Request):
        ps = db.projects()
        if len(ps) == 1:
            return back(f"/p/{ps[0]['id']}")
        return render(request, "home.html", providers_list=providers.available())

    @app.get("/new", response_class=HTMLResponse)
    def new_project_page(request: Request):
        return render(request, "home.html", providers_list=providers.available(), force_new=True)

    @app.post("/projects")
    def create_project(name: str = Form(...), brand: str = Form(...), aliases: str = Form(""),
                       domains: str = Form(""), competitors: str = Form(""), country: str = Form("US"),
                       models: list[str] = Form([])):
        pid = db.create_project(name.strip(), brand.strip(), _split(aliases), _split(domains),
                                country.strip().upper() or "US", models=models)
        for line in (competitors or "").splitlines():
            parts = [x.strip() for x in line.split("|")]
            if parts and parts[0]:
                db.add_entity(pid, parts[0], _split(parts[1]) if len(parts) > 1 else [],
                              _split(parts[2]) if len(parts) > 2 else [])
        return back(f"/p/{pid}/prompts")

    # ---- overview -----------------------------------------------------
    @app.get("/p/{pid}", response_class=HTMLResponse)
    def overview(request: Request, pid: int):
        project_or_404(pid)
        f = filters_from(request, pid)
        brands = metrics.brand_table(db, f)
        own = next((b for b in brands if b["is_own"]), None)
        src = metrics.sources(db, f, limit=8)
        return render(request, "overview.html", pid, f=f, brands=brands, own=own,
                      by_model=metrics.by_model(db, f), opps=metrics.opportunities(db, f, 6),
                      sources=src, series=metrics.timeseries(db, f, request.query_params.get("metric", "visibility")),
                      metric=request.query_params.get("metric", "visibility"),
                      has_data=bool(own and own["total"]),
                      last_run=db.one("SELECT * FROM runs WHERE project_id = ? ORDER BY id DESC LIMIT 1", (pid,)))

    # ---- prompts ------------------------------------------------------
    @app.get("/p/{pid}/prompts", response_class=HTMLResponse)
    def prompts_page(request: Request, pid: int):
        project_or_404(pid)
        f = filters_from(request, pid)
        return render(request, "prompts.html", pid, f=f, rows=metrics.prompt_table(db, f),
                      suggestions=None)

    @app.post("/p/{pid}/prompts")
    def add_prompts(pid: int, texts: str = Form(...), tags: str = Form("")):
        project_or_404(pid)
        existing = {p["text"].lower() for p in db.prompts(pid)}
        for line in texts.splitlines():
            if line.strip() and line.strip().lower() not in existing:
                db.add_prompt(pid, line, _split(tags))
                existing.add(line.strip().lower())
        return back(f"/p/{pid}/prompts")

    @app.post("/p/{pid}/prompts/suggest", response_class=HTMLResponse)
    def suggest_prompts(request: Request, pid: int, category: str = Form(...)):
        project_or_404(pid)
        f = filters_from(request, pid)
        return render(request, "prompts.html", pid, f=f, rows=metrics.prompt_table(db, f),
                      suggestions=suggest.suggest_prompts(db, pid, category.strip()), category=category)

    @app.post("/p/{pid}/prompts/{prompt_id}/toggle")
    def toggle_prompt(pid: int, prompt_id: int):
        db.execute("UPDATE prompts SET active = 1 - active WHERE id = ? AND project_id = ?", (prompt_id, pid))
        return back(f"/p/{pid}/prompts")

    @app.post("/p/{pid}/prompts/{prompt_id}/tags")
    def retag_prompt(pid: int, prompt_id: int, tags: str = Form("")):
        import json
        db.execute("UPDATE prompts SET tags = ? WHERE id = ? AND project_id = ?",
                   (json.dumps(sorted({t.lower() for t in _split(tags)})), prompt_id, pid))
        return back(f"/p/{pid}/prompts/{prompt_id}")

    @app.post("/p/{pid}/prompts/{prompt_id}/delete")
    def delete_prompt(pid: int, prompt_id: int):
        db.execute("DELETE FROM prompts WHERE id = ? AND project_id = ?", (prompt_id, pid))
        return back(f"/p/{pid}/prompts")

    @app.get("/p/{pid}/prompts/{prompt_id}", response_class=HTMLResponse)
    def prompt_detail(request: Request, pid: int, prompt_id: int):
        project_or_404(pid)
        prompt = db.one("SELECT * FROM prompts WHERE id = ? AND project_id = ?", (prompt_id, pid))
        if not prompt:
            raise HTTPException(404)
        import json
        prompt["tags"] = json.loads(prompt["tags"])
        f = filters_from(request, pid)
        f.prompt_id = prompt_id
        return render(request, "prompt_detail.html", pid, f=f, prompt=prompt,
                      brands=metrics.brand_table(db, f), by_model=metrics.by_model(db, f),
                      sources=metrics.sources(db, f, 10), responses=metrics.responses(db, f, limit=30),
                      series=metrics.timeseries(db, f))

    # ---- sources ------------------------------------------------------
    @app.get("/p/{pid}/sources", response_class=HTMLResponse)
    def sources_page(request: Request, pid: int):
        project_or_404(pid)
        f = filters_from(request, pid)
        return render(request, "sources.html", pid, f=f, sources=metrics.sources(db, f, 200),
                      view=request.query_params.get("view", "domains"))

    # ---- responses ----------------------------------------------------
    @app.get("/p/{pid}/responses", response_class=HTMLResponse)
    def responses_page(request: Request, pid: int):
        project_or_404(pid)
        f = filters_from(request, pid)
        page = max(1, int(request.query_params.get("page") or 1))
        eid = int(request.query_params.get("brand") or 0) or None
        rows = metrics.responses(db, f, eid, limit=25, offset=(page - 1) * 25)
        return render(request, "responses.html", pid, f=f, rows=rows, page=page, brand=eid,
                      entities=db.entities(pid))

    @app.get("/p/{pid}/responses/{rid}", response_class=HTMLResponse)
    def response_detail(request: Request, pid: int, rid: int):
        project_or_404(pid)
        r = db.one("SELECT r.*, p.text AS prompt FROM responses r JOIN prompts p ON p.id = r.prompt_id "
                   "WHERE r.id = ? AND r.project_id = ?", (rid, pid))
        if not r:
            raise HTTPException(404)
        ents = {e["id"]: e for e in db.entities(pid)}
        ms = db.all("SELECT * FROM mentions WHERE response_id = ? ORDER BY position", (rid,))
        for m in ms:
            m["entity"] = ents.get(m["entity_id"])
        cites = db.all("SELECT * FROM citations WHERE response_id = ? ORDER BY position", (rid,))
        return render(request, "response_detail.html", pid, r=r, mentions=ms, citations=cites,
                      highlighted=highlight(r["text"] or "", list(ents.values())))

    # ---- runs ---------------------------------------------------------
    @app.post("/p/{pid}/run")
    def run_now(pid: int):
        p = project_or_404(pid)
        if not p["models"]:
            raise HTTPException(400, "enable at least one model in Settings first")
        runner.start_background_run(db, pid, "manual")
        return back(f"/p/{pid}/runs")

    @app.get("/p/{pid}/runs", response_class=HTMLResponse)
    def runs_page(request: Request, pid: int):
        project_or_404(pid)
        runs = db.all("SELECT * FROM runs WHERE project_id = ? ORDER BY id DESC LIMIT 100", (pid,))
        errors = db.all("SELECT r.model, r.error, r.created_at, p.text AS prompt FROM responses r "
                        "JOIN prompts p ON p.id = r.prompt_id WHERE r.project_id = ? AND r.error IS NOT NULL "
                        "ORDER BY r.id DESC LIMIT 20", (pid,))
        return render(request, "runs.html", pid, runs=runs, errors=errors)

    # ---- settings -----------------------------------------------------
    @app.get("/p/{pid}/settings", response_class=HTMLResponse)
    def settings_page(request: Request, pid: int):
        project_or_404(pid)
        return render(request, "settings.html", pid, entities=db.entities(pid),
                      providers_list=providers.available(),
                      discovered=suggest.suggest_competitors(db, pid),
                      analysis=providers.analysis_provider(), cfg=config)

    @app.post("/p/{pid}/settings")
    def save_settings(pid: int, name: str = Form(...), country: str = Form("US"),
                      models: list[str] = Form([])):
        p = project_or_404(pid)
        # Keep demo models on demo projects; they aren't offered as checkboxes.
        models = models + [m for m in p["models"] if m.startswith("demo")]
        db.update_project(pid, name=name.strip(), country=country.strip().upper() or "US", models=models)
        return back(f"/p/{pid}/settings")

    @app.post("/p/{pid}/entities")
    def add_entity(pid: int, name: str = Form(...), aliases: str = Form(""), domains: str = Form("")):
        project_or_404(pid)
        db.add_entity(pid, name.strip(), _split(aliases), _split(domains))
        runner.reanalyze(db, pid)
        return back(f"/p/{pid}/settings")

    @app.post("/p/{pid}/entities/{eid}")
    def edit_entity(pid: int, eid: int, name: str = Form(...), aliases: str = Form(""),
                    domains: str = Form(""), color: str = Form("#888888")):
        db.update_entity(eid, name.strip(), _split(aliases), _split(domains), color)
        runner.reanalyze(db, pid)
        return back(f"/p/{pid}/settings")

    @app.post("/p/{pid}/entities/{eid}/delete")
    def delete_entity(pid: int, eid: int):
        db.execute("DELETE FROM entities WHERE id = ? AND project_id = ? AND is_own = 0", (eid, pid))
        return back(f"/p/{pid}/settings")

    @app.post("/p/{pid}/delete")
    def delete_project(pid: int):
        db.execute("DELETE FROM projects WHERE id = ?", (pid,))
        return back("/")

    # ---- exports ------------------------------------------------------
    @app.get("/p/{pid}/export/{kind}.csv")
    def export(request: Request, pid: int, kind: str):
        project_or_404(pid)
        f = filters_from(request, pid)
        if kind == "brands":
            rows = metrics.brand_table(db, f, compare=False)
        elif kind == "prompts":
            rows = [{k: v for k, v in r.items() if k != "brands"} for r in metrics.prompt_table(db, f)]
        elif kind == "sources":
            rows = metrics.sources(db, f, 10_000)["domains"]
        elif kind == "urls":
            rows = metrics.sources(db, f, 10_000)["urls"]
        elif kind == "responses":
            where, params = metrics._where(f)
            rows = db.all(f"SELECT r.id, r.created_at, r.model, r.model_version, p.text AS prompt, p.tags, "
                          f"r.text AS response FROM responses r JOIN prompts p ON p.id = r.prompt_id "
                          f"WHERE {where} ORDER BY r.id", params)
        elif kind == "mentions":
            where, params = metrics._where(f)
            rows = db.all(f"SELECT r.id AS response_id, r.created_at, r.model, p.text AS prompt, e.name AS brand, "
                          f"m.position, m.count, m.sentiment, m.snippet FROM mentions m "
                          f"JOIN responses r ON r.id = m.response_id JOIN prompts p ON p.id = r.prompt_id "
                          f"JOIN entities e ON e.id = m.entity_id WHERE {where} ORDER BY r.id, m.position", params)
        else:
            raise HTTPException(404)
        buf = io.StringIO()
        if rows:
            w = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                                 headers={"Content-Disposition": f'attachment; filename="{kind}-{pid}.csv"'})

    # ---- JSON API -----------------------------------------------------
    @app.get("/api/projects")
    def api_projects():
        return db.projects()

    @app.get("/api/projects/{pid}/brands")
    def api_brands(request: Request, pid: int):
        project_or_404(pid)
        return metrics.brand_table(db, filters_from(request, pid))

    @app.get("/api/projects/{pid}/timeseries")
    def api_timeseries(request: Request, pid: int, metric: str = "visibility"):
        project_or_404(pid)
        return metrics.timeseries(db, filters_from(request, pid), metric)

    @app.get("/api/projects/{pid}/prompts")
    def api_prompts(request: Request, pid: int):
        project_or_404(pid)
        return metrics.prompt_table(db, filters_from(request, pid))

    @app.get("/api/projects/{pid}/sources")
    def api_sources(request: Request, pid: int):
        project_or_404(pid)
        return metrics.sources(db, filters_from(request, pid))

    @app.get("/api/projects/{pid}/responses")
    def api_responses(request: Request, pid: int, limit: int = 50, offset: int = 0):
        project_or_404(pid)
        return metrics.responses(db, filters_from(request, pid), limit=min(limit, 500), offset=offset)

    @app.post("/api/projects/{pid}/runs")
    def api_run(pid: int):
        project_or_404(pid)
        rid = runner.start_background_run(db, pid, "api")
        if rid is None:
            return JSONResponse({"error": "a run is already in progress"}, 409)
        return {"run_id": rid}

    @app.get("/api/runs/{rid}")
    def api_run_status(rid: int):
        r = db.one("SELECT * FROM runs WHERE id = ?", (rid,))
        if not r:
            raise HTTPException(404)
        return r

    return app


def highlight(text: str, entities: list[dict]) -> str:
    """HTML-escape the answer and wrap brand mentions in coloured <mark>s."""
    from html import escape
    spans = []
    for e in entities:
        for s, t in analysis.find_occurrences(text, e):
            spans.append((s, t, e))
    spans.sort(key=lambda x: (x[0], -(x[1] - x[0])))
    out, pos = [], 0
    for s, t, e in spans:
        if s < pos:
            continue
        out.append(escape(text[pos:s]))
        cls = "mark own" if e["is_own"] else "mark"
        out.append(f'<mark class="{cls}" style="--c:{e["color"]}">{escape(text[s:t])}</mark>')
        pos = t
    out.append(escape(text[pos:]))
    html = "".join(out)
    # Light markdown so answers read like they do in the assistant's UI.
    import re
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
    html = re.sub(r"(?m)^#{1,6} (.+)$", r"<strong>\1</strong>", html)
    return html
