// Reputation & performance reporting.

const IMPRESSION_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
];

function round(n, d = 2) {
  return n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** d) / 10 ** d;
}

export function summarize(reviews) {
  const count = reviews.length;
  const dist = [0, 0, 0, 0, 0];
  let sum = 0, replied = 0, replyHours = 0, timed = 0;
  for (const r of reviews) {
    dist[r.rating - 1]++;
    sum += r.rating;
    if (r.reply_body) {
      replied++;
      const h = (Date.parse(r.replied_at) - Date.parse(r.created_at)) / 36e5;
      if (Number.isFinite(h) && h >= 0) { replyHours += h; timed++; }
    }
  }
  return {
    count,
    avg_rating: count ? round(sum / count) : null,
    distribution: dist,
    response_rate: count ? round((replied / count) * 100, 1) : null,
    avg_response_hours: timed ? round(replyHours / timed, 1) : null,
    unanswered: count - replied,
    negative: dist[0] + dist[1],
  };
}

// scope: { clientId?, locationId?, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
export function buildReport(db, { clientId, locationId, from, to }) {
  const where = ['1=1'];
  const args = [];
  if (clientId) { where.push('l.client_id = ?'); args.push(clientId); }
  if (locationId) { where.push('l.id = ?'); args.push(locationId); }
  const locations = db.prepare(`SELECT l.*, c.name AS client_name FROM locations l JOIN clients c ON c.id = l.client_id WHERE ${where.join(' AND ')} ORDER BY l.name`).all(...args);
  const ids = locations.map((l) => l.id);
  if (!ids.length) return { from, to, locations: [], period: summarize([]), lifetime: summarize([]), monthly: [], metrics: {}, requests: {} };
  const inIds = `(${ids.map(() => '?').join(',')})`;
  const toEnd = `${to}T23:59:59Z`;

  const all = db.prepare(`SELECT * FROM reviews WHERE location_id IN ${inIds}`).all(...ids);
  const inPeriod = all.filter((r) => r.created_at >= from && r.created_at <= toEnd);

  const perLocation = locations.map((l) => ({
    id: l.id, name: l.name, client_name: l.client_name,
    lifetime: summarize(all.filter((r) => r.location_id === l.id)),
    period: summarize(inPeriod.filter((r) => r.location_id === l.id)),
  }));

  // Monthly trend over the period (review count and avg rating per month).
  const byMonth = new Map();
  for (const r of inPeriod) {
    const m = r.created_at.slice(0, 7);
    const e = byMonth.get(m) || { month: m, count: 0, sum: 0 };
    e.count++; e.sum += r.rating;
    byMonth.set(m, e);
  }
  const monthly = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
    .map((e) => ({ month: e.month, count: e.count, avg_rating: round(e.sum / e.count) }));

  const metricRows = db.prepare(`SELECT metric, SUM(value) AS total FROM metrics_daily
    WHERE location_id IN ${inIds} AND date BETWEEN ? AND ? GROUP BY metric`).all(...ids, from, to);
  const m = Object.fromEntries(metricRows.map((r) => [r.metric, Number(r.total)]));
  const metrics = metricRows.length ? {
    impressions: IMPRESSION_METRICS.reduce((s, k) => s + (m[k] || 0), 0),
    calls: m.CALL_CLICKS || 0,
    website_clicks: m.WEBSITE_CLICKS || 0,
    directions: m.BUSINESS_DIRECTION_REQUESTS || 0,
  } : {};

  const rr = db.prepare(`SELECT status, COUNT(*) AS n FROM review_requests
    WHERE location_id IN ${inIds} AND created_at BETWEEN ? AND ? GROUP BY status`).all(...ids, from, `${to} 23:59:59`);
  const reqBy = Object.fromEntries(rr.map((r) => [r.status, r.n]));
  const sent = (reqBy.sent || 0) + (reqBy.clicked || 0);
  const requests = { sent, clicked: reqBy.clicked || 0, failed: reqBy.failed || 0, click_rate: sent ? round(((reqBy.clicked || 0) / sent) * 100, 1) : null };

  return {
    from, to,
    locations: perLocation,
    period: summarize(inPeriod),
    lifetime: summarize(all),
    monthly,
    metrics,
    requests,
  };
}
