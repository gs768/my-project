"""Adapters that ask an AI assistant a question the way a user would.

Each provider returns an `Answer` with the response text and the web sources it
cited. Web search / grounding is switched on wherever the API supports it, since
that's what the consumer apps (ChatGPT, Perplexity, Gemini, Claude) do.
"""
from __future__ import annotations

import hashlib
import random
import time
from dataclasses import dataclass, field
from datetime import date

import httpx

from .config import env

TIMEOUT = httpx.Timeout(180.0, connect=15.0)


@dataclass
class Answer:
    text: str
    citations: list[dict] = field(default_factory=list)   # [{"url":..., "title":...}]
    model_version: str | None = None


class ProviderError(RuntimeError):
    pass


class Provider:
    key: str = ""
    label: str = ""
    api_key_env: str = ""
    model_env: str = ""
    default_model: str = ""

    @property
    def api_key(self) -> str:
        return env(self.api_key_env)

    @property
    def model(self) -> str:
        return env(self.model_env, self.default_model)

    def configured(self) -> bool:
        return bool(self.api_key)

    def ask(self, prompt: str, country: str = "US", language: str = "en") -> Answer:
        raise NotImplementedError

    def complete(self, prompt: str) -> str:
        """Plain completion with no web search (used for analysis tasks)."""
        raise NotImplementedError


