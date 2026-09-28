"""Thin Google API clients: OAuth token refresh, Sheets, and Business Profile.

All calls run as analytics@sdmark.net via a stored OAuth refresh token.
"""

from __future__ import annotations

import time
from typing import Any, Iterator
from urllib.parse import quote

import requests

SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
    "https://www.googleapis.com/auth/spreadsheets",
]

TOKEN_URL = "https://oauth2.googleapis.com/token"
SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"
ACCOUNT_MGMT = "https://mybusinessaccountmanagement.googleapis.com/v1"
BUSINESS_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1"
MYBUSINESS_V4 = "https://mybusiness.googleapis.com/v4"


class GoogleSession:
    """requests.Session that refreshes the access token and retries 429/5xx."""

    def __init__(self, client_id: str, client_secret: str, refresh_token: str):
        self._client_id = client_id
        self._client_secret = client_secret
        self._refresh_token = refresh_token
        self._token: str | None = None
        self._expires_at = 0.0
        self._http = requests.Session()

    def _access_token(self) -> str:
        if self._token and time.time() < self._expires_at - 60:
            return self._token
        resp = self._http.post(
            TOKEN_URL,
            data={
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "refresh_token": self._refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()
        self._token = body["access_token"]
        self._expires_at = time.time() + int(body.get("expires_in", 3600))
        return self._token

    def request(self, method: str, url: str, **kwargs: Any) -> dict:
        for attempt in range(5):
            headers = {"Authorization": f"Bearer {self._access_token()}"}
            resp = self._http.request(method, url, headers=headers, timeout=60, **kwargs)
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(2 ** attempt * 2)
                continue
            if resp.status_code == 401 and attempt == 0:
                self._token = None
                continue
            if not resp.ok:
                # Keep the body out of logs beyond the status line; bodies can echo request data.
                raise GoogleApiError(resp.status_code, method, url.split("?")[0], resp.text[:500])
            return resp.json() if resp.content else {}
        raise AssertionError("unreachable")


class GoogleApiError(RuntimeError):
    def __init__(self, status: int, method: str, url: str, body: str):
        super().__init__(f"Google API {method} {url} -> {status}")
        self.status = status
        self.body = body


# --------------------------------------------------------------------------- Sheets


class Sheets:
    def __init__(self, session: GoogleSession):
        self._s = session

    def get_values(self, spreadsheet_id: str, a1_range: str) -> list[list[str]]:
        url = f"{SHEETS}/{spreadsheet_id}/values/{quote(a1_range, safe='')}"
        body = self._s.request("GET", url, params={"valueRenderOption": "FORMATTED_VALUE"})
        return body.get("values", [])

    def append_rows(self, spreadsheet_id: str, tab: str, rows: list[list[Any]]) -> None:
        if not rows:
            return
        url = f"{SHEETS}/{spreadsheet_id}/values/{quote(tab + '!A1', safe='')}:append"
        self._s.request(
            "POST",
            url,
            params={"valueInputOption": "RAW", "insertDataOption": "INSERT_ROWS"},
            json={"values": rows},
        )

    def batch_update_values(self, spreadsheet_id: str, data: list[dict]) -> None:
        if not data:
            return
        url = f"{SHEETS}/{spreadsheet_id}/values:batchUpdate"
        self._s.request("POST", url, json={"valueInputOption": "RAW", "data": data})

    def sheet_titles(self, spreadsheet_id: str) -> list[str]:
        body = self._s.request(
            "GET", f"{SHEETS}/{spreadsheet_id}", params={"fields": "sheets.properties.title"}
        )
        return [s["properties"]["title"] for s in body.get("sheets", [])]

    def add_sheets(self, spreadsheet_id: str, titles: list[str]) -> None:
        if not titles:
            return
        reqs = [{"addSheet": {"properties": {"title": t}}} for t in titles]
        self._s.request("POST", f"{SHEETS}/{spreadsheet_id}:batchUpdate", json={"requests": reqs})


# --------------------------------------------------------------------------- Business Profile


class BusinessProfile:
    def __init__(self, session: GoogleSession):
        self._s = session

    def _paged(self, url: str, key: str, params: dict) -> Iterator[dict]:
        params = dict(params)
        while True:
            body = self._s.request("GET", url, params=params)
            yield from body.get(key, [])
            token = body.get("nextPageToken")
            if not token:
                return
            params["pageToken"] = token

    def list_accounts(self) -> list[dict]:
        return list(self._paged(f"{ACCOUNT_MGMT}/accounts", "accounts", {"pageSize": 20}))

    def list_locations(self, account_name: str) -> list[dict]:
        return list(
            self._paged(
                f"{BUSINESS_INFO}/{account_name}/locations",
                "locations",
                {"pageSize": 100, "readMask": "name,title"},
            )
        )

    def location_index(self) -> dict[str, str]:
        """Map bare location ID -> v4 resource 'accounts/{a}/locations/{l}'.

        A location can be visible under several accounts (owner account, a
        location group, the user's personal account). Any of them works for the
        v4 reviews API, so the first one seen wins.
        """
        index: dict[str, str] = {}
        for account in self.list_accounts():
            try:
                locations = self.list_locations(account["name"])
            except GoogleApiError as exc:
                if exc.status in (403, 404):
                    continue
                raise
            for loc in locations:
                loc_id = loc["name"].split("/")[-1]
                index.setdefault(loc_id, f"{account['name']}/locations/{loc_id}")
        return index

    def list_reviews(self, location_resource: str) -> list[dict]:
        return list(
            self._paged(
                f"{MYBUSINESS_V4}/{location_resource}/reviews",
                "reviews",
                {"pageSize": 50, "orderBy": "updateTime desc"},
            )
        )

    def get_review(self, review_name: str) -> dict:
        return self._s.request("GET", f"{MYBUSINESS_V4}/{review_name}")

    def put_reply(self, review_name: str, comment: str) -> dict:
        return self._s.request(
            "PUT", f"{MYBUSINESS_V4}/{review_name}/reply", json={"comment": comment}
        )
