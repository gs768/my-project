"""Poll job: read Slack thread replies, apply decisions and notes, post approved replies."""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from . import formatting as fmt
from . import store as st
from .clients import Client
from .commands import Command, parse_message
from .context import Context
from .drafter import AUTO_REPLY, DraftError
from .google_api import GoogleApiError

log = logging.getLogger(__name__)

# Which statuses each decision may move an item out of.
_ALLOWED_FROM = {
    "approve": {st.PENDING, st.ERROR, st.CLIENT_FOLLOWUP, st.APPROVED, st.SKIPPED},
    "edit": {st.PENDING, st.ERROR, st.CLIENT_FOLLOWUP, st.APPROVED, st.SKIPPED},
    "client_followup": {st.PENDING, st.ERROR, st.APPROVED, st.SKIPPED},
    "skip": {st.PENDING, st.ERROR, st.CLIENT_FOLLOWUP, st.APPROVED},
}
_TARGET = {
    "approve": st.APPROVED,
    "edit": st.APPROVED,
    "client_followup": st.CLIENT_FOLLOWUP,
    "skip": st.SKIPPED,
}


def slack_text(text: str) -> str:
    """Undo Slack's message encoding: <mailto:a@b|a@b> / <http://x|label> links and &amp; escapes."""
    text = re.sub(r"<(?:mailto:)?([^<>|]+)\|([^<>]+)>", r"\2", text)
    text = re.sub(r"<(?:mailto:)?([^<>@#!][^<>]*)>", r"\1", text)
    return text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")


class BatchState:
    """One open weekly batch and its queue rows, keyed by ref."""

    def __init__(self, row: st.Row, items: list[st.Row]):
        self.row = row
        self.id = row.get("Batch ID")
        self.ts = row.get("Slack TS")
        self.items = {i.get("Ref").upper(): i for i in items}


def apply_item_op(
    store: st.Store, batch: BatchState, op: Command, user: str
) -> tuple[list[str], list[str], list[st.Row]]:
    """Apply one decision. Returns (done refs, problems, rows newly sent to client)."""
    if op.all:
        refs = [
            ref for ref, row in batch.items.items()
            if row.get("Recommendation") == AUTO_REPLY and row.get("Status") in (st.PENDING, st.ERROR)
        ]
    else:
        refs = [r.upper() for r in op.refs]
    done, problems, to_client = [], [], []
    for ref in refs:
        row = batch.items.get(ref)
        if row is None:
            problems.append(f"{ref} isn't in this batch")
            continue
        status = row.get("Status")
        if status not in _ALLOWED_FROM[op.type]:
            why = {
                st.POSTED: "already posted",
                st.ALREADY_REPLIED: "already has a reply on Google",
                st.SUPERSEDED: f"moved to a newer batch ({row.get('Notes')})",
                st.SKIPPED: "is already marked skip",
            }.get(status, f"status is {status}")
            problems.append(f"{ref} {why}")
            continue
        changes = {"Status": _TARGET[op.type], "Decided By": user, "Decided At": st.now_iso()}
        if op.type == "edit":
            changes["Final Reply"] = op.text
        store.set(row, changes)
        done.append(ref)
        if op.type == "client_followup" and status != st.CLIENT_FOLLOWUP:
            to_client.append(row)
    return done, problems, to_client


def _verb(op_type: str) -> str:
    return {
        "approve": "Approved (posting shortly)",
        "edit": "Updated and approved",
        "client_followup": "Moved to client follow-up",
        "skip": "Skipped",
    }[op_type]


