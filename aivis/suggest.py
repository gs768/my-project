"""Prompt and competitor suggestions (LLM-assisted when a provider is configured)."""
from __future__ import annotations

import json
import re

from . import analysis, providers
from .db import Database

TEMPLATES = [
    "What is the best {category}?",
    "What are the top {category} options in {year}?",
    "{brand} vs {competitor}: which is better?",
    "What are the best alternatives to {competitor}?",
    "Which {category} is best for small businesses?",
    "Which {category} is best for enterprises?",
    "What is the most affordable {category}?",
    "Is {brand} worth it?",
    "What do people say about {brand}?",
    "Which {category} has the best customer support?",
]


def _json_list(text: str) -> list:
    m = re.search(r"\[.*\]", text or "", re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def suggest_prompts(db: Database, project_id: int, category: str, n: int = 15) -> list[dict]:
    entities = db.entities(project_id)
    own = next(e for e in entities if e["is_own"])
    comps = [e["name"] for e in entities if not e["is_own"]]
    existing = {p["text"].lower() for p in db.prompts(project_id)}
    llm = providers.analysis_provider()
    out: list[dict] = []
    if llm:
        ask = (
            f"You help a marketer track how AI assistants talk about their brand.\n"
            f"Brand: {own['name']}. Category: {category}. Competitors: {', '.join(comps) or 'unknown'}.\n"
            f"Write {n} realistic questions real people type into ChatGPT or Perplexity when researching "
            f"this category. Mix: discovery ('best X for Y'), comparison, alternatives, pricing, and "
            f"problem-led questions. Most should NOT name the brand. Return only a JSON array of objects "
            f'like {{"text": "...", "tags": ["discovery"]}}.'
        )
        try:
            for item in _json_list(llm.complete(ask)):
                if isinstance(item, dict) and item.get("text"):
                    out.append({"text": str(item["text"]).strip(),
                                "tags": [str(t) for t in item.get("tags", [])][:3]})
        except providers.ProviderError:
            out = []
    if not out:
        from datetime import date
        comp = comps[0] if comps else "the market leader"
        for t in TEMPLATES:
            text = t.format(category=category, brand=own["name"], competitor=comp, year=date.today().year)
            tag = ("branded" if own["name"] in text else "comparison" if comp in text else "discovery")
            out.append({"text": text, "tags": [tag]})
    return [s for s in out if s["text"].lower() not in existing][:n]


def suggest_competitors(db: Database, project_id: int) -> list[dict]:
    entities = db.entities(project_id)
    texts = [r["text"] for r in db.all(
        "SELECT text FROM responses WHERE project_id = ? AND text IS NOT NULL ORDER BY id DESC LIMIT 500",
        (project_id,))]
    total = len(texts) or 1
    return [{"name": name, "responses": c, "pct": round(100 * c / total, 1)}
            for name, c in analysis.discover_brands(texts, entities)]
