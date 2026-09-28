from datetime import date

import pytest
from fastapi.testclient import TestClient

from aivis import analysis, demo, metrics, providers, runner
from aivis.app import create_app, highlight
from aivis.db import Database

ENTITIES = [
    {"id": 1, "name": "Acme CRM", "is_own": 1, "aliases": ["Acme"], "domains": ["acmecrm.com"], "color": "#2a78d6"},
    {"id": 2, "name": "HubSpot", "is_own": 0, "aliases": [], "domains": ["hubspot.com"], "color": "#eb6834"},
    {"id": 3, "name": "Close", "is_own": 0, "aliases": [], "domains": ["close.com"]},
]


def test_mentions_position_and_count():
    text = ("The best options are **HubSpot** and Acme CRM. HubSpot is popular.\n"
            "Acme is easy to use and reliable.")
    ms = {m["entity_id"]: m for m in analysis.analyze_mentions(text, ENTITIES)}
    assert ms[2]["position"] == 1 and ms[2]["count"] == 2
    assert ms[1]["position"] == 2 and ms[1]["count"] == 2   # "Acme CRM" + "Acme", no double count
    assert 3 not in ms


def test_capitalised_brand_requires_capital():
    assert not analysis.find_occurrences("We are close to launch.", ENTITIES[2])
    assert analysis.find_occurrences("Close is a CRM for calling.", ENTITIES[2])
    assert analysis.find_occurrences("see close.com for details", ENTITIES[2])


def test_sentiment_direction():
    assert analysis.sentiment_score(["Acme is excellent, reliable and easy."]) > 60
    assert analysis.sentiment_score(["Acme is expensive and clunky."]) < 40
    assert analysis.sentiment_score(["Acme is not expensive."]) > 50
    assert analysis.sentiment_score(["Acme exists."]) == 50


def test_source_classification():
    c = lambda d: analysis.classify_source(d, ENTITIES)
    assert c("acmecrm.com") == "you"
    assert c("blog.hubspot.com") == "competitor"
    assert c("reddit.com") == "ugc"
    assert c("g2.com") == "review"
    assert c("en.wikipedia.org") == "reference"
    assert c("nih.gov") == "institutional"
    assert c("ox.ac.uk") == "institutional"
    assert c("forbes.com") == "editorial"


def test_extract_citations_merges_inline_links():
    cites = analysis.extract_citations(
        [{"url": "https://www.g2.com/x", "title": "G2"}],
        "See [HubSpot pricing](https://hubspot.com/pricing) and https://reddit.com/r/crm.", ENTITIES)
    assert [c["domain"] for c in cites] == ["g2.com", "hubspot.com", "reddit.com"]
    assert [c["position"] for c in cites] == [1, 2, 3]


def test_discover_brands():
    texts = ["1. **Monday Sales** – good\n2. **HubSpot** – ok", "- **Monday Sales** is solid"]
    found = dict(analysis.discover_brands(texts, ENTITIES))
    assert found == {"Monday Sales": 2}


def test_openai_parse():
    data = {"output": [{"type": "web_search_call"}, {"type": "message", "content": [
        {"type": "output_text", "text": "Try Acme.",
         "annotations": [{"type": "url_citation", "url": "https://acmecrm.com", "title": "Acme"}]}]}]}
    text, cites = providers.OpenAIProvider._parse(data)
    assert text == "Try Acme." and cites[0]["url"] == "https://acmecrm.com"


@pytest.fixture()
def seeded():
    db = Database(":memory:")
    pid = demo.seed(db, days=6)
    return db, pid


