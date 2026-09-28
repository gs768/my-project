"""Turn a raw AI answer into structured data: which brands were mentioned, in
what order, with what sentiment, and which sources were cited."""
from __future__ import annotations

import re
from collections import Counter
from urllib.parse import urlparse

POSITIVE = {
    "best", "top", "leading", "excellent", "great", "reliable", "easy", "intuitive", "powerful",
    "popular", "recommended", "recommend", "trusted", "affordable", "value", "strong", "robust",
    "well-regarded", "favorite", "love", "loved", "praised", "fast", "flexible", "innovative",
    "standout", "ideal", "outstanding", "impressive", "solid", "seamless", "comprehensive",
    "user-friendly", "secure", "scalable", "efficient", "superior", "winner", "preferred",
}
NEGATIVE = {
    "expensive", "pricey", "costly", "clunky", "limited", "slow", "difficult", "complex",
    "complicated", "buggy", "outdated", "poor", "bad", "worse", "worst", "lacks", "lacking",
    "mixed", "complaints", "issues", "problems", "downside", "downsides", "drawback",
    "drawbacks", "frustrating", "confusing", "unreliable", "steep", "overpriced", "weak",
    "avoid", "criticized", "cons", "hidden", "declining", "concerns", "breach", "lawsuit",
}
NEGATORS = {"not", "no", "never", "isn't", "aren't", "wasn't", "doesn't", "don't", "hardly", "without"}

UGC = {"reddit.com", "quora.com", "youtube.com", "x.com", "twitter.com", "facebook.com",
       "linkedin.com", "medium.com", "stackoverflow.com", "stackexchange.com", "tiktok.com",
       "instagram.com", "substack.com", "news.ycombinator.com", "producthunt.com", "tripadvisor.com"}
REVIEW = {"g2.com", "capterra.com", "trustradius.com", "trustpilot.com", "yelp.com",
          "gartner.com", "getapp.com", "softwareadvice.com", "consumerreports.org", "sitejabber.com"}
REFERENCE = {"wikipedia.org", "britannica.com", "investopedia.com", "wikihow.com", "dictionary.com"}

SOURCE_TYPES = ["you", "competitor", "ugc", "review", "reference", "institutional", "editorial"]


def _terms(entity: dict) -> list[str]:
    terms = [entity["name"], *entity.get("aliases", []), *entity.get("domains", [])]
    return sorted({t.strip() for t in terms if t and t.strip()}, key=len, reverse=True)


def _pattern(term: str) -> re.Pattern:
    return re.compile(r"(?<![\w-])" + re.escape(term) + r"(?![\w-])", re.IGNORECASE)


def find_occurrences(text: str, entity: dict) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    for term in _terms(entity):
        for m in _pattern(term).finditer(text):
            # Case-insensitive, except a capitalised brand name must appear
            # capitalised — so "Close" (the CRM) doesn't match "close to".
            if term[0].isupper() and not m.group(0)[0].isupper():
                continue
            # Skip spans already covered by a longer term (e.g. "Acme CRM" vs "Acme").
            if not any(s <= m.start() < e for s, e in spans):
                spans.append((m.start(), m.end()))
    return sorted(spans)


_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def _sentences(text: str) -> list[tuple[int, int, str]]:
    out, pos = [], 0
    for part in _SENT_SPLIT.split(text):
        start = text.find(part, pos)
        if part.strip():
            out.append((start, start + len(part), part))
        pos = start + len(part)
    return out


def sentiment_score(sentences: list[str]) -> int:
    """Lexicon score on 0..100 (50 = neutral), in the spirit of Peec's sentiment metric."""
    pos = neg = 0
    for s in sentences:
        words = re.findall(r"[a-z][a-z'-]*", s.lower())
        for i, w in enumerate(words):
            negated = any(x in NEGATORS for x in words[max(0, i - 3):i])
            if w in POSITIVE:
                neg, pos = (neg + 1, pos) if negated else (neg, pos + 1)
            elif w in NEGATIVE:
                pos, neg = (pos + 1, neg) if negated else (pos, neg + 1)
    if pos + neg == 0:
        return 50
    return max(0, min(100, round(50 + 50 * (pos - neg) / (pos + neg + 1))))


