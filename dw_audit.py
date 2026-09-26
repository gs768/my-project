#!/usr/bin/env python3
"""
READ-ONLY post-launch audit of https://dwpersonalinjurylaw.com

Every request is a plain curl GET/HEAD. No forms, no logins, nothing written to the site.
Throttle: 1 request at a time (under the 2-concurrent limit), 1s pause between requests,
one retry after 30s on 429 / 5xx.

Usage:   python3 dw_audit.py
Output:  audit-report.md (the report) + audit-data/ (raw headers/bodies for spot-checks)
Needs:   python3 (3.9+) and curl. Nothing to pip install.
"""
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
from collections import defaultdict
from html.parser import HTMLParser

BASE = os.environ.get("AUDIT_BASE", "https://dwpersonalinjurylaw.com").rstrip("/")
HOST = urllib.parse.urlparse(BASE).netloc
STAGING = ("stagedwpinj", "wpenginepowered")
ALLOWED_TEL = {"7722665555", "4076021111", "5612993999"}
CITY_SLUGS = ["port-st-lucie", "stuart", "sunrise"]  # first path segment = city page
EXPECTED_NOINDEX = [
    "/blog/medical-expenses-in-port-st-lucie/",
    "/blog/lump-sum-settlements-in-port-st-lucie/",
    "/blog/lost-wages-in-port-st-lucie/",
    "/blog/aggravation-of-a-pre-existing-condition-in-port-st-lucie/",
]
REDIRECTS = [
    ("/team-members/", "/about-us/"),
    ("/medical-expenses-in-port-st-lucie/", "/blog/medical-expenses-in-port-st-lucie/"),
    ("/lump-sum-settlements-in-port-st-lucie/", "/blog/lump-sum-settlements-in-port-st-lucie/"),
    ("/lost-wages-in-port-st-lucie/", "/blog/lost-wages-in-port-st-lucie/"),
    ("/aggravation-of-a-pre-existing-condition-in-port-st-lucie/",
     "/blog/aggravation-of-a-pre-existing-condition-in-port-st-lucie/"),
]
TRACKING = {
    "GTM": "GTM-N34VRVT",
    "GA4": "G-K5YQJJ04Z2",
    "Google Ads": "AW-587608949",
    "CallRail": "cdn.callrail.com/companies/650814313",
}
DATA = "audit-data"
os.makedirs(DATA, exist_ok=True)

ISSUES = {"CRITICAL": [], "MAJOR": [], "MINOR": []}
SECTION_OK = {}
REPORT = []
REQ_COUNT = 0


def issue(level, url, problem, expected, fix, section):
    ISSUES[level].append((url, problem, expected, fix))
    SECTION_OK[section] = False


def out(line=""):
    print(line)
    REPORT.append(line)


# ---------------------------------------------------------------- curl helpers
def _run(args):
    global REQ_COUNT
    REQ_COUNT += 1
    p = subprocess.run(["curl", "-s", "--max-time", "45"] + args,
                       capture_output=True, text=True, errors="replace")
    time.sleep(1)  # 1-second pause between requests
    return p.stdout


def curl(args, code_of):
    """Run curl; on 429/5xx wait 30s and retry once. code_of(stdout) -> int status."""
    stdout = _run(args)
    code = code_of(stdout)
    if code == 429 or code >= 500:
        print(f"   ...{code}, waiting 30s and retrying once", file=sys.stderr)
        time.sleep(30)
        stdout = _run(args)
    return stdout


def safe_name(url):
    return re.sub(r"[^A-Za-z0-9]+", "_", url.replace(BASE, ""))[:120].strip("_") or "home"


def get(url, follow=True, store=True):
    """GET url. Returns dict(code, final, redirects, headers, body)."""
    name = safe_name(url)
    hdr = os.path.join(DATA, name + ".headers")
    body = os.path.join(DATA, name + ".html")
    args = ["-D", hdr, "-o", body, "--compressed",
            "-w", "%{http_code} %{url_effective} %{num_redirects}", url]
    if follow:
        args.insert(0, "-L")
    w = curl(args, lambda s: int((s.split() or ["0"])[0]))
    parts = w.split()
    code, final, nred = (int(parts[0]), parts[1], int(parts[2])) if len(parts) == 3 else (0, url, 0)
    headers = open(hdr, errors="replace").read() if os.path.exists(hdr) else ""
    text = open(body, errors="replace").read() if os.path.exists(body) else ""
    return {"code": code, "final": final, "redirects": nred, "headers": headers, "body": text}