def _post(url: str, headers: dict, body: dict, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            r = httpx.post(url, headers=headers, json=body, timeout=TIMEOUT)
        except httpx.TransportError as e:
            if attempt == retries - 1:
                raise ProviderError(f"network error: {e}") from e
            time.sleep(2 ** attempt * 2)
            continue
        if r.status_code in (429, 500, 502, 503, 504, 529) and attempt < retries - 1:
            time.sleep(float(r.headers.get("retry-after") or 2 ** attempt * 2))
            continue
        if r.status_code >= 400:
            raise ProviderError(f"HTTP {r.status_code}: {r.text[:500]}")
        return r.json()
    raise ProviderError("exhausted retries")


def _dedupe(citations: list[dict]) -> list[dict]:
    seen, out = set(), []
    for c in citations:
        url = (c.get("url") or "").strip()
        if url and url not in seen:
            seen.add(url)
            out.append({"url": url, "title": c.get("title") or ""})
    return out


# --------------------------------------------------------------------------
class OpenAIProvider(Provider):
    key, label = "chatgpt", "ChatGPT"
    api_key_env, model_env, default_model = "OPENAI_API_KEY", "OPENAI_MODEL", "gpt-5-mini"

    def _call(self, body: dict) -> dict:
        return _post("https://api.openai.com/v1/responses",
                     {"Authorization": f"Bearer {self.api_key}"}, body)

    @staticmethod
    def _parse(data: dict) -> tuple[str, list[dict]]:
        texts, cites = [], []
        for item in data.get("output", []):
            if item.get("type") != "message":
                continue
            for part in item.get("content", []):
                if part.get("type") == "output_text":
                    texts.append(part.get("text", ""))
                    for a in part.get("annotations", []):
                        if a.get("type") == "url_citation":
                            cites.append({"url": a.get("url"), "title": a.get("title")})
        return "\n".join(texts), cites

    def ask(self, prompt, country="US", language="en"):
        data = self._call({
            "model": self.model,
            "input": prompt,
            "tools": [{"type": "web_search",
                       "user_location": {"type": "approximate", "country": country}}],
        })
        text, cites = self._parse(data)
        return Answer(text, _dedupe(cites), data.get("model"))

    def complete(self, prompt):
        return self._parse(self._call({"model": self.model, "input": prompt}))[0]


# --------------------------------------------------------------------------
class ClaudeProvider(Provider):
    key, label = "claude", "Claude"
    api_key_env, model_env, default_model = "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "claude-opus-5"

    def _client(self):
        import anthropic
        return anthropic.Anthropic(api_key=self.api_key, timeout=300.0)

    def _create(self, messages, tools=None):
        kwargs = dict(model=self.model, max_tokens=16000, messages=messages)
        if tools:
            kwargs["tools"] = tools
        # Server-side fallbacks: if the model declines, the API re-runs the
        # request on a fallback model instead of returning an empty refusal.
        return self._client().beta.messages.create(
            betas=["server-side-fallback-2026-07-01"],
            extra_body={"fallbacks": "default"},
            **kwargs,
        )

    def _run(self, prompt, tools=None):
        import anthropic
        messages = [{"role": "user", "content": prompt}]
        try:
            resp = self._create(messages, tools)
            # Long server-tool turns can pause; resume up to a few times.
            for _ in range(4):
                if resp.stop_reason != "pause_turn":
                    break
                messages = messages + [{"role": "assistant", "content": resp.content}]
                resp = self._create(messages, tools)
        except anthropic.APIStatusError as e:
            raise ProviderError(f"HTTP {e.status_code}: {e.message}") from e
        except anthropic.APIConnectionError as e:
            raise ProviderError(f"network error: {e}") from e
        if resp.stop_reason == "refusal":
            raise ProviderError("model declined to answer")
        return resp

    def ask(self, prompt, country="US", language="en"):
        # The dynamic-filtering search tool needs Opus 4.6+/Sonnet 4.6+; older
        # models such as Haiku 4.5 only accept the basic variant.
        newer = any(self.model.startswith(p) for p in (
            "claude-opus-5", "claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8",
            "claude-sonnet-5", "claude-sonnet-4-6", "claude-fable", "claude-mythos"))
        tools = [{"type": "web_search_20260209" if newer else "web_search_20250305",
                  "name": "web_search", "max_uses": 5,
                  "user_location": {"type": "approximate", "country": country}}]
        resp = self._run(prompt, tools)
        texts, cites, results = [], [], []
        for block in resp.content:
            if block.type == "text":
                texts.append(block.text)
                for c in getattr(block, "citations", None) or []:
                    if getattr(c, "url", None):
                        cites.append({"url": c.url, "title": getattr(c, "title", "")})
            elif block.type == "web_search_tool_result" and isinstance(block.content, list):
                results += [{"url": r.url, "title": r.title} for r in block.content
                            if getattr(r, "type", "") == "web_search_result"]
        # Prefer inline citations; fall back to search results that were read.
        return Answer("".join(texts), _dedupe(cites or results), resp.model)

    def complete(self, prompt):
        resp = self._run(prompt)
        return "".join(b.text for b in resp.content if b.type == "text")


# --------------------------------------------------------------------------
class GeminiProvider(Provider):
    key, label = "gemini", "Gemini"
    api_key_env, model_env, default_model = "GEMINI_API_KEY", "GEMINI_MODEL", "gemini-2.5-flash"

    def _call(self, body):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        return _post(url, {"x-goog-api-key": self.api_key}, body)

    def ask(self, prompt, country="US", language="en"):
        data = self._call({"contents": [{"parts": [{"text": prompt}]}],
                           "tools": [{"google_search": {}}]})
        cand = (data.get("candidates") or [{}])[0]
        text = "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", []))
        cites = []
        for chunk in cand.get("groundingMetadata", {}).get("groundingChunks", []):
            web = chunk.get("web") or {}
            uri, title = web.get("uri", ""), web.get("title", "")
            # Grounding URIs are Google redirect links; the title is the real domain.
            if "vertexaisearch" in uri and title and "." in title:
                uri = f"https://{title}/"
            cites.append({"url": uri, "title": title})
        return Answer(text, _dedupe(cites), data.get("modelVersion"))

    def complete(self, prompt):
        data = self._call({"contents": [{"parts": [{"text": prompt}]}]})
        cand = (data.get("candidates") or [{}])[0]
        return "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", []))


# --------------------------------------------------------------------------
class _ChatCompletionsProvider(Provider):
    url = ""

    def _call(self, prompt):
        return _post(self.url, {"Authorization": f"Bearer {self.api_key}"},
                     {"model": self.model, "messages": [{"role": "user", "content": prompt}]})

    def ask(self, prompt, country="US", language="en"):
        data = self._call(prompt)
        text = data["choices"][0]["message"]["content"] or ""
        cites = [{"url": r.get("url"), "title": r.get("title")} for r in data.get("search_results") or []]
        cites += [{"url": u, "title": ""} for u in data.get("citations") or [] if isinstance(u, str)]
        return Answer(text, _dedupe(cites), data.get("model"))

    def complete(self, prompt):
        return self._call(prompt)["choices"][0]["message"]["content"] or ""


class PerplexityProvider(_ChatCompletionsProvider):
    key, label = "perplexity", "Perplexity"
    api_key_env, model_env, default_model = "PERPLEXITY_API_KEY", "PERPLEXITY_MODEL", "sonar"
    url = "https://api.perplexity.ai/chat/completions"


