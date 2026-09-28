"""Aggregations behind the dashboard.

Definitions (matching how AI-visibility tools usually report):
  visibility      share of answers that mention the brand at least once
  share of voice  brand's mentions / all tracked-brand mentions, counted per answer
  position        rank among tracked brands by first appearance (1 = mentioned first)
  sentiment       0-100, 50 = neutral, averaged over answers that mention the brand
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta

from .db import Database


@dataclass
class Filters:
    project_id: int
    start: date | None = None
    end: date | None = None
    models: list[str] = field(default_factory=list)
    tag: str | None = None
    prompt_id: int | None = None

    def shifted_back(self) -> "Filters | None":
        if not (self.start and self.end):
            return None
        span = (self.end - self.start).days + 1
        return Filters(self.project_id, self.start - timedelta(days=span), self.start - timedelta(days=1),
                       self.models, self.tag, self.prompt_id)


def default_filters(db: Database, project_id: int, days: int = 30, **kw) -> Filters:
    last = db.one("SELECT MAX(date(created_at)) AS d FROM responses WHERE project_id = ?", (project_id,))
    end = date.fromisoformat(last["d"]) if last and last["d"] else date.today()
    return Filters(project_id, end - timedelta(days=days - 1), end, **kw)


def _where(f: Filters) -> tuple[str, list]:
    sql = ["r.project_id = ?", "r.text IS NOT NULL"]
    params: list = [f.project_id]
    if f.start:
        sql.append("date(r.created_at) >= ?"); params.append(f.start.isoformat())
    if f.end:
        sql.append("date(r.created_at) <= ?"); params.append(f.end.isoformat())
    if f.models:
        sql.append(f"r.model IN ({','.join('?' * len(f.models))})"); params += f.models
    if f.tag:
        sql.append("p.tags LIKE ?"); params.append(f'%{json.dumps(f.tag)}%')
    if f.prompt_id:
        sql.append("r.prompt_id = ?"); params.append(f.prompt_id)
    return " AND ".join(sql), params


def _responses(db: Database, f: Filters) -> list[dict]:
    where, params = _where(f)
    return db.all(f"SELECT r.id, r.prompt_id, r.model, date(r.created_at) AS day FROM responses r "
                  f"JOIN prompts p ON p.id = r.prompt_id WHERE {where}", params)


def _mentions(db: Database, f: Filters) -> list[dict]:
    where, params = _where(f)
    return db.all(f"SELECT m.*, r.prompt_id, r.model, date(r.created_at) AS day FROM mentions m "
                  f"JOIN responses r ON r.id = m.response_id JOIN prompts p ON p.id = r.prompt_id "
                  f"WHERE {where}", params)


def _pct(n, d):
    return round(100 * n / d, 1) if d else 0.0


def _avg(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 1) if xs else None


def brand_table(db: Database, f: Filters, compare: bool = True) -> list[dict]:
    entities = db.entities(f.project_id)
    total = len(_responses(db, f))
    ms = _mentions(db, f)
    by_e = defaultdict(list)
    for m in ms:
        by_e[m["entity_id"]].append(m)
    all_mentions = len(ms)
    prev = {r["id"]: r for r in brand_table(db, f.shifted_back(), False)} if compare and f.shifted_back() else {}
    rows = []
    for e in entities:
        em = by_e.get(e["id"], [])
        row = {
            "id": e["id"], "name": e["name"], "is_own": bool(e["is_own"]), "color": e["color"],
            "responses": len(em), "total": total,
            "visibility": _pct(len(em), total),
            "share_of_voice": _pct(len(em), all_mentions),
            "position": _avg([m["position"] for m in em]),
            "sentiment": _avg([m["sentiment"] for m in em]),
        }
        p = prev.get(e["id"])
        if p and p["total"]:
            row["visibility_delta"] = round(row["visibility"] - p["visibility"], 1)
            row["sov_delta"] = round(row["share_of_voice"] - p["share_of_voice"], 1)
            row["position_delta"] = (round(row["position"] - p["position"], 1)
                                     if row["position"] and p["position"] else None)
            row["sentiment_delta"] = (round(row["sentiment"] - p["sentiment"], 1)
                                      if row["sentiment"] and p["sentiment"] else None)
        rows.append(row)
    rows.sort(key=lambda r: (-r["visibility"], r["name"]))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


def timeseries(db: Database, f: Filters, metric: str = "visibility") -> dict:
    entities = db.entities(f.project_id)
    per_day = Counter(r["day"] for r in _responses(db, f))
    ms = _mentions(db, f)
    days = sorted(per_day)
    series = []
    for e in entities:
        em = [m for m in ms if m["entity_id"] == e["id"]]
        pts = []
        for d in days:
            dm = [m for m in em if m["day"] == d]
            if metric == "visibility":
                v = _pct(len(dm), per_day[d])
            elif metric == "share_of_voice":
                v = _pct(len(dm), sum(1 for m in ms if m["day"] == d))
            elif metric == "position":
                v = _avg([m["position"] for m in dm])
            else:
                v = _avg([m["sentiment"] for m in dm])
            pts.append(v)
        series.append({"id": e["id"], "name": e["name"], "color": e["color"],
                       "is_own": bool(e["is_own"]), "data": pts})
    return {"labels": days, "series": series, "metric": metric}


def by_model(db: Database, f: Filters) -> list[dict]:
    own = next((e for e in db.entities(f.project_id) if e["is_own"]), None)
    resp = _responses(db, f)
    ms = [m for m in _mentions(db, f) if own and m["entity_id"] == own["id"]]
    out = []
    for model in sorted({r["model"] for r in resp}):
        n = sum(1 for r in resp if r["model"] == model)
        mm = [m for m in ms if m["model"] == model]
        out.append({"model": model, "responses": n, "visibility": _pct(len(mm), n),
                    "position": _avg([m["position"] for m in mm]),
                    "sentiment": _avg([m["sentiment"] for m in mm])})
    return out


def prompt_table(db: Database, f: Filters) -> list[dict]:
    entities = {e["id"]: e for e in db.entities(f.project_id)}
    own_id = next((i for i, e in entities.items() if e["is_own"]), None)
    resp = _responses(db, f)
    ms = _mentions(db, f)
    n_by_prompt = Counter(r["prompt_id"] for r in resp)
    out = []
    for p in db.prompts(f.project_id):
        if f.tag and f.tag not in p["tags"]:
            continue
        n = n_by_prompt.get(p["id"], 0)
        pm = [m for m in ms if m["prompt_id"] == p["id"]]
        counts = Counter(m["entity_id"] for m in pm)
        own = [m for m in pm if m["entity_id"] == own_id]
        comps = [(entities[eid]["name"], c) for eid, c in counts.most_common()
                 if eid != own_id and eid in entities]
        out.append({
            "id": p["id"], "text": p["text"], "tags": p["tags"], "active": bool(p["active"]),
            "responses": n, "visibility": _pct(len(own), n),
            "position": _avg([m["position"] for m in own]),
            "sentiment": _avg([m["sentiment"] for m in own]),
            "top_competitor": comps[0][0] if comps else None,
            "top_competitor_visibility": _pct(comps[0][1], n) if comps else 0.0,
            "brands": [{"name": entities[eid]["name"], "color": entities[eid]["color"], "pct": _pct(c, n)}
                       for eid, c in counts.most_common() if eid in entities],
        })
    return out


def opportunities(db: Database, f: Filters, limit: int = 10) -> list[dict]:
    """Prompts where competitors show up and you don't — the biggest gaps first."""
    rows = [r for r in prompt_table(db, f) if r["responses"]]
    for r in rows:
        r["gap"] = round(r["top_competitor_visibility"] - r["visibility"], 1)
    return sorted([r for r in rows if r["gap"] > 0], key=lambda r: -r["gap"])[:limit]


