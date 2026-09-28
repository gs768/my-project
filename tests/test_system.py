from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from gbp_reviews import poll, weekly
from gbp_reviews import store as st
from gbp_reviews.clients import parse_clients, parse_emails
from gbp_reviews.commands import parse_message, parse_refs
from gbp_reviews.config import Config
from gbp_reviews.context import Context
from gbp_reviews.store import Store

from .fakes import FakeDrafter, FakeGBP, FakeSheets, FakeSlack

NOW = datetime(2026, 9, 28, 14, 0, tzinfo=timezone.utc)
CLIENTS = "clients-sheet"
SYSTEM = "system-sheet"

HEADERS = ["Client Location", "Business Name", "Website", "Account Manager", "SEO", "Client Status",
           "General Inquiries - Emails", "GBP Location ID", "Type of Firm", "Practice Area",
           "GBP URL", "SEO", "GBP Resource Name"]


def client_row(name, seo, loc_id="", emails="", resource=""):
    return [name, f"{name} LLC", "https://x.test", "AM", seo, "Active", emails, loc_id,
            "Law", "Personal Injury", "", "FALSE", resource]


def iso(days_ago):
    return (NOW - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")


def review(loc, rid, stars, days_ago, text="Great firm", replied=False):
    r = {
        "name": f"accounts/1/locations/{loc}/reviews/{rid}",
        "reviewId": rid,
        "reviewer": {"displayName": f"Person {rid}"},
        "starRating": ["", "ONE", "TWO", "THREE", "FOUR", "FIVE"][stars],
        "comment": text,
        "createTime": iso(days_ago),
    }
    if replied:
        r["reviewReply"] = {"comment": "thanks"}
    return r


@pytest.fixture
def env():
    sheets = FakeSheets()
    sheets.books[CLIENTS] = {"Clients Master": [
        ["group header row"],
        HEADERS,
        client_row("Alpha - Town", "TRUE", "111", "a@alpha.test, b@alpha.test"),
        client_row("Beta - City", "TRUE", "", resource="accounts/9/locations/222"),
        client_row("Gamma - Ville", "FALSE", "333"),
        client_row("Delta - Burg", "TRUE", "444"),       # not visible to analytics@
        client_row("Epsilon - Port", "TRUE", ""),        # no location id at all
        client_row("Zeta - Excluded", "TRUE", "666"),
    ]}
    gbp = FakeGBP(
        index={"111": "accounts/1/locations/111", "222": "accounts/1/locations/222",
               "333": "accounts/1/locations/333", "666": "accounts/1/locations/666"},
        reviews={
            "accounts/1/locations/111": [
                review(111, "a1", 5, 30),
                review(111, "a2", 1, 12, "Terrible"),
                review(111, "a3", 5, 3),                  # too new
                review(111, "a4", 4, 40, replied=True),   # already replied
            ],
            "accounts/1/locations/222": [review(222, "b1", 4, 11, "")],
            "accounts/1/locations/666": [review(666, "z1", 5, 50)],
        },
    )
    cfg = Config("id", "secret", "refresh", CLIENTS, "Clients Master", SYSTEM, "xoxb", "C1",
                 "claude-opus-5", 10, 28)
    ctx = Context(cfg=cfg, sheets=sheets, gbp=gbp, store=Store(sheets, SYSTEM), slack=FakeSlack(),
                  drafter=FakeDrafter())
    ctx.store.ensure_tabs()
    ctx.store.add_exclusion("Zeta - Excluded", "client handles reviews", "U1", "test")
    ctx.store.add_rule("ALL", "Never mention free consultations", "U1", "test")
    ctx.store.add_rule("Alpha - Town", "Sign off as The Alpha Team", "U1", "test")
    return ctx


def test_parse_clients_uses_first_seo_column_and_resource_fallback(env):
    clients = parse_clients(env.client_rows())
    names = [c.client_location for c in clients]
    assert names == ["Alpha - Town", "Beta - City", "Delta - Burg", "Epsilon - Port", "Zeta - Excluded"]
    beta = clients[1]
    assert beta.location_id == "222"
    assert clients[0].contacts == ["a@alpha.test", "b@alpha.test"]


def test_parse_emails_dedupes():
    assert parse_emails("A@x.com; a@x.com, Bob <b@y.org>") == ["A@x.com", "b@y.org"]


def test_command_parsing():
    assert parse_refs("R1, R3-R5 r7") == ["R1", "R3", "R4", "R5", "R7"]
    assert parse_refs("R3 - R4") == ["R3", "R4"]
    assert parse_refs("the smith ones") is None
    cmds = parse_message("approve R1 R2\nclient R3\nskip R4")
    assert [(c.type, c.refs) for c in cmds] == [
        ("approve", ["R1", "R2"]), ("client_followup", ["R3"]), ("skip", ["R4"])]
    assert parse_message("approve all")[0].all
    edit = parse_message("edit R5: Thank you so much!\nWe appreciate it.")[0]
    assert edit.type == "edit" and edit.refs == ["R5"] and edit.text.endswith("appreciate it.")
    assert parse_message("For Alpha, always sign off as the team") is None
    assert parse_message("approve R1 and also add a rule") is None


def test_weekly_builds_proposal(env):
    summary = weekly.run(env, now=NOW)
    assert summary["reviews"] == 3  # a1, a2, b1
    assert summary["auto"] == 2 and summary["followup"] == 1
    assert summary["excluded"] == 1
    assert summary["gaps"] == 2  # Delta not visible, Epsilon missing id

    queue = env.store.queue()
    assert [(q.get("Ref"), q.get("Client Location"), q.get("Status")) for q in queue] == [
        ("R1", "Alpha - Town", "pending"), ("R2", "Alpha - Town", "pending"), ("R3", "Beta - City", "pending")]

    # Rules reach the drafter.
    call = env.drafter.draft_calls[0]
    assert call["global"] == ["Never mention free consultations"]
    assert call["client_rules"] == ["Sign off as The Alpha Team"]

    posts = env.slack.posts
    parent = posts[0]
    assert parent["thread_ts"] is None and "3 unreplied reviews" in parent["text"]
    thread_text = "\n".join(p["text"] for p in posts[1:])
    assert "a@alpha.test" in thread_text
    assert "can't see GBP location 444" in thread_text
    assert "Notes — update the system" in thread_text
    assert "Zeta - Excluded" in thread_text  # listed as excluded


def test_poll_approve_edit_client_and_post(env):
    weekly.run(env, now=NOW)
    parent_ts = env.slack.posts[0]["ts"]
    env.slack.human_reply(parent_ts, "approve all")
    env.slack.human_reply(parent_ts, "client R2")
    env.slack.human_reply(parent_ts, "edit R3: Thank you for the kind words!")
    poll.run(env, now=NOW)

    status = {q.get("Ref"): q.get("Status") for q in env.store.queue()}
    assert status == {"R1": st.POSTED, "R2": st.CLIENT_FOLLOWUP, "R3": st.POSTED}
    assert env.gbp.posted["accounts/1/locations/222/reviews/b1"] == "Thank you for the kind words!"
    assert "accounts/1/locations/111/reviews/a2" not in env.gbp.posted

    texts = [p["text"] for p in env.slack.posts]
    assert any("Client follow-up draft — Alpha - Town" in t and "a@alpha.test" in t for t in texts)
    assert any("Posting results" in t for t in texts)

    # Re-polling is idempotent: nothing reprocessed, nothing re-posted.
    n_posts = len(env.slack.posts)
    poll.run(env, now=NOW)
    assert len(env.slack.posts) == n_posts


def test_poll_skips_review_already_replied_on_google(env):
    weekly.run(env, now=NOW)
    parent_ts = env.slack.posts[0]["ts"]
    env.gbp.reviews["accounts/1/locations/111"][0]["reviewReply"] = {"comment": "client replied"}
    env.slack.human_reply(parent_ts, "approve R1")
    poll.run(env, now=NOW)
    assert {q.get("Ref"): q.get("Status") for q in env.store.queue()}["R1"] == st.ALREADY_REPLIED
    assert env.gbp.posted == {}


def test_poll_post_failure_marks_error_and_can_retry(env):
    weekly.run(env, now=NOW)
    parent_ts = env.slack.posts[0]["ts"]
    name = "accounts/1/locations/111/reviews/a1"
    env.gbp.fail.add(name)
    env.slack.human_reply(parent_ts, "approve R1")
    poll.run(env, now=NOW)
    assert env.store.queue()[0].get("Status") == st.ERROR
    env.gbp.fail.clear()
    env.slack.human_reply(parent_ts, "approve R1")
    poll.run(env, now=NOW)
    assert env.store.queue()[0].get("Status") == st.POSTED


def test_notes_update_rules_and_exclusions(env):
    weekly.run(env, now=NOW)
    parent_ts = env.slack.posts[0]["ts"]
    env.drafter.note_result = {
        "operations": [
            {"type": "add_rule", "client_location": "beta - city", "refs": [], "text": "Mention the Beta office"},
            {"type": "exclude", "client_location": "Alpha - Town", "refs": [], "text": "paused"},
            {"type": "remove_rule", "client_location": "ALL", "refs": [], "text": "free consultations"},
            {"type": "skip", "client_location": "", "refs": ["R2"], "text": ""},
            {"type": "add_rule", "client_location": "Nope Inc", "refs": [], "text": "x"},
        ],
        "summary": "", "questions": [],
    }
    env.slack.human_reply(parent_ts, "Beta wants the office mentioned. Pause Alpha. Drop the consult rule, skip R2.")
    poll.run(env, now=NOW)

    rules = [(r.get("Client Location"), r.get("Rule")) for r in env.store.active_rules()]
    assert ("Beta - City", "Mention the Beta office") in rules
    assert ("ALL", "Never mention free consultations") not in rules
    assert "Alpha - Town" in [e.get("Client Location") for e in env.store.active_exclusions()]
    assert {q.get("Ref"): q.get("Status") for q in env.store.queue()}["R2"] == st.SKIPPED
    reply = env.slack.posts[-1]["text"]
    assert "Nope Inc" in reply and "couldn't match" in reply
    assert env.store.rows("Notes Log")

    # Next week: Alpha is excluded and skipped R2 would not return anyway.
    summary = weekly.run(env, now=NOW + timedelta(days=7))
    assert summary["excluded"] == 2
    assert [q.get("Client Location") for q in env.store.queue() if q.get("Batch ID") == "2026-10-05"] == ["Beta - City"]


def test_undecided_items_roll_into_next_batch(env):
    weekly.run(env, now=NOW)
    weekly.run(env, now=NOW + timedelta(days=7))
    rows = env.store.queue()
    old = [r for r in rows if r.get("Batch ID") == "2026-09-28"]
    new = [r for r in rows if r.get("Batch ID") == "2026-10-05"]
    assert all(r.get("Status") == st.SUPERSEDED for r in old)
    assert len(new) == 3 and all(r.get("Status") == st.PENDING for r in new)
    assert any("Also proposed" in r["history"] for c in env.drafter.draft_calls[-2:] for r in c["reviews"])

    # A command on the old thread explains where the item went.
    old_ts = env.slack.posts[0]["ts"]
    env.slack.human_reply(old_ts, "approve R1")
    poll.run(env, now=NOW + timedelta(days=7))
    assert "moved to a newer batch" in env.slack.posts[-1]["text"]
    assert env.gbp.posted == {}


def test_slack_text_unescapes():
    from gbp_reviews.poll import slack_text
    assert slack_text("Smith &amp; Co &lt;3 <mailto:a@b.com|a@b.com>") == "Smith & Co <3 a@b.com"