class GrokProvider(_ChatCompletionsProvider):
    key, label = "grok", "Grok"
    api_key_env, model_env, default_model = "XAI_API_KEY", "XAI_MODEL", "grok-4"
    url = "https://api.x.ai/v1/chat/completions"


# --------------------------------------------------------------------------
class DemoProvider(Provider):
    """Offline provider producing plausible synthetic answers — for trying the app
    without API keys. Answers are deterministic per (prompt, model, day)."""

    key, label = "demo", "Demo model"

    SOURCES = ["reddit.com", "g2.com", "capterra.com", "en.wikipedia.org", "youtube.com",
               "forbes.com", "techradar.com", "medium.com", "quora.com", "nytimes.com",
               "zapier.com", "pcmag.com", "trustradius.com", "linkedin.com"]
    GOOD = ["excellent", "reliable", "easy to use", "great value", "powerful", "popular", "well-regarded"]
    MEH = ["solid", "decent", "a common choice", "fine for most teams"]
    BAD = ["expensive", "clunky", "limited", "has mixed reviews"]

    def __init__(self, entities: list[dict] | None = None, variant: str = "demo"):
        self.entities = entities or []
        self.variant = variant

    def configured(self):
        return True

    def ask(self, prompt, country="US", language="en", day: date | None = None):
        day = day or date.today()
        seed = hashlib.sha256(f"{prompt}|{self.variant}|{day.isoformat()}".encode()).hexdigest()
        rng = random.Random(int(seed[:12], 16))
        names = [e for e in self.entities]
        # Give the own brand a slowly improving mention rate so charts show a trend.
        weights = []
        for e in names:
            base = 0.55 if e.get("is_own") else rng.uniform(0.35, 0.8)
            if e.get("is_own"):
                base += min(0.25, (day.toordinal() % 60) / 240)
            weights.append(base)
        picked = [e for e, w in zip(names, weights) if rng.random() < w]
        rng.shuffle(picked)
        lines = [f"Here are some of the best options for \"{prompt.rstrip('?')}\":", ""]
        cites = []
        for i, e in enumerate(picked, 1):
            mood = rng.choices([self.GOOD, self.MEH, self.BAD], [0.55, 0.3, 0.15])[0]
            lines.append(f"{i}. **{e['name']}** – {rng.choice(mood)}, and {rng.choice(self.GOOD + self.MEH)} "
                         f"according to user reviews.")
            if e.get("domains") and rng.random() < 0.5:
                cites.append({"url": f"https://{e['domains'][0]}/", "title": e["name"]})
        if not picked:
            lines.append("It depends on your needs — compare pricing, integrations and support.")
        lines += ["", "Ultimately the right pick depends on your budget and team size."]
        for d in rng.sample(self.SOURCES, rng.randint(2, 5)):
            cites.append({"url": f"https://{d}/{seed[:8]}", "title": d})
        rng.shuffle(cites)
        return Answer("\n".join(lines), _dedupe(cites), self.variant)

    def complete(self, prompt):
        return ""


PROVIDERS: dict[str, Provider] = {p.key: p for p in [
    OpenAIProvider(), ClaudeProvider(), GeminiProvider(), PerplexityProvider(), GrokProvider(),
]}


def get(key: str, entities: list[dict] | None = None) -> Provider:
    if key.startswith("demo"):
        return DemoProvider(entities, key)
    if key not in PROVIDERS:
        raise KeyError(f"unknown provider {key!r}")
    return PROVIDERS[key]


def label(key: str) -> str:
    if key.startswith("demo"):
        return {"demo": "Demo", "demo-a": "Demo A", "demo-b": "Demo B", "demo-c": "Demo C"}.get(key, key)
    return PROVIDERS[key].label if key in PROVIDERS else key


def available() -> list[dict]:
    return [{"key": p.key, "label": p.label, "model": p.model, "configured": p.configured(),
             "env": p.api_key_env} for p in PROVIDERS.values()]


def analysis_provider() -> Provider | None:
    from . import config
    choice = config.ANALYSIS_PROVIDER
    if choice == "none":
        return None
    if choice != "auto":
        p = PROVIDERS.get(choice)
        return p if p and p.configured() else None
    return next((p for p in PROVIDERS.values() if p.configured()), None)
