"""CLI entry point: python -m gbp_reviews <command>.

Commands
  init-store            create the tabs in the system spreadsheet (idempotent)
  weekly [--dry-run F]  build this week's proposal and post it to Slack
                        (--dry-run writes the Slack text to file F instead)
  poll                  process Slack thread replies and post approved replies
  access-report F       write which SEO-active profiles analytics@sdmark.net can reach to file F
  auth                  one-time: mint a Google refresh token for analytics@sdmark.net

GitHub Actions logs on a public repo are public, so these commands only log
counts. Anything with client data goes to Slack, the system sheet, or a local file.
"""

from __future__ import annotations

import argparse
import http.server
import logging
import secrets
import sys
import urllib.parse
import webbrowser

import requests


def _auth() -> None:
    from .google_api import SCOPES, TOKEN_URL

    client_id = input("OAuth client ID (Desktop app type): ").strip()
    client_secret = input("OAuth client secret: ").strip()
    port = 8765
    redirect = f"http://localhost:{port}"
    state = secrets.token_urlsafe(16)
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "login_hint": "analytics@sdmark.net",
        "state": state,
    })
    captured: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            captured.update({k: v[0] for k, v in qs.items()})
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Done - you can close this tab.")

        def log_message(self, *args):
            pass

    print("\nSign in as analytics@sdmark.net in the browser window.\nIf it doesn't open, visit:\n" + url)
    webbrowser.open(url)
    server = http.server.HTTPServer(("localhost", port), Handler)
    while "code" not in captured and "error" not in captured:
        server.handle_request()
    if captured.get("state") != state or "code" not in captured:
        sys.exit(f"Authorization failed: {captured.get('error', 'state mismatch')}")
    resp = requests.post(TOKEN_URL, data={
        "code": captured["code"], "client_id": client_id, "client_secret": client_secret,
        "redirect_uri": redirect, "grant_type": "authorization_code",
    }, timeout=30)
    resp.raise_for_status()
    token = resp.json().get("refresh_token")
    if not token:
        sys.exit("No refresh token returned; revoke the app's access for the account and retry.")
    print("\nStore this as the GOOGLE_REFRESH_TOKEN secret (don't paste it anywhere else):\n" + token)


def _access_report(path: str) -> None:
    from .config import Config
    from .context import Context

    ctx = Context.build(Config.from_env())
    index = ctx.gbp.location_index()
    rows = ["Client Location\tLocation ID\tAccessible\tResource"]
    for c in ctx.seo_clients():
        res = index.get(c.location_id, "")
        rows.append(f"{c.client_location}\t{c.location_id or '(missing)'}\t{'yes' if res else 'NO'}\t{res}")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(rows) + "\n")
    print(f"Wrote {len(rows) - 1} rows to {path}")


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(prog="gbp_reviews")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init-store")
    weekly = sub.add_parser("weekly")
    weekly.add_argument("--dry-run", metavar="FILE")
    sub.add_parser("poll")
    report = sub.add_parser("access-report")
    report.add_argument("path")
    sub.add_parser("auth")
    args = parser.parse_args(argv)

    if args.cmd == "auth":
        return _auth()
    if args.cmd == "access-report":
        return _access_report(args.path)

    from .config import Config
    from .context import Context

    ctx = Context.build(Config.from_env())
    if args.cmd == "init-store":
        added = ctx.store.ensure_tabs()
        print(f"System sheet ready (added tabs: {', '.join(added) or 'none'})")
    elif args.cmd == "weekly":
        from . import weekly as weekly_job
        weekly_job.run(ctx, dry_run_path=args.dry_run)
    elif args.cmd == "poll":
        from . import poll as poll_job
        poll_job.run(ctx)


if __name__ == "__main__":
    main()