def _apply_note(ctx: Context, batch: BatchState, text: str, user: str,
                all_clients: list[Client]) -> tuple[list[Command], list[str], list[str]]:
    """Interpret a free-form note. Returns (item ops, config changes made, questions)."""
    names = [c.client_location for c in all_clients]
    by_lower = {n.lower(): n for n in names}
    items = [
        {
            "ref": ref, "client_location": r.get("Client Location"), "stars": r.get("Stars"),
            "reviewer": r.get("Reviewer"), "recommendation": r.get("Recommendation"),
            "status": r.get("Status"), "review_excerpt": r.get("Review Text")[:200],
        }
        for ref, r in batch.items.items()
    ]
    rules = [{"client_location": r.get("Client Location"), "rule": r.get("Rule")}
             for r in ctx.store.active_rules()]
    exclusions = [{"client_location": r.get("Client Location"), "reason": r.get("Reason")}
                  for r in ctx.store.active_exclusions()]
    result = ctx.drafter.interpret_note(text, names, items, rules, exclusions)

    item_ops: list[Command] = []
    changes: list[str] = []
    questions = list(result.get("questions", []))
    source = f"slack note {batch.id}"
    for op in result["operations"]:
        kind = op["type"]
        if kind in _TARGET:
            if kind == "edit" and (len(op["refs"]) != 1 or not op["text"].strip()):
                questions.append("Which single review should get that edited reply?")
                continue
            item_ops.append(Command(kind, op["refs"], text=op["text"].strip()))
            continue
        loc = op["client_location"].strip()
        if loc.upper() == st.GLOBAL:
            loc = st.GLOBAL
        elif loc.lower() in by_lower:
            loc = by_lower[loc.lower()]
        else:
            questions.append(f"I couldn't match “{loc}” to a Client Location in the client sheet.")
            continue
        if kind == "add_rule":
            ctx.store.add_rule(loc, op["text"].strip(), user, source)
            changes.append(f"Added rule for *{fmt.esc(loc)}*: {fmt.esc(op['text'].strip())}")
        elif kind == "remove_rule":
            n = ctx.store.deactivate_rule(loc, op["text"])
            changes.append(f"Deactivated {n} rule(s) for *{fmt.esc(loc)}* matching “{fmt.esc(op['text'])}”")
        elif kind == "exclude":
            if loc == st.GLOBAL:
                questions.append("Which profile should be excluded?")
                continue
            ctx.store.add_exclusion(loc, op["text"].strip(), user, source)
            changes.append(f"Excluded *{fmt.esc(loc)}* from future audits ({fmt.esc(op['text'].strip())})")
        elif kind == "include":
            n = ctx.store.remove_exclusion(loc)
            changes.append(f"Re-included *{fmt.esc(loc)}*" if n else f"*{fmt.esc(loc)}* wasn't excluded")
    return item_ops, changes, questions


def process_batch(ctx: Context, batch: BatchState, clients_cache: dict) -> list[st.Row]:
    """Read new thread replies for a batch and apply them. Returns rows newly sent to client."""
    last = batch.row.get("Last Processed TS") or batch.ts
    messages = sorted(ctx.slack.replies(batch.ts, oldest=last), key=lambda m: float(m["ts"]))
    to_client_all: list[st.Row] = []
    for m in messages:
        if float(m["ts"]) <= float(last):
            continue
        is_bot = m.get("bot_id") or m.get("user") == ctx.slack.bot_user_id
        if is_bot or m.get("subtype") not in (None, "thread_broadcast"):
            last = m["ts"]
            continue
        user = m.get("user", "unknown")
        text = slack_text(m.get("text", ""))
        commands = parse_message(text)
        changes: list[str] = []
        questions: list[str] = []
        if commands is None:
            if "all" not in clients_cache:
                clients_cache["all"] = ctx.all_clients()
            try:
                commands, changes, questions = _apply_note(ctx, batch, text, user, clients_cache["all"])
            except DraftError as exc:
                ctx.slack.post(f"<@{user}> I couldn't process that note ({exc}). Please try rephrasing.", batch.ts)
                ctx.slack.react(m["ts"], "warning")
                last = m["ts"]
                continue

        lines: list[str] = []
        for cmd in commands:
            done, problems, to_client = apply_item_op(ctx.store, batch, cmd, user)
            if done:
                lines.append(f"{_verb(cmd.type)}: {', '.join(done)}")
            elif cmd.all and not problems:
                lines.append("Nothing left to approve — every ✅ proposal is already decided.")
            lines += [f"⚠️ {p}" for p in problems]
            to_client_all += to_client
        lines += changes
        lines += [f"❓ {q}" for q in questions]
        ctx.store.flush()
        if changes:
            ctx.store.log_note(batch.id, user, text, " | ".join(changes))
        if lines:
            ctx.slack.post(f"<@{user}>\n" + "\n".join(lines), batch.ts)
        if lines:
            acted = any(not line.startswith(("⚠️", "❓")) for line in lines)
            ctx.slack.react(m["ts"], "white_check_mark" if acted else "question")
        last = m["ts"]

    if last != batch.row.get("Last Processed TS"):
        ctx.store.set(batch.row, {"Last Processed TS": last})
        ctx.store.flush()
    return to_client_all


