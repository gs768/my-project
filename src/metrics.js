// Aggregations behind the dashboard: visibility, share of voice, position, sentiment, sources.
import { all, hydrateBrand } from './db.js';
import { classifySource } from './analysis.js';

const round = (n, d = 1) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

function shiftDay(day, delta) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
}

/** Resolve query params into a normalized filter object. */
export function parseFilters(projectId, q = {}) {
  const to = q.to || new Date().toISOString().slice(0, 10);
  const from = q.from || shiftDay(to, -29);
  const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);
  return {
    projectId: Number(projectId),
    from,
    to,
    providers: list(q.providers),
    tags: list(q.tags),
    promptId: q.prompt ? Number(q.prompt) : null,
  };
}

function previousPeriod(f) {
  const len = daysBetween(f.from, f.to);
  return { ...f, from: shiftDay(f.from, -len), to: shiftDay(f.from, -1) };
}

/** SQL fragment selecting successful responses matching the filters (alias r, prompts p). */
function scope(f) {
  const where = ['p.project_id = ?', 'r.error IS NULL', 'r.day BETWEEN ? AND ?'];
  const params = [f.projectId, f.from, f.to];
  if (f.providers.length) {
    where.push(`r.provider IN (${f.providers.map(() => '?').join(',')})`);
    params.push(...f.providers);
  }
  if (f.tags.length) {
    where.push(`EXISTS (SELECT 1 FROM json_each(p.tags) t WHERE t.value IN (${f.tags.map(() => '?').join(',')}))`);
    params.push(...f.tags);
  }
  if (f.promptId) {
    where.push('p.id = ?');
    params.push(f.promptId);
  }
  return { sql: `FROM responses r JOIN prompts p ON p.id = r.prompt_id WHERE ${where.join(' AND ')}`, params };
}

function brandsOf(projectId) {
  return all('SELECT * FROM brands WHERE project_id = ? ORDER BY is_own DESC, name', projectId).map(hydrateBrand);
}

function brandStats(f) {
  const s = scope(f);
  const [{ total }] = all(`SELECT COUNT(*) AS total ${s.sql}`, ...s.params);
  const rows = all(
    `SELECT m.brand_id, COUNT(DISTINCT m.response_id) AS responses, SUM(m.count) AS mentions,
            AVG(m.position) AS position, AVG(m.sentiment) AS sentiment
     FROM mentions m WHERE m.response_id IN (SELECT r.id ${s.sql}) GROUP BY m.brand_id`,
    ...s.params,
  );
  const byBrand = new Map(rows.map((r) => [r.brand_id, r]));
  const totalMentioned = rows.reduce((a, r) => a + r.responses, 0);
  return { total, byBrand, totalMentioned };
}

/** Headline table: one row per tracked brand, with change vs the previous period of equal length. */
export function brandMetrics(f) {
  const brands = brandsOf(f.projectId);
  const cur = brandStats(f);
  const prev = brandStats(previousPeriod(f));
  const calc = (st, id) => {
    const r = st.byBrand.get(id);
    return {
      visibility: st.total ? round((100 * (r?.responses || 0)) / st.total) : null,
      shareOfVoice: st.totalMentioned ? round((100 * (r?.responses || 0)) / st.totalMentioned) : null,
      position: round(r?.position),
      sentiment: round(r?.sentiment, 0),
      mentions: r?.mentions || 0,
    };
  };
  const rows = brands.map((b) => {
    const c = calc(cur, b.id);
    const p = calc(prev, b.id);
    const delta = (k) => (c[k] == null || p[k] == null ? null : round(c[k] - p[k]));
    return {
      brand: b,
      ...c,
      change: { visibility: delta('visibility'), shareOfVoice: delta('shareOfVoice'), position: delta('position'), sentiment: delta('sentiment') },
    };
  });
  rows.sort((a, b) => (b.visibility ?? -1) - (a.visibility ?? -1));
  rows.forEach((r, i) => (r.rank = i + 1));
  return { totalResponses: cur.total, previousResponses: prev.total, brands: rows };
}

