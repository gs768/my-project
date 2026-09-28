"""Minimal Slack Web API client (bot token)."""

from __future__ import annotations

import time
from typing import Any

import requests

API = "https://slack.com/api"
# Slack truncates very long messages; keep each post comfortably under the limit.
MAX_CHARS = 3500


class SlackError(RuntimeError):
    pass


class Slack:
    def __init__(self, token: str, channel: str):
        self.channel = channel
        self._http = requests.Session()
        self._http.headers["Authorization"] = f"Bearer {token}"
        self._bot_user_id: str | None = None

    def _call(self, method: str, http: str = "POST", **payload: Any) -> dict:
        for attempt in range(5):
            if http == "GET":
                resp = self._http.get(f"{API}/{method}", params=payload, timeout=30)
            else:
                resp = self._http.post(f"{API}/{method}", json=payload, timeout=30)
            if resp.status_code == 429 and attempt < 4:
                time.sleep(int(resp.headers.get("Retry-After", "5")))
                continue
            body = resp.json()
            if not body.get("ok"):
                raise SlackError(f"{method}: {body.get('error')}")
            return body
        raise SlackError(f"{method}: rate limited")

    @property
    def bot_user_id(self) -> str:
        if self._bot_user_id is None:
            self._bot_user_id = self._call("auth.test")["user_id"]
        return self._bot_user_id

    def post(self, text: str, thread_ts: str | None = None) -> str:
        payload: dict[str, Any] = {
            "channel": self.channel,
            "text": text,
            "unfurl_links": False,
            "unfurl_media": False,
        }
        if thread_ts:
            payload["thread_ts"] = thread_ts
        return self._call("chat.postMessage", **payload)["ts"]

    def post_chunked(self, lines: list[str], thread_ts: str | None = None) -> list[str]:
        """Post lines as one or more messages, splitting on line boundaries."""
        out: list[str] = []
        buf = ""
        for line in lines:
            while len(line) > MAX_CHARS:  # pathological single line
                out.append(self.post(line[:MAX_CHARS], thread_ts))
                line = line[MAX_CHARS:]
            if len(buf) + len(line) + 1 > MAX_CHARS:
                out.append(self.post(buf.rstrip(), thread_ts))
                buf = ""
            buf += line + "\n"
        if buf.strip():
            out.append(self.post(buf.rstrip(), thread_ts))
        return out

    def replies(self, thread_ts: str, oldest: str | None = None) -> list[dict]:
        messages: list[dict] = []
        cursor = None
        while True:
            params: dict[str, Any] = {"channel": self.channel, "ts": thread_ts, "limit": 200}
            if oldest:
                params["oldest"] = oldest
            if cursor:
                params["cursor"] = cursor
            body = self._call("conversations.replies", http="GET", **params)
            messages.extend(body.get("messages", []))
            cursor = (body.get("response_metadata") or {}).get("next_cursor")
            if not cursor:
                break
        return [m for m in messages if m.get("ts") != thread_ts]

    def react(self, ts: str, emoji: str) -> None:
        try:
            self._call("reactions.add", channel=self.channel, timestamp=ts, name=emoji)
        except SlackError as exc:
            if "already_reacted" not in str(exc):
                raise