def post_approved(ctx: Context, batches: dict[str, BatchState]) -> None:
    results: dict[str, list[str]] = defaultdict(list)
    for batch in batches.values():
        for ref, row in batch.items.items():
            if row.get("Status") != st.APPROVED:
                continue
            reply = (row.get("Final Reply") or row.get("Proposed Reply")).strip()
            name = row.get("Review Name")
            try:
                current = ctx.gbp.get_review(name)
                if (current.get("reviewReply") or {}).get("comment"):
                    ctx.store.set(row, {"Status": st.ALREADY_REPLIED})
                    results[batch.id].append(f"{ref}: already had a reply on Google, left it alone")
                    continue
                ctx.gbp.put_reply(name, reply)
                ctx.store.set(row, {"Status": st.POSTED, "Posted At": st.now_iso()})
                results[batch.id].append(f"{ref}: ✅ posted")
            except GoogleApiError as exc:
                ctx.store.set(row, {"Status": st.ERROR, "Notes": f"Google API {exc.status}"})
                results[batch.id].append(f"{ref}: ❌ failed (Google API {exc.status}) — `approve {ref}` to retry")
            finally:
                ctx.store.flush()  # record each outcome immediately
    for batch_id, lines in results.items():
        ctx.slack.post("*Posting results*\n" + "\n".join(lines), batches[batch_id].ts)


def send_client_followups(ctx: Context, batch: BatchState, rows: list[st.Row], clients_cache: dict) -> None:
    if not rows:
        return
    if "all" not in clients_cache:
        clients_cache["all"] = ctx.all_clients()
    by_name = {c.client_location.lower(): c for c in clients_cache["all"]}
    grouped: dict[str, list[st.Row]] = defaultdict(list)
    for row in rows:
        grouped[row.get("Client Location")].append(row)
    for name, group in grouped.items():
        client = by_name.get(name.lower())
        if client is None:
            continue
        items = [{
            "reviewer": r.get("Reviewer"), "stars": r.get("Stars"), "date": r.get("Review Date"),
            "text": r.get("Review Text"),
            "reply": r.get("Final Reply") or r.get("Proposed Reply"),
        } for r in group]
        ctx.slack.post(fmt.followup_email(client, items), batch.ts)


def run(ctx: Context, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    horizon = now - timedelta(days=ctx.cfg.batch_lookback_days)
    queue = ctx.store.queue()
    batches: dict[str, BatchState] = {}
    for row in ctx.store.batches():
        if row.get("Status") != "open":
            continue
        created = row.get("Created At")
        try:
            too_old = datetime.fromisoformat(created) < horizon
        except ValueError:
            too_old = False
        if too_old:
            ctx.store.set(row, {"Status": "closed"})
            continue
        batch_id = row.get("Batch ID")
        batches[batch_id] = BatchState(row, [q for q in queue if q.get("Batch ID") == batch_id])
    ctx.store.flush()

    clients_cache: dict = {}
    for batch in batches.values():
        to_client = process_batch(ctx, batch, clients_cache)
        send_client_followups(ctx, batch, to_client, clients_cache)
    post_approved(ctx, batches)
    log.info("Poll done: %d open batch(es)", len(batches))