def test_demo_run_and_metrics(seeded):
    db, pid = seeded
    n = db.one("SELECT COUNT(*) AS n FROM responses WHERE project_id = ?", (pid,))["n"]
    assert n == 6 * len(demo.PROMPTS) * 3
    f = metrics.default_filters(db, pid, days=3)
    brands = metrics.brand_table(db, f)
    assert {b["name"] for b in brands} >= {"Acme CRM", "HubSpot"}
    assert abs(sum(b["share_of_voice"] for b in brands) - 100) < 1
    own = next(b for b in brands if b["is_own"])
    assert 0 < own["visibility"] <= 100 and "visibility_delta" in own
    ts = metrics.timeseries(db, f)
    assert len(ts["labels"]) == 3 and all(len(s["data"]) == 3 for s in ts["series"])
    src = metrics.sources(db, f)
    assert src["domains"] and src["types"]
    assert len(metrics.prompt_table(db, f)) == len(demo.PROMPTS)
    assert metrics.by_model(db, f)


def test_tag_and_model_filters(seeded):
    db, pid = seeded
    f = metrics.default_filters(db, pid, days=6, tag="branded")
    assert all(r["responses"] == 0 or "branded" in r["tags"] for r in metrics.prompt_table(db, f))
    f2 = metrics.default_filters(db, pid, days=6, models=["demo-a"])
    assert {m["model"] for m in metrics.by_model(db, f2)} == {"demo-a"}


def test_reanalyze_picks_up_new_competitor(seeded):
    db, pid = seeded
    eid = db.add_entity(pid, "Ultimately")   # a word every demo answer contains
    runner.reanalyze(db, pid)
    assert db.one("SELECT COUNT(*) AS n FROM mentions WHERE entity_id = ?", (eid,))["n"] > 0


def test_failed_provider_is_recorded(monkeypatch):
    db = Database(":memory:")
    pid = db.create_project("t", "Acme", models=["chatgpt"])
    db.add_prompt(pid, "best crm?")

    def boom(*a, **k):
        raise providers.ProviderError("HTTP 401: bad key")
    monkeypatch.setattr(providers.OpenAIProvider, "ask", boom)
    rid = runner.execute_run(db, pid)
    run = db.one("SELECT * FROM runs WHERE id = ?", (rid,))
    assert run["status"] == "failed" and run["errors"] == 1


def test_highlight_escapes_html():
    out = highlight("<b>Acme</b> & HubSpot", ENTITIES[:2])
    assert "&lt;b&gt;" in out and out.count("<mark") == 2


def test_web_pages(tmp_path):
    app = create_app(str(tmp_path / "t.db"), start_scheduler=False)
    demo.seed(app.state.db, days=3)
    with TestClient(app) as client:
        pid = app.state.db.projects()[0]["id"]
        rid = app.state.db.one("SELECT id FROM responses LIMIT 1")["id"]
        prompt_id = app.state.db.prompts(pid)[0]["id"]
        for url in ["/", "/new", f"/p/{pid}", f"/p/{pid}?metric=position&days=7", f"/p/{pid}/prompts",
                    f"/p/{pid}/prompts/{prompt_id}", f"/p/{pid}/sources", f"/p/{pid}/sources?view=urls",
                    f"/p/{pid}/responses", f"/p/{pid}/responses/{rid}", f"/p/{pid}/runs", f"/p/{pid}/settings",
                    f"/p/{pid}/export/brands.csv", f"/p/{pid}/export/responses.csv", f"/p/{pid}/export/mentions.csv",
                    f"/api/projects/{pid}/brands", f"/api/projects/{pid}/sources"]:
            r = client.get(url, follow_redirects=True)
            assert r.status_code == 200, url
        r = client.post(f"/p/{pid}/prompts", data={"texts": "New prompt A\nNew prompt B", "tags": "x"})
        assert r.status_code == 200
        assert len(app.state.db.prompts(pid)) == len(demo.PROMPTS) + 2
        r = client.post(f"/p/{pid}/prompts/suggest", data={"category": "CRM software"})
        assert r.status_code == 200 and "Add selected" in r.text
        r = client.post("/projects", data={"name": "P2", "brand": "Foo", "competitors": "Bar | | bar.com"})
        assert r.status_code == 200
        assert len(app.state.db.projects()) == 2
