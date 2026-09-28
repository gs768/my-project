// Pure text analysis: brand mention detection, ranking, sentiment and source extraction.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function termsFor(brand) {
  const terms = new Set([brand.name, ...(brand.aliases || [])].map((t) => t && t.trim()).filter(Boolean));
  if (brand.domain) terms.add(normalizeDomain(brand.domain));
  return [...terms];
}

function termRegex(term) {
  // Word-ish boundaries that also work for names with punctuation ("Monday.com", "C3.ai").
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, 'giu');
}

/**
 * Find which tracked brands a response mentions, how often, and in what order.
 * Returns [{ brandId, position, count, firstIndex, snippet }] sorted by position.
 */
export function detectMentions(text, brands) {
  if (!text) return [];
  const found = [];
  for (const brand of brands) {
    let first = Infinity;
    let count = 0;
    const spans = [];
    for (const term of termsFor(brand)) {
      for (const m of text.matchAll(termRegex(term))) {
        // Skip matches that sit inside a URL (a citation, not a mention in prose).
        const before = text.slice(Math.max(0, m.index - 60), m.index);
        if (/https?:\/\/\S*$/.test(before)) continue;
        spans.push([m.index, m.index + m[0].length]);
      }
    }
    // Overlapping alias matches (e.g. "Acme" inside "Acme Cloud") count once.
    spans.sort((a, b) => a[0] - b[0]);
    let lastEnd = -1;
    for (const [s, e] of spans) {
      if (s < lastEnd) continue;
      count++;
      lastEnd = e;
      first = Math.min(first, s);
    }
    if (count > 0) found.push({ brandId: brand.id, count, firstIndex: first, snippet: snippetAround(text, first) });
  }
  found.sort((a, b) => a.firstIndex - b.firstIndex);
  return found.map((f, i) => ({ ...f, position: i + 1 }));
}

export function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function snippetAround(text, index, radius = 160) {
  const start = Math.max(0, text.lastIndexOf('\n', index) + 1, index - radius);
  let end = text.indexOf('\n', index);
  if (end === -1 || end - index > radius) end = Math.min(text.length, index + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

const POSITIVE = [
  'best', 'leading', 'leader', 'excellent', 'great', 'top', 'popular', 'recommended', 'recommend', 'reliable',
  'powerful', 'robust', 'intuitive', 'easy', 'user-friendly', 'affordable', 'innovative', 'trusted', 'strong',
  'fast', 'flexible', 'comprehensive', 'standout', 'favorite', 'excels', 'outstanding', 'impressive', 'loved',
  'seamless', 'secure', 'scalable', 'well-known', 'highly', 'ideal', 'solid', 'praised', 'value',
];
const NEGATIVE = [
  'expensive', 'costly', 'poor', 'bad', 'worst', 'slow', 'limited', 'lacks', 'lacking', 'difficult', 'complex',
  'complicated', 'outdated', 'buggy', 'unreliable', 'weak', 'confusing', 'clunky', 'criticized', 'complaints',
  'issues', 'problems', 'drawback', 'drawbacks', 'downside', 'downsides', 'steep', 'frustrating', 'overpriced',
  'lawsuit', 'breach', 'scam', 'avoid', 'declining', 'however',
];
const posRe = new RegExp(`\\b(${POSITIVE.map(escapeRe).join('|')})\\b`, 'gi');
const negRe = new RegExp(`\\b(${NEGATIVE.map(escapeRe).join('|')})\\b`, 'gi');

/**
 * Lexicon sentiment of how a response talks about one brand, 0 (negative) – 100 (positive), 50 neutral.
 * Only sentences naming the brand are scored.
 */
export function lexiconSentiment(text, brand) {
  const res = termsFor(brand).map(termRegex);
  let pos = 0;
  let neg = 0;
  for (const s of sentences(text)) {
    if (!res.some((r) => { r.lastIndex = 0; return r.test(s); })) continue;
    pos += (s.match(posRe) || []).length;
    neg += (s.match(negRe) || []).length;
  }
  if (pos + neg === 0) return 50;
  return Math.round(50 + 50 * ((pos - neg) / (pos + neg + 1)));
}

export function normalizeDomain(input) {
  if (!input) return '';
  let d = String(input).trim().toLowerCase();
  try {
    if (/^https?:\/\//.test(d)) d = new URL(d).hostname;
  } catch { /* keep as is */ }
  return d.replace(/^www\./, '').replace(/\/.*$/, '');
}

/** Pull URLs out of answer text (markdown links and bare URLs). */
export function extractUrls(text) {
  if (!text) return [];
  const urls = [];
  const re = /\bhttps?:\/\/[^\s<>()"'\]\[]+/g;
  for (const m of text.matchAll(re)) urls.push(m[0].replace(/[.,;:!?*_]+$/, ''));
  return urls;
}

/** Merge provider-supplied citations with URLs found in text; dedupe by URL, keep first rank. */
export function collectCitations(providerCitations = [], text = '') {
  const seen = new Map();
  const add = (c) => {
    if (!c?.url) return;
    let url = c.url;
    try {
      const u = new URL(url);
      for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
      url = u.toString();
    } catch { return; }
    if (seen.has(url)) return;
    // Providers that hand back redirect URLs (Gemini grounding) pass the real domain separately.
    seen.set(url, { url, domain: normalizeDomain(c.domain || url), title: c.title || null, rank: seen.size + 1 });
  };
  providerCitations.forEach(add);
  extractUrls(text).forEach((url) => add({ url }));
  return [...seen.values()];
}

const SOURCE_TYPES = [
  ['ugc', /(^|\.)(reddit\.com|quora\.com|stackexchange\.com|stackoverflow\.com|medium\.com|substack\.com|news\.ycombinator\.com|dev\.to|tripadvisor\.)/],
  ['reference', /(^|\.)(wikipedia\.org|wikidata\.org|britannica\.com|investopedia\.com)$/],
  ['review', /(^|\.)(g2\.com|capterra\.com|trustpilot\.com|trustradius\.com|getapp\.com|softwareadvice\.com|yelp\.com|gartner\.com|producthunt\.com|consumerreports\.org)$/],
  ['video', /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)$/],
  ['social', /(^|\.)(linkedin\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|threads\.net|pinterest\.com)$/],
  ['news', /(^|\.)(nytimes\.com|wsj\.com|bbc\.co\.uk|bbc\.com|cnn\.com|reuters\.com|bloomberg\.com|forbes\.com|techcrunch\.com|theverge\.com|wired\.com|businessinsider\.com|cnbc\.com|theguardian\.com|ft\.com|zdnet\.com|cnet\.com|pcmag\.com|techradar\.com|engadget\.com|axios\.com)$/],
  ['institutional', /\.(gov|edu|mil|int)(\.[a-z]{2})?$|(^|\.)(who\.int|europa\.eu|nih\.gov)$/],
];

/** Classify a cited domain: own / competitor / ugc / reference / review / video / social / news / institutional / other. */
export function classifySource(domain, brands) {
  const d = normalizeDomain(domain);
  for (const b of brands) {
    const bd = normalizeDomain(b.domain);
    if (bd && (d === bd || d.endsWith('.' + bd))) return b.is_own ? 'own' : 'competitor';
  }
  for (const [type, re] of SOURCE_TYPES) if (re.test(d)) return type;
  return 'other';
}