def head_chain(url):
    """curl -sIL url -> list of (status, location) hops + final (code, url, n)."""
    s = curl(["-I", "-L", "-w", "\n__FINAL__ %{http_code} %{url_effective} %{num_redirects}\n", url],
             lambda s: int((re.findall(r"__FINAL__ (\d+)", s) or ["0"])[0]))
    hops = []
    for block in re.split(r"\r?\n\r?\n", s):
        m = re.search(r"^HTTP/[\d.]+ (\d+)", block, re.M)
        if not m:
            continue
        loc = re.search(r"^location:\s*(\S+)", block, re.M | re.I)
        hops.append((int(m.group(1)), loc.group(1) if loc else ""))
    fm = re.search(r"__FINAL__ (\d+) (\S+) (\d+)", s)
    final = (int(fm.group(1)), fm.group(2), int(fm.group(3))) if fm else (0, url, 0)
    return hops, final


def grep_lines(text, pattern, width=220):
    hits = []
    for i, line in enumerate(text.splitlines(), 1):
        m = re.search(pattern, line, re.I)
        if m:
            a = max(0, m.start() - 80)
            hits.append(f"L{i}: {line[a:a + width].strip()}")
    return hits


# ---------------------------------------------------------------- HTML parser
class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.in_title = "", False
        self.meta_desc = None
        self.robots = []
        self.canonicals = []
        self.h1 = 0
        self.tels = []
        self.anchors = []  # (href, text)
        self._a = None
        self.ldjson, self._ld = [], None

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            name = a.get("name", "").lower()
            if name == "description" and self.meta_desc is None:
                self.meta_desc = a.get("content", "")
            if name in ("robots", "googlebot"):
                self.robots.append(f'{name}="{a.get("content", "")}"')
        elif tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canonicals.append(a.get("href", ""))
        elif tag == "h1":
            self.h1 += 1
        elif tag == "a":
            href = a.get("href", "")
            if href.lower().startswith("tel:"):
                self.tels.append(href)
            self._a = [href, ""]
        elif tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._ld = ""

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag == "a" and self._a is not None:
            self.anchors.append((self._a[0], " ".join(self._a[1].split())))
            self._a = None
        elif tag == "script" and self._ld is not None:
            self.ldjson.append(self._ld)
            self._ld = None

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self._a is not None:
            self._a[1] += data
        if self._ld is not None:
            self._ld += data


def parse(body):
    p = Page()
    try:
        p.feed(body)
    except Exception:
        pass
    p.title = " ".join(p.title.split())
    return p


def city_regex(slug):
    toks = [r"(st\.?|saint)" if t == "st" else re.escape(t) for t in slug.split("-")]
    return re.compile(r"[\s\-]+".join(toks), re.I)


def path_of(url):
    return urllib.parse.urlparse(url).path or "/"


# ================================================================ 1. SITEMAP + ROBOTS
out(f"# Post-launch audit: {BASE}")
out(f"_Run {time.strftime('%Y-%m-%d %H:%M %Z')}. Read-only curl GET/HEAD only._\n")
out("## 1. Sitemap + robots")
SECTION_OK["1"] = True
r = get(BASE + "/robots.txt", store=True)
robots = r["body"]
out(f"robots.txt -> HTTP {r['code']}")
for line in robots.splitlines():
    if re.match(r"\s*(disallow|sitemap|user-agent)\s*:", line, re.I):
        out(f"    {line.strip()}")
if any(re.match(r"\s*Disallow:\s*/\s*$", l, re.I) for l in robots.splitlines()):
    issue("CRITICAL", BASE + "/robots.txt", 'Contains "Disallow: /" (whole site blocked)',
          "No site-wide Disallow", "WP Admin > Settings > Reading: untick 'Discourage search engines'; "
          "clear WP Engine cache", "1")
    out('  -> "Disallow: /" (site-wide) PRESENT')
else:
    out('  -> No site-wide "Disallow: /"')
robots_sitemaps = re.findall(r"^\s*Sitemap:\s*(\S+)", robots, re.I | re.M)
for sm in robots_sitemaps:
    if any(s in sm for s in STAGING) or HOST not in sm:
        issue("CRITICAL", BASE + "/robots.txt", f"Sitemap line points to {sm}",
              f"{BASE}/sitemap_index.xml", "Fix Sitemap line in robots.txt (Yoast file editor / "
              "physical robots.txt)", "1")