def sources(db: Database, f: Filters, limit: int = 100) -> dict:
    where, params = _where(f)
    cites = db.all(f"SELECT c.*, r.id AS rid FROM citations c JOIN responses r ON r.id = c.response_id "
                   f"JOIN prompts p ON p.id = r.prompt_id WHERE {where}", params)
    total = len(_responses(db, f))
    own = next((e for e in db.entities(f.project_id) if e["is_own"]), None)
    own_resp = {m["response_id"] for m in _mentions(db, f) if own and m["entity_id"] == own["id"]}
    dom = defaultdict(lambda: {"responses": set(), "citations": 0, "positions": [], "type": ""})
    urls = defaultdict(lambda: {"responses": set(), "citations": 0, "title": "", "domain": "", "type": ""})
    for c in cites:
        d = dom[c["domain"]]
        d["responses"].add(c["rid"]); d["citations"] += 1; d["positions"].append(c["position"])
        d["type"] = c["source_type"]
        u = urls[c["url"]]
        u["responses"].add(c["rid"]); u["citations"] += 1
        u["title"] = u["title"] or c["title"]; u["domain"] = c["domain"]; u["type"] = c["source_type"]
    domains = [{
        "domain": k, "type": v["type"], "citations": v["citations"],
        "used": _pct(len(v["responses"]), total),
        "position": _avg(v["positions"]),
        # How often answers citing this domain also mention you.
        "you_mentioned": _pct(len(v["responses"] & own_resp), len(v["responses"])),
    } for k, v in dom.items()]
    domains.sort(key=lambda d: (-d["used"], -d["citations"]))
    url_rows = [{"url": k, "title": v["title"], "domain": v["domain"], "type": v["type"],
                 "citations": v["citations"], "used": _pct(len(v["responses"]), total)}
                for k, v in urls.items()]
    url_rows.sort(key=lambda u: (-u["citations"], u["url"]))
    types = Counter(c["source_type"] for c in cites)
    return {"domains": domains[:limit], "urls": url_rows[:limit], "total_responses": total,
            "types": [{"type": t, "citations": n, "pct": _pct(n, len(cites))} for t, n in types.most_common()]}


