"""CLI entry point: python -m review_responder [--send] [--templates FILE]"""

import argparse
import os
import sys

from .google_client import GoogleReviewsClient
from .responder import DEFAULT_TEMPLATES, process_reviews

REQUIRED_ENV = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "GBP_ACCOUNT_ID",
    "GBP_LOCATION_ID",
]


def load_templates(path):
    with open(path, encoding="utf-8") as f:
        templates = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    if not templates:
        sys.exit(f"No templates found in {path}")
    return templates


def main(argv=None):
    parser = argparse.ArgumentParser(description="Reply to five-star Google reviews only.")
    parser.add_argument("--send", action="store_true", help="actually post replies (default is a dry run)")
    parser.add_argument("--templates", help="file with one reply template per line; use {name} for the reviewer's first name")
    args = parser.parse_args(argv)

    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    if missing:
        sys.exit(f"Missing environment variables: {', '.join(missing)}")

    client = GoogleReviewsClient(
        os.environ["GOOGLE_CLIENT_ID"],
        os.environ["GOOGLE_CLIENT_SECRET"],
        os.environ["GOOGLE_REFRESH_TOKEN"],
    )
    templates = load_templates(args.templates) if args.templates else DEFAULT_TEMPLATES
    replied, skipped = process_reviews(
        client,
        os.environ["GBP_ACCOUNT_ID"],
        os.environ["GBP_LOCATION_ID"],
        templates=templates,
        dry_run=not args.send,
    )
    verb = "Replied to" if args.send else "Would reply to"
    print(f"{verb} {replied} five-star review(s); skipped {skipped} (not five-star or already replied).")


if __name__ == "__main__":
    main()