if not robots_sitemaps:
    issue("MINOR", BASE + "/robots.txt", "No Sitemap: line", f"Sitemap: {BASE}/sitemap_index.xml",
          "Add Sitemap line", "1")


def locs(xml):
    return [html.unescape(x.strip()) for x in re.findall(r"<loc>\s*(.*?)\s*</loc>", xml, re.S)]


idx = get(BASE + "/sitemap_index.xml")
out(f"\nsitemap_index.xml -> HTTP {idx['code']} (final {idx['final']})")
children = locs(idx["body"])
buckets = defaultdict(list)
all_locs = []
for child in children:
    c = get(child)
    urls = locs(c["body"])
    name = child.rsplit("/", 1)[-1].lower()
    kind = ("team members" if "team" in name else "posts" if name.startswith("post") else
            "pages" if name.startswith("page") else name)
    buckets[kind] += urls
    all_locs += [(u, kind) for u in urls]
    out(f"  {child} -> HTTP {c['code']}, {len(urls)} URLs")
    if c["code"] != 200:
        issue("MAJOR", child, f"Child sitemap returns {c['code']}", "200", "Regenerate Yoast sitemaps", "1")
for check in [child for child in children] + [u for u, _ in all_locs]:
    if any(s in check for s in STAGING):
        issue("CRITICAL", check, "Sitemap <loc> uses staging domain", f"{BASE}/...",
              "Search-replace staging URL in DB (WP-CLI search-replace), then resave Yoast", "1")
out("\nCounts: " + ", ".join(f"{k}={len(v)}" for k, v in buckets.items()) + f", total={len(all_locs)}")
if not all_locs:
    issue("CRITICAL", BASE + "/sitemap_index.xml", "No URLs found in sitemap", "Pages/posts listed",
          "Check Yoast XML sitemaps enabled", "1")

# ================================================================ 2 + 4. STATUS + HTML SCAN
# One GET -L per URL gives both the step-2 status line and the step-4 HTML (halves the load).
out("\n## 2. Status of every sitemap URL")
SECTION_OK["2"] = True
pages = {}
bad_status = []
for i, (u, kind) in enumerate(all_locs, 1):
    print(f"[{i}/{len(all_locs)}] {u}", file=sys.stderr)
    g = get(u)
    g["kind"] = kind
    pages[u] = g
    if g["code"] != 200 or g["redirects"] != 0:
        bad_status.append(u)
        out(f"  {g['code']} {g['final']} {g['redirects']}   <- {u}")
        lvl = "MAJOR" if g["code"] != 200 else "MINOR"
        issue(lvl, u, f"Returns {g['code']} after {g['redirects']} redirect(s) -> {g['final']}",
              "200, 0 redirects", "Update the sitemap/permalink or fix the page" if g["code"] != 200
              else "Sitemap lists a redirecting URL; list the final URL / check trailing slash", "2")
if not bad_status:
    out("  All sitemap URLs: 200 with 0 redirects.")

# extra: the 4 noindex blog posts (may be excluded from the sitemap because they are noindex)
extra = {}
for p in EXPECTED_NOINDEX:
    u = BASE + p
    extra[u] = pages[u] if u in pages else get(u)

# ================================================================ 3. REDIRECTS
out("\n## 3. Redirects (curl -sIL)")
SECTION_OK["3"] = True


def show_hops(src, hops, final):
    out(f"  {src}")
    for code, loc in hops:
        out(f"      {code} {('-> ' + loc) if loc else ''}")
    out(f"      final: {final[0]} {final[1]} ({final[2]} redirect(s))")


for src, dst in REDIRECTS:
    hops, final = head_chain(BASE + src)
    ok = hops and hops[0][0] == 301 and final[0] == 200 and final[1] == BASE + dst
    show_hops(BASE + src, hops, final)
    out(f"      {'PASS' if ok else 'FAIL'}" + (f" (note: {final[2]} hops)" if ok and final[2] > 1 else ""))
    if not ok:
        issue("MAJOR", BASE + src, f"Redirect chain {[h[0] for h in hops]} ends at {final[1]} ({final[0]})",
              f"301 -> {BASE + dst} (200)", "Add/fix 301 in Yoast Redirects / Redirection plugin / WP Engine "
              "redirect rules", "3")