/** Daily visibility (%) and average position per brand. */
export function timeseries(f) {
  const s = scope(f);
  const totals = all(`SELECT r.day, COUNT(*) AS n ${s.sql} GROUP BY r.day ORDER BY r.day`, ...s.params);
  const rows = all(
    `SELECT r.day, m.brand_id, COUNT(DISTINCT m.response_id) AS n, AVG(m.position) AS position, AVG(m.sentiment) AS sentiment
     FROM mentions m JOIN responses r ON r.id = m.response_id
     WHERE m.response_id IN (SELECT r.id ${s.sql}) GROUP BY r.day, m.brand_id`,
    ...s.params,
  );
  const days = totals.map((t) => t.day);
  const totalByDay = new Map(totals.map((t) => [t.day, t.n]));
  const series = brandsOf(f.projectId).map((b) => {
    const mine = new Map(rows.filter((r) => r.brand_id === b.id).map((r) => [r.day, r]));
    return {
      brandId: b.id,
      name: b.name,
      color: b.color,
      isOwn: b.is_own,
      visibility: days.map((d) => round((100 * (mine.get(d)?.n || 0)) / totalByDay.get(d))),
      position: days.map((d) => round(mine.get(d)?.position)),
      sentiment: days.map((d) => round(mine.get(d)?.sentiment, 0)),
    };
  });
  return { days, series };
}

/** Own-brand visibility split by engine. */
export function providerBreakdown(f) {
  const own = brandsOf(f.projectId).find((b) => b.is_own);
  const s = scope(f);
  return all(
    `SELECT r.provider, COUNT(*) AS total, COUNT(m.id) AS hits, AVG(m.position) AS position
     ${s.sql.replace('WHERE', 'LEFT JOIN mentions m ON m.response_id = r.id AND m.brand_id = ? WHERE')}
     GROUP BY r.provider ORDER BY r.provider`,
    own?.id ?? -1, ...s.params,
  ).map((r) => ({ provider: r.provider, responses: r.total, visibility: r.total ? round((100 * r.hits) / r.total) : null, position: round(r.position) }));
}

/** Per-prompt performance for the own brand plus who else shows up. */
export function promptMetrics(f) {
  const brands = brandsOf(f.projectId);
  const own = brands.find((b) => b.is_own);
  const s = scope({ ...f, promptId: null });
  const totals = all(`SELECT p.id, COUNT(*) AS n ${s.sql} GROUP BY p.id`, ...s.params);
  const ment = all(
    `SELECT r.prompt_id, m.brand_id, COUNT(DISTINCT m.response_id) AS n, AVG(m.position) AS position, AVG(m.sentiment) AS sentiment
     FROM mentions m JOIN responses r ON r.id = m.response_id
     WHERE m.response_id IN (SELECT r.id ${s.sql}) GROUP BY r.prompt_id, m.brand_id`,
    ...s.params,
  );
  const totalBy = new Map(totals.map((t) => [t.id, t.n]));
  const prompts = all('SELECT * FROM prompts WHERE project_id = ? ORDER BY id', f.projectId)
    .filter((p) => !f.tags.length || JSON.parse(p.tags || '[]').some((t) => f.tags.includes(t)));
  return prompts.map((p) => {
    const n = totalBy.get(p.id) || 0;
    const rows = ment.filter((m) => m.prompt_id === p.id);
    const o = own && rows.find((m) => m.brand_id === own.id);
    const top = rows
      .sort((a, b) => b.n - a.n)
      .slice(0, 4)
      .map((m) => ({ brandId: m.brand_id, name: brands.find((b) => b.id === m.brand_id)?.name, visibility: round((100 * m.n) / (n || 1)) }));
    return {
      id: p.id,
      text: p.text,
      tags: JSON.parse(p.tags || '[]'),
      country: p.country,
      active: !!p.active,
      responses: n,
      visibility: n ? round((100 * (o?.n || 0)) / n) : null,
      position: round(o?.position),
      sentiment: round(o?.sentiment, 0),
      topBrands: top,
    };
  });
}

