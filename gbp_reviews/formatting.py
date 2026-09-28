"""Slack message text for proposals, follow-up drafts, and acknowledgements."""

from __future__ import annotations

from datetime import datetime

STARS = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}
REVIEW_PREVIEW_CHARS = 700


def esc(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def stars(n: int | str) -> str:
    n = STARS.get(str(n), n)
    try:
        n = int(n)
    except (TypeError, ValueError):
        return "rating unknown"
    return "★" * n + "☆" * (5 - n)


def nice_date(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime("%b %-d, %Y")
    except ValueError:
        return iso


def quote(text: str, limit: int = REVIEW_PREVIEW_CHARS) -> str:
    text = (text or "").strip()
    if not text:
        return "> _(rating only, no written review)_"
    if len(text) > limit:
        text = text[:limit].rstrip() + "…"
    return "\n".join("> " + esc(line) if line.strip() else ">" for line in text.splitlines())


def recommendation_label(rec: str) -> str:
    return "✅ *Reply automatically*" if rec == "auto_reply" else "📨 *Follow up with client*"


def item_block(item: dict) -> str:
    """item keys: ref, stars, reviewer, date, text, recommendation, reason, reply, history."""
    head = (
        f"*{item['ref']}* · {stars(item['stars'])} · {esc(item['reviewer'])} · "
        f"{nice_date(item['date'])} · {recommendation_label(item['recommendation'])}"
    )
    lines = [head, quote(item["text"])]
    if item.get("reason"):
        lines.append(f"_Why: {esc(item['reason'])}_")
    if item.get("history"):
        lines.append(f"_History: {esc(item['history'])}_")
    lines.append("Proposed reply:\n```" + item["reply"].replace("```", "'''") + "```")
    return "\n".join(lines)


def client_header(section: dict) -> str:
    c = section["client"]
    link = f" · <{c.gbp_url}|GBP>" if c.gbp_url else ""
    contacts = ", ".join(c.contacts) if c.contacts else "⚠️ none listed in *General Inquiries - Emails*"
    n = len(section["items"])
    return (
        f"*{esc(c.client_location)}* — {esc(c.business_name)}{link}\n"
        f"{n} review{'s' if n != 1 else ''} to answer · Client contacts: {contacts}"
    )


def parent_message(batch_label: str, summary: dict, min_age_days: int) -> str:
    total = summary["reviews"]
    lines = [
        f"*Weekly Google review-reply proposals — week of {batch_label}*",
        (
            f"{total} unreplied review{'s' if total != 1 else ''} older than {min_age_days} days "
            f"across {summary['profiles_with_reviews']} of {summary['profiles_checked']} profiles checked."
            if total else
            f"No unreplied reviews older than {min_age_days} days across {summary['profiles_checked']} profiles checked. 🎉"
        ),
    ]
    if total:
        lines.append(
            f"• ✅ {summary['auto']} recommended to reply automatically · "
            f"📨 {summary['followup']} recommended to follow up with the client"
        )
    if summary["gaps"]:
        lines.append(f"• ⚠️ {summary['gaps']} profile(s) couldn't be checked (details in thread)")
    if summary["excluded"]:
        lines.append(f"• 🚫 {summary['excluded']} profile(s) excluded from this audit")
    if summary["skipped"]:
        lines.append(f"• {summary['skipped']} review(s) previously marked skip were left out")
    lines += [
        "",
        "*Reply in this thread to approve:*",
        "`approve all` — post every ✅ proposal · `approve R1 R4-R7` — post specific ones",
        "`client R3` — follow up with the client instead (I'll draft the email to their General Inquiries contacts)",
        "`edit R5: your reply text` — post your wording instead · `skip R6` — never reply to that review",
        "",
        "📝 *Notes:* anything else you write in this thread updates the system — client-specific reply "
        "rules, agency-wide rules, or excluding / re-including a profile. See the Notes message at the "
        "bottom of the thread for examples.",
    ]
    return "\n".join(lines)


def gaps_message(gaps: list[tuple[str, str]]) -> list[str]:
    lines = ["*⚠️ Profiles that couldn't be checked* (SEO = TRUE in the client sheet)"]
    lines += [f"• *{esc(name)}* — {esc(reason)}" for name, reason in gaps]
    return lines


def notes_message(
    exclusions: list[tuple[str, str]], rule_counts: dict[str, int], example_client: str
) -> list[str]:
    ex = esc(example_client or "Client Name - City")
    lines = [
        "*📝 Notes — update the system*",
        "Reply in this thread with plain-English notes and I'll update the stored rules. Examples:",
        f"• _For {ex}, sign replies \"— The Team at [Firm]\"_",
        f"• _Always send 3-star reviews for {ex} to the client_",
        "• _Agency-wide: never mention free consultations in replies_",
        f"• _Exclude {ex} from this audit — client handles their own reviews_",
        f"• _Include {ex} again_  ·  _Remove the sign-off rule for {ex}_",
        "Rules and exclusions are also editable directly in the *GBP Review System* sheet.",
    ]
    if exclusions:
        lines.append("")
        lines.append("*Currently excluded:* " + "; ".join(
            f"{esc(n)}" + (f" ({esc(r)})" if r else "") for n, r in exclusions))
    if rule_counts:
        lines.append("*Stored rules:* " + ", ".join(
            f"{esc(k)} ({v})" for k, v in sorted(rule_counts.items())))
    return lines


def followup_email(client, items: list[dict]) -> str:
    to = ", ".join(client.contacts) if client.contacts else "⚠️ (no General Inquiries contact on file — add one in the client sheet)"
    body = [
        "Hi,",
        "",
        f"A few Google reviews for {client.business_name} are still waiting on a reply. "
        "Because of what they mention, we'd like your input before anything is posted. "
        "We've included a suggested response for each — reply with \"approved\", your edits, "
        "or let us know if you'd prefer to respond yourselves.",
        "",
    ]
    for it in items:
        body += [
            f"Review from {it['reviewer']} ({stars(it['stars'])}, {nice_date(it['date'])}):",
            f"\"{(it['text'] or '(rating only)').strip()}\"",
            "Suggested reply:",
            f"\"{it['reply'].strip()}\"",
            "",
        ]
    body += ["Thanks,", "Sutton Digital Marketing"]
    return (
        f"📨 *Client follow-up draft — {esc(client.client_location)}*\n"
        f"*To:* {to}\n*Subject:* Google review replies for {esc(client.business_name)}\n"
        "```" + "\n".join(body).replace("```", "'''") + "```"
    )
