"""In-memory stand-ins for Sheets, Business Profile, Slack, and the drafter."""

from __future__ import annotations

import re

from gbp_reviews.drafter import AUTO_REPLY, CLIENT_FOLLOWUP, Draft
from gbp_reviews.google_api import GoogleApiError


def _col_index(letters: str) -> int:
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def _split(a1: str) -> tuple[str, str]:
    tab, _, rng = a1.rpartition("!")
    return tab.strip("'"), rng


class FakeSheets:
    def __init__(self):
        self.books: dict[str, dict[str, list[list[str]]]] = {}

    def tab(self, sid: str, tab: str) -> list[list[str]]:
        return self.books.setdefault(sid, {}).setdefault(tab, [])

    def get_values(self, sid, a1):
        tab, rng = _split(a1)
        grid = self.tab(sid, tab)
        m = re.match(r"^(\d+):(\d+)$", rng)
        if m:
            return [list(r) for r in grid[int(m.group(1)) - 1 : int(m.group(2))]]
        return [list(r) for r in grid]

    def append_rows(self, sid, tab, rows):
        grid = self.tab(sid, tab.strip("'"))
        grid.extend([str(c) for c in r] for r in rows)

    def batch_update_values(self, sid, data):
        for d in data:
            tab, rng = _split(d["range"])
            m = re.match(r"^([A-Z]+)(\d+)$", rng)
            col, row = _col_index(m.group(1)), int(m.group(2)) - 1
            grid = self.tab(sid, tab)
            for ri, values in enumerate(d["values"]):
                while len(grid) <= row + ri:
                    grid.append([])
                target = grid[row + ri]
                for ci, v in enumerate(values):
                    while len(target) <= col + ci:
                        target.append("")
                    target[col + ci] = str(v)

    def sheet_titles(self, sid):
        return list(self.books.get(sid, {}))

    def add_sheets(self, sid, titles):
        for t in titles:
            self.tab(sid, t)


class FakeGBP:
    def __init__(self, index: dict[str, str], reviews: dict[str, list[dict]]):
        self.index = index
        self.reviews = reviews  # resource -> reviews
        self.posted: dict[str, str] = {}
        self.fail: set[str] = set()

    def location_index(self):
        return dict(self.index)

    def list_reviews(self, resource):
        return [dict(r) for r in self.reviews.get(resource, [])]

    def _find(self, name):
        for revs in self.reviews.values():
            for r in revs:
                if r["name"] == name:
                    return r
        raise GoogleApiError(404, "GET", name, "")

    def get_review(self, name):
        return dict(self._find(name))

    def put_reply(self, name, comment):
        if name in self.fail:
            raise GoogleApiError(403, "PUT", name, "")
        self._find(name)["reviewReply"] = {"comment": comment}
        self.posted[name] = comment
        return {"comment": comment}


class FakeSlack:
    bot_user_id = "UBOT"

    def __init__(self):
        self.posts: list[dict] = []
        self.thread_messages: dict[str, list[dict]] = {}
        self.reactions: list[tuple[str, str]] = []
        self._n = 1000

    def _ts(self):
        self._n += 1
        return f"{self._n}.000100"

    def post(self, text, thread_ts=None):
        ts = self._ts()
        self.posts.append({"ts": ts, "text": text, "thread_ts": thread_ts})
        if thread_ts:
            self.thread_messages.setdefault(thread_ts, []).append({"ts": ts, "text": text, "bot_id": "B1", "user": "UBOT"})
        return ts

    def post_chunked(self, lines, thread_ts=None):
        return [self.post("\n".join(lines), thread_ts)]

    def human_reply(self, thread_ts, text, user="UHUMAN"):
        ts = self._ts()
        self.thread_messages.setdefault(thread_ts, []).append({"ts": ts, "text": text, "user": user})
        return ts

    def replies(self, thread_ts, oldest=None):
        msgs = self.thread_messages.get(thread_ts, [])
        return [m for m in msgs if oldest is None or float(m["ts"]) >= float(oldest)]

    def react(self, ts, emoji):
        self.reactions.append((ts, emoji))


class FakeDrafter:
    """Positive reviews -> auto reply; 1-2 stars -> client follow-up."""

    def __init__(self):
        self.draft_calls: list[dict] = []
        self.note_result: dict | None = None
        self.note_calls: list[dict] = []

    def draft(self, client, global_rules, client_rules, reviews):
        self.draft_calls.append({"client": client.client_location, "global": global_rules,
                                 "client_rules": client_rules, "reviews": reviews})
        out = {}
        for r in reviews:
            rec = AUTO_REPLY if r["stars"] >= 3 else CLIENT_FOLLOWUP
            out[r["review_id"]] = Draft(r["review_id"], rec, "because", f"Thanks {r['reviewer']}!")
        return out

    def interpret_note(self, message, client_names, items, rules, exclusions):
        self.note_calls.append({"message": message, "items": items})
        return self.note_result or {"operations": [], "summary": "", "questions": []}