for variant in [f"http://{HOST}/", f"https://www.{HOST}/", f"http://www.{HOST}/"]:
    hops, final = head_chain(variant)
    ok = (len(hops) == 2 and hops[0][0] == 301 and final[2] == 1
          and final[1] == BASE + "/" and final[0] == 200)
    show_hops(variant, hops, final)
    out(f"      {'PASS' if ok else 'FAIL'}")
    if not ok:
        issue("MAJOR", variant, f"{final[2]} hop(s), codes {[h[0] for h in hops]}, ends {final[1]}",
              f"single 301 -> {BASE}/", "WP Engine: set primary domain + force HTTPS so both rules "
              "fire in one hop", "3")

# ================================================================ 4. RAW HTML SCAN
out("\n## 4. Raw HTML scan")
for s in "4a 4b 4c 4d 4e 4f".split():
    SECTION_OK[s] = True
parsed = {u: parse(g["body"]) for u, g in {**pages, **extra}.items()}

out("### 4a staging strings")
for u, g in pages.items():
    hits = grep_lines(g["body"], "|".join(STAGING))
    for h in hits[:10]:
        out(f"  {u}  {h}")
    if hits:
        issue("CRITICAL", u, f"{len(hits)} line(s) reference staging domain (e.g. {hits[0][:120]})",
              "Only production URLs", "WP-CLI search-replace staging -> production (incl. serialized), "
              "regenerate page-builder CSS, clear caches", "4a")

out("### 4b noindex / X-Robots-Tag")
for u, g in {**pages, **extra}.items():
    pr = parsed[u]
    xrt = re.findall(r"^x-robots-tag:.*$", g["headers"], re.I | re.M)
    noidx_meta = [m for m in pr.robots if "noindex" in m.lower()]
    for m in noidx_meta:
        out(f"  {u}  <meta {m}>")
    for x in xrt:
        out(f"  {u}  header {x.strip()}")
    expected = path_of(u) in EXPECTED_NOINDEX
    is_noindex = bool(noidx_meta) or any("noindex" in x.lower() for x in xrt)
    if is_noindex and not expected:
        issue("CRITICAL", u, f"noindex present ({'; '.join(noidx_meta + [x.strip() for x in xrt])})",
              "index", "Yoast > page > Advanced > Allow search engines = Yes; check WP Engine "
              "X-Robots-Tag", "4b")
    if expected and not is_noindex and g["code"] == 200:
        issue("MINOR", u, "Expected noindex but page is indexable", "noindex", "Set noindex in Yoast", "4b")
    if expected and u in pages:
        issue("MINOR", u, "noindex page is listed in the sitemap", "Excluded from sitemap",
              "Yoast drops noindex posts automatically once set; resave", "4b")

out("### 4c canonical")
for u, g in pages.items():
    c = parsed[u].canonicals
    if not c:
        out(f"  {u}  (no canonical)")
        issue("MINOR", u, "No canonical tag", u, "Check Yoast output", "4c")
    elif c[0] != u or len(set(c)) > 1:
        out(f"  {u}  canonical={c}")
        lvl = "CRITICAL" if any(s in " ".join(c) for s in STAGING) else "MAJOR"
        issue(lvl, u, f"Canonical is {c}", u, "Clear Yoast canonical override / fix site URL", "4c")

out("### 4d tel: links")
for u, g in pages.items():
    for t in sorted(set(parsed[u].tels)):
        digits = re.sub(r"\D", "", urllib.parse.unquote(t[4:]))
        if len(digits) == 11 and digits.startswith("1"):
            digits = digits[1:]
        prob = []
        if len(digits) != 10:
            prob.append("not a complete 10-digit number")
        elif digits not in ALLOWED_TEL:
            prob.append("not an approved number")
        if prob:
            out(f"  {u}  href=\"{t}\"  ({', '.join(prob)})")
            issue("MAJOR", u, f'tel link "{t}" {", ".join(prob)}', "772-266-5555 / 407-602-1111 / 561-299-3999",
                  "Fix the link in the page/header/footer widget", "4d")