/** Cited domains and URLs: how often each source is used and what kind of source it is. */
export function sourceMetrics(f, { limit = 50 } = {}) {
  const brands = brandsOf(f.projectId);
  const own = brands.find((b) => b.is_own);
  const s = scope(f);
  const [{ total }] = all(`SELECT COUNT(*) AS total ${s.sql}`, ...s.params);
  const domains = all(
    `SELECT c.domain, COUNT(DISTINCT c.response_id) AS responses, COUNT(*) AS citations, AVG(c.rank) AS rank,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM mentions m WHERE m.response_id = c.response_id AND m.brand_id = ?) THEN 1 ELSE 0 END) AS withOwn
     FROM citations c WHERE c.response_id IN (SELECT r.id ${s.sql})
     GROUP BY c.domain ORDER BY responses DESC LIMIT ?`,
    own?.id ?? -1, ...s.params, limit,
  ).map((d) => ({
    domain: d.domain,
    type: classifySource(d.domain, brands),
    usage: total ? round((100 * d.responses) / total) : 0,
    citations: d.citations,
    avgRank: round(d.rank),
    ownMentionRate: d.citations ? round((100 * d.withOwn) / d.citations) : 0,
  }));
  const urls = all(
    `SELECT c.url, c.domain, MAX(c.title) AS title, COUNT(DISTINCT c.response_id) AS responses
     FROM citations c WHERE c.response_id IN (SELECT r.id ${s.sql})
     GROUP BY c.url ORDER BY responses DESC LIMIT ?`,
    ...s.params, limit,
  ).map((u) => ({ ...u, type: classifySource(u.domain, brands), usage: total ? round((100 * u.responses) / total) : 0 }));
  const byType = {};
  for (const d of all(`SELECT c.domain, COUNT(*) AS n FROM citations c WHERE c.response_id IN (SELECT r.id ${s.sql}) GROUP BY c.domain`, ...s.params)) {
    const t = classifySource(d.domain, brands);
    byType[t] = (byType[t] || 0) + d.n;
  }
  return { totalResponses: total, domains, urls, byType };
}

/** Raw answers, newest first, with the brands they mention and their sources. */
export function listResponses(f, { limit = 50, offset = 0, brandId = null } = {}) {
  const s = scope(f);
  const extra = brandId ? ' AND EXISTS (SELECT 1 FROM mentions m WHERE m.response_id = r.id AND m.brand_id = ?)' : '';
  const params = brandId ? [...s.params, Number(brandId)] : s.params;
  const rows = all(
    `SELECT r.id, r.provider, r.model, r.text, r.day, r.created_at, p.id AS prompt_id, p.text AS prompt
     ${s.sql}${extra} ORDER BY r.day DESC, r.id DESC LIMIT ? OFFSET ?`,
    ...params, limit, offset,
  );
  const [{ n }] = all(`SELECT COUNT(*) AS n ${s.sql}${extra}`, ...params);
  if (!rows.length) return { total: n, items: [] };
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => '?').join(',');
  const mentions = all(`SELECT * FROM mentions WHERE response_id IN (${ph}) ORDER BY position`, ...ids);
  const cites = all(`SELECT * FROM citations WHERE response_id IN (${ph}) ORDER BY rank`, ...ids);
  return {
    total: n,
    items: rows.map((r) => ({
      ...r,
      mentions: mentions.filter((m) => m.response_id === r.id),
      citations: cites.filter((c) => c.response_id === r.id),
    })),
  };
}

/** Flat CSV of every analysed answer × brand, for spreadsheets / BI tools. */
export function exportCsv(f) {
  const s = scope(f);
  const rows = all(
    `SELECT r.day, r.provider, r.model, p.text AS prompt, b.name AS brand, m.position, m.count, m.sentiment,
            (SELECT group_concat(c.domain, ' ') FROM citations c WHERE c.response_id = r.id) AS sources
     ${s.sql.replace('FROM responses r', 'FROM responses r LEFT JOIN mentions m ON m.response_id = r.id LEFT JOIN brands b ON b.id = m.brand_id')}
     ORDER BY r.day, r.id, m.position`,
    ...s.params,
  );
  const cols = ['day', 'provider', 'model', 'prompt', 'brand', 'position', 'count', 'sentiment', 'sources'];
  const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