def responses(db: Database, f: Filters, entity_id: int | None = None, limit: int = 50,
              offset: int = 0) -> list[dict]:
    where, params = _where(f)
    if entity_id:
        where += " AND r.id IN (SELECT response_id FROM mentions WHERE entity_id = ?)"
        params.append(entity_id)
    rows = db.all(f"SELECT r.id, r.model, r.created_at, r.text, p.text AS prompt, p.id AS prompt_id "
                  f"FROM responses r JOIN prompts p ON p.id = r.prompt_id WHERE {where} "
                  f"ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?", [*params, limit, offset])
    if not rows:
        return rows
    ids = [r["id"] for r in rows]
    q = ",".join("?" * len(ids))
    ents = {e["id"]: e for e in db.entities(f.project_id)}
    ms = db.all(f"SELECT * FROM mentions WHERE response_id IN ({q}) ORDER BY position", ids)
    cs = db.all(f"SELECT response_id, COUNT(*) AS n FROM citations WHERE response_id IN ({q}) "
                f"GROUP BY response_id", ids)
    ncites = {c["response_id"]: c["n"] for c in cs}
    for r in rows:
        r["mentions"] = [{"name": ents[m["entity_id"]]["name"], "color": ents[m["entity_id"]]["color"],
                          "is_own": bool(ents[m["entity_id"]]["is_own"]), "position": m["position"],
                          "sentiment": m["sentiment"]}
                         for m in ms if m["response_id"] == r["id"] and m["entity_id"] in ents]
        r["citations"] = ncites.get(r["id"], 0)
        r["excerpt"] = (r["text"] or "")[:280]
    return rows


def tags(db: Database, project_id: int) -> list[str]:
    return sorted({t for p in db.prompts(project_id) for t in p["tags"]})


def models_used(db: Database, project_id: int) -> list[str]:
    return [r["model"] for r in db.all("SELECT DISTINCT model FROM responses WHERE project_id = ? ORDER BY model",
                                       (project_id,))]