out("### 4e Meet the Team / old footer labels")
for u, g in pages.items():
    for h in grep_lines(g["body"], r"Meet the Team")[:5]:
        out(f"  {u}  {h}")
        issue("MINOR", u, f'"Meet the Team" text present ({h[:100]})', "Removed", "Edit the section", "4e")
    for href, text in parsed[u].anchors:
        if re.search(r"Personal Injury Lawyer (Sunrise|Stuart)", text, re.I):
            out(f"  {u}  <a href=\"{href}\">{text}</a>")
            issue("MINOR", u, f'Link labeled "{text}" -> {href}', "Removed/relabeled", "Edit footer menu", "4e")

out("### 4f 'Donaldson' in title / meta description")
for u in pages:
    pr = parsed[u]
    for field, val in (("title", pr.title), ("description", pr.meta_desc or "")):
        if re.search("donaldson", val, re.I):
            out(f"  {u}  {field}: {val}")
            issue("MAJOR", u, f"'Donaldson' in {field}: {val}", "Current firm name", "Edit Yoast title/meta", "4f")

# ================================================================ 5. TRACKING
out("\n## 5. Tracking")
SECTION_OK["5"] = True
posts = buckets.get("posts") or [u for u, _ in all_locs if "/blog/" in u]
track_urls = [BASE + "/", BASE + "/stuart/", BASE + "/sunrise/", BASE + "/contact-us/"] + posts[:1]
out("| URL | " + " | ".join(TRACKING) + " |")
out("|---|" + "---|" * len(TRACKING))
gtm_seen = False
for u in track_urls:
    g = pages.get(u) or get(u)
    row = {k: (v in g["body"]) for k, v in TRACKING.items()}
    gtm_seen |= row["GTM"]
    out(f"| {path_of(u)} | " + " | ".join("present" if row[k] else "MISSING" for k in TRACKING) + " |")
    if not row["GTM"]:
        issue("CRITICAL", u, "GTM-N34VRVT missing from raw HTML", "GTM snippet in <head>/<body>",
              "Re-add GTM (header/footer plugin or theme)", "5")
    if not row["CallRail"]:
        issue("MAJOR" if not row["GTM"] else "MINOR", u,
              "CallRail swap script not in raw HTML" + (" (may load via GTM)" if row["GTM"] else ""),
              "cdn.callrail.com/companies/650814313/... script", "Confirm CallRail tag in GTM or add script", "5")
    for k in ("GA4", "Google Ads"):
        if not row[k] and not row["GTM"]:
            issue("MAJOR", u, f"{k} ID missing and no GTM", TRACKING[k], "Add tag", "5")
if gtm_seen:
    js = get("https://www.googletagmanager.com/gtm.js?id=GTM-N34VRVT")
    out(f"\nGTM container gtm.js -> HTTP {js['code']}; contains: " + ", ".join(
        f"{k}={'yes' if v in js['body'] or v.split('/')[-1] in js['body'] else 'no'}" for k, v in TRACKING.items()
        if k != "GTM"))
    out("_GA4/Ads IDs absent from raw HTML are normal when they load through GTM; the line above "
        "checks the published container._")

# ================================================================ 6. SCHEMA
out("\n## 6. Schema (ld+json)")
SECTION_OK["6"] = True


