"""Minimal Meta Marketing API client for the SDM Ad Account.

Reads the System User token from the META_ACCESS_TOKEN environment variable.
Never hard-code the token or commit it to this repo.

Usage:
    python meta/meta_api.py check      # verify token, system user and ad account
    python meta/meta_api.py campaigns  # list campaigns
    python meta/meta_api.py insights [date_preset]   # account insights (default last_30d)
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API_VERSION = os.environ.get("META_API_VERSION", "v23.0")
AD_ACCOUNT_ID = os.environ.get("META_AD_ACCOUNT_ID", "1096068657857167")
SYSTEM_USER_ID = os.environ.get("META_SYSTEM_USER_ID", "61594529237954")
BASE = f"https://graph.facebook.com/{API_VERSION}"


def token():
    t = os.environ.get("META_ACCESS_TOKEN")
    if not t:
        sys.exit("META_ACCESS_TOKEN is not set.")
    return t


def get(path, **params):
    params["access_token"] = token()
    url = f"{BASE}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()}")


def check():
    me = get("me", fields="id,name")
    print(f"Token belongs to: {me.get('name')} ({me.get('id')})")
    if me.get("id") != SYSTEM_USER_ID:
        print(f"  warning: expected system user {SYSTEM_USER_ID}")
    perms = get("me/permissions")
    granted = [p["permission"] for p in perms.get("data", []) if p.get("status") == "granted"]
    print("Granted permissions:", ", ".join(granted) or "(none)")
    acct = get(f"act_{AD_ACCOUNT_ID}", fields="name,account_status,currency,timezone_name,amount_spent")
    print("Ad account:", json.dumps(acct, indent=2))


def campaigns():
    res = get(f"act_{AD_ACCOUNT_ID}/campaigns", fields="id,name,status,objective,daily_budget", limit=100)
    for c in res.get("data", []):
        print(f"{c['id']}  {c['status']:<8}  {c.get('objective', ''):<22}  {c['name']}")


def insights(date_preset="last_30d"):
    res = get(
        f"act_{AD_ACCOUNT_ID}/insights",
        fields="spend,impressions,clicks,ctr,cpc,actions",
        date_preset=date_preset,
    )
    print(json.dumps(res.get("data", []), indent=2))


if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["check"]
    {"check": check, "campaigns": campaigns, "insights": insights}[cmd](*args)