def analyze_mentions(text: str, entities: list[dict]) -> list[dict]:
    """Return one record per mentioned entity: position, count, sentiment, snippet."""
    if not text:
        return []
    sentences = _sentences(text)
    found = []
    for e in entities:
        spans = find_occurrences(text, e)
        if not spans:
            continue
        hit = [s for s in sentences if any(s[0] <= a < s[1] for a, _ in spans)]
        snippet = hit[0][2].strip() if hit else text[max(0, spans[0][0] - 80): spans[0][1] + 160]
        found.append({
            "entity_id": e["id"],
            "first": spans[0][0],
            "count": len(spans),
            "sentiment": sentiment_score([h[2] for h in hit]),
            "snippet": re.sub(r"\s+", " ", snippet)[:400],
        })
    found.sort(key=lambda m: m["first"])
    for i, m in enumerate(found, 1):
        m["position"] = i
        del m["first"]
    return found


def domain_of(url: str) -> str:
    host = (urlparse(url if "://" in url else "https://" + url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _matches(domain: str, candidates) -> bool:
    return any(domain == c or domain.endswith("." + c) for c in candidates)


def classify_source(domain: str, entities: list[dict]) -> str:
    for e in entities:
        doms = [domain_of(d) for d in e.get("domains", [])]
        if doms and _matches(domain, doms):
            return "you" if e.get("is_own") else "competitor"
    if _matches(domain, UGC):
        return "ugc"
    if _matches(domain, REVIEW):
        return "review"
    if _matches(domain, REFERENCE):
        return "reference"
    if re.search(r"\.(gov|edu|mil|int)(\.[a-z]{2})?$|\.ac\.[a-z]{2}$", domain):
        return "institutional"
    return "editorial"


_MD_LINK = re.compile(r"\[([^\]]{1,200})\]\((https?://[^)\s]+)\)")
_BARE_URL = re.compile(r"(?<![(\[])https?://[^\s)\]>\"']+")


def extract_citations(answer_citations: list[dict], text: str, entities: list[dict]) -> list[dict]:
    """Merge API-provided citations with links that appear inline in the answer."""
    items = list(answer_citations)
    for title, url in _MD_LINK.findall(text or ""):
        items.append({"url": url, "title": title})
    for url in _BARE_URL.findall(text or ""):
        items.append({"url": url.rstrip(".,;"), "title": ""})
    out, seen = [], set()
    for c in items:
        url = c["url"]
        d = domain_of(url)
        if not d or url in seen:
            continue
        seen.add(url)
        out.append({"url": url, "title": c.get("title") or "", "domain": d,
                    "position": len(out) + 1, "source_type": classify_source(d, entities)})
    return out


# ---- competitor discovery ------------------------------------------------
_CANDIDATE = re.compile(
    r"\*\*([A-Z][\w&.+' -]{1,40}?)\*\*"                 # **Bold Name**
    r"|^\s*(?:\d+[.)]|[-*•])\s+([A-Z][\w&.+'-]*(?: [A-Z][\w&.+'-]*){0,3})",  # list item lead
    re.MULTILINE,
)
_STOP = {"The", "This", "These", "Here", "Pros", "Cons", "Pricing", "Price", "Features", "Best",
         "Overall", "Key", "Why", "Summary", "Conclusion", "Note", "Tip", "Ultimately", "Yes", "No",
         "Option", "Options", "Step", "Top", "Free", "Paid", "Bottom", "Verdict", "Considerations"}


def discover_brands(texts: list[str], entities: list[dict], limit: int = 15) -> list[tuple[str, int]]:
    """Heuristically find brand-like names that recur in answers but aren't tracked yet."""
    known = [t.lower() for e in entities for t in _terms(e)]
    counts: Counter[str] = Counter()
    for text in texts:
        seen = set()
        for m in _CANDIDATE.finditer(text or ""):
            name = (m.group(1) or m.group(2) or "").strip(" -:.")
            if not name or name.split()[0] in _STOP or len(name) < 2:
                continue
            if any(k in name.lower() or name.lower() in k for k in known):
                continue
            seen.add(name)
        counts.update(seen)
    return [(n, c) for n, c in counts.most_common(limit) if c >= 2]