def walk(node, path=""):
    if isinstance(node, dict):
        yield path, node
        for k, v in node.items():
            yield from walk(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk(v, f"{path}[{i}]")


for p in ["/", "/stuart/", "/sunrise/", "/port-st-lucie/"]:
    u = BASE + p
    g = pages.get(u) or get(u)
    blocks = (parsed.get(u) or parse(g["body"])).ldjson
    out(f"  {p}: {len(blocks)} ld+json block(s)")
    if not blocks:
        issue("MAJOR", u, "No ld+json schema", "Yoast graph + LegalService", "Check schema plugin", "6")
    for bi, raw in enumerate(blocks):
        try:
            data = json.loads(raw.strip().removeprefix("<![CDATA[").removesuffix("]]>").strip())
        except Exception as e:
            out(f"    block {bi}: JSON PARSE ERROR {e}")
            issue("MAJOR", u, f"ld+json block {bi} does not parse: {e}", "Valid JSON",
                  "Fix the custom schema snippet", "6")
            continue
        for jp, d in walk(data):
            t = d.get("@type")
            types = t if isinstance(t, list) else [t]
            if "LegalService" in types:
                out(f"    LegalService {d.get('name', '')!r} telephone={d.get('telephone')!r} "
                    f"@id={d.get('@id')!r}")
                tel = re.sub(r"\D", "", str(d.get("telephone") or ""))[-10:]
                if tel not in ALLOWED_TEL:
                    issue("MAJOR", u, f"LegalService telephone {d.get('telephone')!r}",
                          "Approved office number", "Fix schema telephone", "6")
            for key in ("@id", "url"):
                v = d.get(key)
                if isinstance(v, str) and any(s in v for s in STAGING):
                    out(f"    STAGING {key}: {v}  ({jp})")
                    issue("CRITICAL", u, f"Schema {key} uses staging: {v}", f"{BASE}/...",
                          "Search-replace staging URL; fix custom schema", "6")

# ================================================================ 7. TITLES / H1
out("\n## 7. Titles / meta / H1 (pages)")
SECTION_OK["7"] = True
page_urls = buckets.get("pages") or [u for u, k in all_locs if k != "posts"]
titles = defaultdict(list)
out("| URL | H1s | Title | Meta description |")
out("|---|---|---|---|")
for u in page_urls:
    pr = parsed[u]
    titles[pr.title].append(u)
    desc = pr.meta_desc
    out(f"| {path_of(u)} | {pr.h1} | {pr.title} | {desc if desc else '**MISSING**'} |")
    if not desc:
        issue("MINOR", u, "Missing meta description", "Unique 140-160 char description",
              "Add in Yoast", "7")
    if pr.h1 != 1:
        issue("MAJOR" if pr.h1 == 0 else "MINOR", u, f"H1 count = {pr.h1}", "1",
              "Fix heading levels in the page builder", "7")
    seg = path_of(u).strip("/").split("/")[0]
    if seg in CITY_SLUGS:
        rx = city_regex(seg)
        h1_text = " ".join(re.findall(r"<h1[^>]*>(.*?)</h1>", pages[u]["body"], re.S | re.I))
        h1_text = html.unescape(re.sub(r"<[^>]+>", " ", h1_text))
        for field, val in (("title", pr.title), ("H1", h1_text)):
            if not rx.search(val):
                issue("MAJOR", u, f"City page {field} does not name its city: {val.strip()[:100]!r}",
                      f"{seg.replace('-', ' ').title()} in {field}", "Edit Yoast title / page H1", "7")
for t, us in titles.items():
    if len(us) > 1:
        issue("MINOR", ", ".join(path_of(x) for x in us), f"Duplicate title {t!r}", "Unique titles",
              "Edit Yoast titles", "7")

# ================================================================ SUMMARY
n_c, n_M, n_m = (len(ISSUES[k]) for k in ("CRITICAL", "MAJOR", "MINOR"))
verdict = ("FAIL" if n_c else "PASS WITH ISSUES" if n_M else "PASS")
summary = [f"**Verdict: {verdict}** — {n_c} critical, {n_M} major, {n_m} minor "
           f"({len(all_locs)} sitemap URLs, {REQ_COUNT} requests).", ""]
for lvl in ("CRITICAL", "MAJOR", "MINOR"):
    summary.append(f"## {lvl} ({len(ISSUES[lvl])})")
    grouped = defaultdict(list)  # site-wide problems (header/footer) collapse into one line
    for url, prob, exp, fix in ISSUES[lvl]:
        grouped[(prob, exp, fix)].append(path_of(url) if url.startswith(BASE) else url)
    if not grouped:
        summary.append("- none")
    for (prob, exp, fix), urls in grouped.items():
        where = ", ".join(urls[:6]) + (f" (+{len(urls) - 6} more)" if len(urls) > 6 else "")
        summary.append(f"- **{where}** — {prob}  \n  expected: {exp} · fix: {fix}")
    summary.append("")
labels = {"1": "Sitemap + robots", "2": "URL status", "3": "Redirects", "4a": "Staging strings",
          "4b": "noindex", "4c": "Canonicals", "4d": "tel: links", "4e": "Old team/footer labels",
          "4f": "Donaldson", "5": "Tracking", "6": "Schema", "7": "Titles/H1"}
summary.append("## Section results")
for k, name in labels.items():
    summary.append(f"- {k} {name}: {'PASS' if SECTION_OK.get(k, True) else 'FAIL'}")
summary += ["", "---", "# Detail", ""]

with open("audit-report.md", "w") as f:
    f.write("\n".join(summary + REPORT) + "\n")
print("\n" + "\n".join(summary[:-3]))
print(f"\nFull report: {os.path.abspath('audit-report.md')}   raw files: {os.path.abspath(DATA)}/")
