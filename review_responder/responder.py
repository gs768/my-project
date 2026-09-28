"""Decides which reviews get a reply (five-star only) and what the reply says."""

import random

DEFAULT_TEMPLATES = [
    "Thank you so much, {name}! We're thrilled you had a five-star experience and can't wait to see you again.",
    "{name}, thank you for the wonderful review! It means a lot to our team.",
    "We really appreciate the five stars, {name}! Thanks for taking the time to share your experience.",
]


def should_reply(review):
    """Reply only to five-star reviews that don't already have an owner reply."""
    return review.get("starRating") == "FIVE" and not review.get("reviewReply")


def first_name(review):
    reviewer = review.get("reviewer") or {}
    if reviewer.get("isAnonymous"):
        return "there"
    name = (reviewer.get("displayName") or "").strip()
    return name.split()[0] if name else "there"


def build_reply(review, templates=DEFAULT_TEMPLATES, rng=random):
    return rng.choice(templates).format(name=first_name(review))


def process_reviews(client, account_id, location_id, templates=DEFAULT_TEMPLATES, dry_run=True, log=print):
    """Reply to eligible reviews. Returns (replied, skipped) counts."""
    replied = skipped = 0
    for review in client.list_reviews(account_id, location_id):
        if not should_reply(review):
            skipped += 1
            continue
        reply = build_reply(review, templates)
        if dry_run:
            log(f"[dry-run] would reply to {review['name']}: {reply}")
        else:
            client.reply_to_review(review["name"], reply)
            log(f"replied to {review['name']}: {reply}")
        replied += 1
    return replied, skipped
