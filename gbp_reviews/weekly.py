"""Weekly job: find unreplied reviews, draft replies, post the proposal to Slack."""

from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timedelta, timezone

from . import formatting as fmt
from . import store as st
from .clients import Client
from .context import Context
from .drafter import AUTO_REPLY
from .google_api import GoogleApiError

log = logging.getLogger(__name__)


def _parse_time(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def unreplied_older_than(reviews: list[dict], cutoff: datetime) -> list[dict]:
    """Reviews with no owner reply whose createTime is before the cutoff, oldest first."""
    out = [
        r for r in reviews
        if not (r.get("reviewReply") or {}).get("comment")
        and r.get("createTime")
        and _parse_time(r["createTime"]) < cutoff
    ]
    return sorted(out, key=lambda r: r["createTime"])


def _history(prior: st.Row | None) -> str:
    if prior is None:
        return ""
    status = prior.get("Status")
    when = fmt.nice_date(prior.get("Decided At") or prior.get("Batch ID"))
    if status == st.CLIENT_FOLLOWUP:
        return f"Sent to client follow-up on {when}; still no reply on Google."
    if status in (st.PENDING, st.SUPERSEDED):
        return f"Also proposed in the {prior.get('Batch ID')} batch with no decision yet."
    if status == st.ERROR:
        return f"Posting failed in the {prior.get('Batch ID')} batch: {prior.get('Notes')}"
    return ""


def _batch_id(existing: set[str], today: datetime) -> str:
    base = today.strftime("%Y-%m-%d")
    if base not in existing:
        return base
    n = 2
    while f"{base}-{n}" in existing:
        n += 1
    return f"{base}-{n}"


def run(ctx: Context, now: datetime | None = None, dry_run_path: str | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=ctx.cfg.min_review_age_days)

    clients = ctx.seo_clients()
    exclusions = {r.get("Client Location").strip().lower(): r for r in ctx.store.active_exclusions()}
    rules = ctx.store.active_rules()
    queue = ctx.store.queue()
    latest_by_review: dict[str, st.Row] = {}
    for row in queue:  # later rows win: the most recent decision about a review
        latest_by_review[row.get("Review Name")] = row

    location_index = ctx.gbp.location_index()
    log.info("Access: %d SEO clients, %d GBP locations visible", len(clients), len(location_index))

    sections: list[dict] = []
    gaps: list[tuple[str, str]] = []
    excluded: list[tuple[str, str]] = []
    skipped = 0
    checked = 0
    seen_locations: dict[str, str] = {}

    for client in clients:
        ex = exclusions.get(client.client_location.lower())
        if ex is not None:
            excluded.append((client.client_location, ex.get("Reason")))
            continue
        if not client.location_id:
            gaps.append((client.client_location, "No GBP Location ID / GBP Resource Name in the client sheet"))
            continue
        if client.location_id in seen_locations:
            gaps.append((client.client_location,
                         f"Same GBP Location ID as {seen_locations[client.location_id]} — checked there; fix the sheet if this is a different profile"))
            continue
        seen_locations[client.location_id] = client.client_location
        resource = location_index.get(client.location_id)
        if resource is None:
            gaps.append((client.client_location,
                         f"analytics@sdmark.net can't see GBP location {client.location_id} — add it as a manager"))
            continue
        try:
            reviews = ctx.gbp.list_reviews(resource)
        except GoogleApiError as exc:
            gaps.append((client.client_location, f"Reviews API error {exc.status}"))
            continue
        checked += 1

        candidates = []
        for review in unreplied_older_than(reviews, cutoff):
            prior = latest_by_review.get(review["name"])
            if prior is not None and prior.get("Status") == st.SKIPPED:
                skipped += 1
                continue
            if prior is not None and prior.get("Status") in (st.POSTED, st.APPROVED):
                # Approved/posted but Google doesn't show the reply yet: let the poller handle it.
                continue
            candidates.append((review, prior))
        if not candidates:
            continue

        global_rules, client_rules = ctx.store.rules_for(rules, client.client_location)
        payload = [
            {
                "review_id": r["reviewId"] if r.get("reviewId") else r["name"].split("/")[-1],
                "reviewer": (r.get("reviewer") or {}).get("displayName") or "A Google user",
                "stars": fmt.STARS.get(r.get("starRating", ""), 0),
                "date": r["createTime"][:10],
                "text": r.get("comment", ""),
                "history": _history(prior),
            }
            for r, prior in candidates
        ]
        drafts = ctx.drafter.draft(client, global_rules, client_rules, payload)
        items = []
        for (review, prior), p in zip(candidates, payload):
            d = drafts[p["review_id"]]
            items.append({
                **p,
                "review_name": review["name"],
                "recommendation": d.recommendation,
                "reason": d.reason,
                "reply": d.reply.strip(),
                "prior": prior,
            })
        sections.append({"client": client, "items": items})

    # Number refs across the whole batch.
    n = 0
    for section in sections:
        for item in section["items"]:
            n += 1
            item["ref"] = f"R{n}"

    all_items = [i for s in sections for i in s["items"]]
    rec = Counter(i["recommendation"] for i in all_items)
    summary = {
        "reviews": len(all_items),
        "profiles_with_reviews": len(sections),
        "profiles_checked": checked,
        "auto": rec.get(AUTO_REPLY, 0),
        "followup": len(all_items) - rec.get(AUTO_REPLY, 0),
        "gaps": len(gaps),
        "excluded": len(excluded),
        "skipped": skipped,
    }

    batch_id = _batch_id({b.get("Batch ID") for b in ctx.store.batches()}, now)
    label = now.strftime("%b %-d, %Y")
    rule_counts = Counter(r.get("Client Location") for r in rules)
    example = clients[0].client_location if clients else ""

    parent = fmt.parent_message(label, summary, ctx.cfg.min_review_age_days)
    thread: list[list[str]] = []
    for section in sections:
        lines = [fmt.client_header(section), ""]
        for item in section["items"]:
            lines += [fmt.item_block(item), ""]
        thread.append(lines)
    if gaps:
        thread.append(fmt.gaps_message(gaps))
    thread.append(fmt.notes_message(excluded, dict(rule_counts), example))

    if dry_run_path:
        with open(dry_run_path, "w", encoding="utf-8") as fh:
            fh.write(parent + "\n\n")
            for lines in thread:
                fh.write("----- thread reply -----\n" + "\n".join(lines) + "\n\n")
        log.info("Dry run written (%d reviews, %d gaps)", summary["reviews"], summary["gaps"])
        return summary

    parent_ts = ctx.slack.post(parent)
    ctx.store.append("Batches", [{
        "Batch ID": batch_id, "Slack TS": parent_ts, "Created At": st.now_iso(),
        "Last Processed TS": parent_ts, "Status": "open",
    }])
    for lines in thread:
        ctx.slack.post_chunked(lines, thread_ts=parent_ts)

    ctx.store.append("Queue", [
        {
            "Item ID": f"{batch_id}:{i['ref']}",
            "Batch ID": batch_id,
            "Ref": i["ref"],
            "Client Location": s["client"].client_location,
            "Location ID": s["client"].location_id,
            "Review Name": i["review_name"],
            "Reviewer": i["reviewer"],
            "Stars": str(i["stars"]),
            "Review Date": i["date"],
            "Review Text": i["text"],
            "Recommendation": i["recommendation"],
            "Reason": i["reason"],
            "Proposed Reply": i["reply"],
            "Status": st.PENDING,
        }
        for s in sections for i in s["items"]
    ])
    # Older undecided proposals for the same reviews now live in this batch.
    for s in sections:
        for i in s["items"]:
            prior = i["prior"]
            if prior is not None and prior.get("Status") in (st.PENDING, st.ERROR):
                ctx.store.set(prior, {"Status": st.SUPERSEDED, "Notes": f"Moved to {batch_id} as {i['ref']}"})
    ctx.store.flush()
    log.info("Posted batch %s: %d reviews, %d gaps, %d excluded",
             batch_id, summary["reviews"], summary["gaps"], summary["excluded"])
    return summary
