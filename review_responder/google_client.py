"""Minimal Google Business Profile client (reviews only), stdlib-only."""

import json
import urllib.parse
import urllib.request

TOKEN_URL = "https://oauth2.googleapis.com/token"
API_BASE = "https://mybusiness.googleapis.com/v4"


class GoogleReviewsClient:
    def __init__(self, client_id, client_secret, refresh_token):
        self._client_id = client_id
        self._client_secret = client_secret
        self._refresh_token = refresh_token
        self._access_token = None

    def _get_access_token(self):
        if self._access_token is None:
            data = urllib.parse.urlencode(
                {
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "refresh_token": self._refresh_token,
                    "grant_type": "refresh_token",
                }
            ).encode()
            with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=data)) as resp:
                self._access_token = json.load(resp)["access_token"]
        return self._access_token

    def _request(self, method, url, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {self._get_access_token()}")
        if data is not None:
            req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)

    def list_reviews(self, account_id, location_id):
        """Yield every review for a location, following pagination."""
        base = f"{API_BASE}/accounts/{account_id}/locations/{location_id}/reviews"
        page_token = None
        while True:
            params = {"pageSize": 50}
            if page_token:
                params["pageToken"] = page_token
            page = self._request("GET", f"{base}?{urllib.parse.urlencode(params)}")
            yield from page.get("reviews", [])
            page_token = page.get("nextPageToken")
            if not page_token:
                return

    def reply_to_review(self, review_name, comment):
        """Create or update the owner reply. review_name is the review's full resource name."""
        return self._request("PUT", f"{API_BASE}/{review_name}/reply", {"comment": comment})
