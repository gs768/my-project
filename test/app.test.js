import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, fillTemplate, setSetting } from '../server/db.js';
import { createApp } from '../server/index.js';
import { mapReview, flattenMetrics, reviewLink } from '../server/google.js';
import { summarize } from '../server/reports.js';
import { upsertReviews } from '../server/jobs.js';
import { templateReply, firstName } from '../server/ai.js';
import { seed } from '../server/seed.js';

delete process.env.ANTHROPIC_API_KEY;
delete process.env.ADMIN_PASSWORD;

let db, server, base;
before(async () => {
  db = openDb(':memory:');
  seed(db);
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const get = (p) => fetch(base + p, { redirect: 'manual' });
const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), redirect: 'manual' });

test('mapReview converts Google v4 review shape', () => {
  const r = mapReview({
    reviewId: 'abc', starRating: 'FOUR', comment: 'Nice', createTime: '2025-01-02T03:04:05Z',
    reviewer: { displayName: 'Jane Doe', profilePhotoUrl: 'p.png' },
    reviewReply: { comment: 'Thanks', updateTime: '2025-01-03T00:00:00Z' },
  });
  assert.deepEqual(r, { external_id: 'abc', author: 'Jane Doe', author_photo: 'p.png', rating: 4, body: 'Nice', created_at: '2025-01-02T03:04:05Z', reply_body: 'Thanks', replied_at: '2025-01-03T00:00:00Z' });
  assert.equal(mapReview({ reviewId: 'x', starRating: 'ONE', reviewer: { isAnonymous: true } }).author, 'Anonymous');
});

test('flattenMetrics flattens performance API response', () => {
  const rows = flattenMetrics({ multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [{ dailyMetric: 'CALL_CLICKS', timeSeries: { datedValues: [{ date: { year: 2025, month: 3, day: 7 }, value: '4' }, { date: { year: 2025, month: 3, day: 8 } }] } }] }] });
  assert.deepEqual(rows, [{ date: '2025-03-07', metric: 'CALL_CLICKS', value: 4 }, { date: '2025-03-08', metric: 'CALL_CLICKS', value: 0 }]);
});

test('reviewLink prefers override, then place id', () => {
  assert.equal(reviewLink({ review_url: 'https://x', place_id: 'P' }), 'https://x');
  assert.equal(reviewLink({ place_id: 'ChIJ1' }), 'https://search.google.com/local/writereview?placeid=ChIJ1');
  assert.equal(reviewLink({}), '');
});

test('summarize computes rating, response rate and response time', () => {
  const s = summarize([
    { rating: 5, created_at: '2025-01-01T00:00:00Z', reply_body: 'x', replied_at: '2025-01-01T10:00:00Z' },
    { rating: 1, created_at: '2025-01-01T00:00:00Z', reply_body: null },
  ]);
  assert.equal(s.avg_rating, 3);
  assert.equal(s.response_rate, 50);
  assert.equal(s.avg_response_hours, 10);
  assert.deepEqual(s.distribution, [1, 0, 0, 0, 1]);
  assert.equal(s.negative, 1);
});

test('templates fill placeholders and pick by rating', () => {
  assert.equal(fillTemplate('Hi {first_name} {unknown}', { first_name: 'Al' }), 'Hi Al {unknown}');
  assert.equal(firstName('Anonymous'), 'there');
  const templates = db.prepare('SELECT * FROM templates').all();
  assert.match(templateReply(templates, { rating: 1, author: 'Bob Smith' }, { name: 'Shop', phone: '555' }), /Hi Bob.*Shop.*555/);
  assert.match(templateReply(templates, { rating: 5, author: 'Amy' }, { name: 'Shop' }), /Thank you so much, Amy/);
});

test('upsertReviews inserts new and updates reply state', () => {
  const loc = db.prepare('SELECT id FROM locations LIMIT 1').get();
  const r = { external_id: 'g-1', author: 'A', author_photo: '', rating: 2, body: 'meh', created_at: '2025-01-01T00:00:00Z', reply_body: null, replied_at: null };
  assert.equal(upsertReviews(db, loc.id, [r]), 1);
  assert.equal(upsertReviews(db, loc.id, [{ ...r, reply_body: 'sorry', replied_at: '2025-01-02T00:00:00Z' }]), 0);
  assert.equal(db.prepare("SELECT status FROM reviews WHERE external_id = 'g-1'").get().status, 'replied');
});

test('API: dashboard, clients and reports respond', async () => {
  const d = await (await get('/api/dashboard')).json();
  assert.equal(d.counts.clients, 3);
  assert.ok(d.report.lifetime.count > 50);
  const clients = await (await get('/api/clients')).json();
  assert.equal(clients.length, 3);
  const rep = await (await get(`/api/reports?client_id=${clients[0].id}&from=2000-01-01&to=2100-01-01`)).json();
  assert.ok(rep.locations.length >= 1);
  assert.ok(rep.metrics.impressions > 0);
});

test('API: draft (template fallback) and reply to a review', async () => {
  const { rows } = await (await get('/api/reviews?status=open&limit=1')).json();
  const id = rows[0].id;
  const { draft } = await (await post(`/api/reviews/${id}/draft`, {})).json();
  assert.ok(draft.length > 10);
  const res = await post(`/api/reviews/${id}/reply`, { body: draft });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'replied');
});

test('API: post to multiple locations publishes in demo mode', async () => {
  const locs = await (await get('/api/locations')).json();
  const res = await post('/api/posts', { client_id: locs[0].client_id, location_ids: [locs[0].id, locs[1].id], body: 'Hello world', cta_type: 'CALL' });
  assert.equal(res.status, 200);
  const posts = await (await get('/api/posts')).json();
  assert.equal(posts[0].status, 'published');
  assert.equal(posts[0].targets.length, 2);
});

test('API: scheduled post in the future stays scheduled', async () => {
  const locs = await (await get('/api/locations')).json();
  await post('/api/posts', { location_ids: [locs[0].id], body: 'Later', scheduled_at: new Date(Date.now() + 864e5).toISOString() });
  const posts = await (await get('/api/posts')).json();
  assert.equal(posts.find((p) => p.body === 'Later').status, 'scheduled');
});

test('API: posts validate input', async () => {
  assert.equal((await post('/api/posts', { location_ids: [], body: 'x' })).status, 400);
  assert.equal((await post('/api/posts', { location_ids: [1], body: 'x', cta_type: 'BOOK' })).status, 400);
});

test('Review request flow: send, landing page, click-through, private feedback', async () => {
  const loc = db.prepare('SELECT * FROM locations LIMIT 1').get();
  const rq = await (await post('/api/requests', { location_id: loc.id, channel: 'sms', customer_name: 'Pat Lee', phone: '+15555550100' })).json();
  assert.equal(rq.status, 'sent');

  const landing = await get(`/r/${rq.token}`);
  const html = await landing.text();
  assert.match(html, /Leave a review on Google/);
  assert.match(html, new RegExp(`/go/${loc.slug}\\?t=${rq.token}`));

  const go = await get(`/go/${loc.slug}?t=${rq.token}`);
  assert.equal(go.status, 302);
  assert.match(go.headers.get('location'), /search\.google\.com\/local\/writereview\?placeid=/);
  assert.equal(db.prepare('SELECT status FROM review_requests WHERE id = ?').get(rq.id).status, 'clicked');

  const fb = await fetch(`${base}/feedback/${loc.slug}`, { method: 'POST', body: new URLSearchParams({ t: rq.token, message: 'Parking was hard', name: 'Pat' }) });
  assert.equal(fb.status, 200);
  const list = await (await get('/api/feedback')).json();
  assert.equal(list[0].message, 'Parking was hard');
});

test('Landing page escapes location names', async () => {
  const loc = db.prepare('SELECT * FROM locations LIMIT 1').get();
  db.prepare('UPDATE locations SET name = ? WHERE id = ?').run('<script>x</script>', loc.id);
  const html = await (await get(`/l/${loc.slug}`)).text();
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('Auth: API requires login when ADMIN_PASSWORD is set', async () => {
  process.env.ADMIN_PASSWORD = 'secret-pw';
  try {
    assert.equal((await get('/api/status')).status, 401);
    assert.equal((await post('/api/login', { password: 'wrong' })).status, 401);
    const ok = await post('/api/login', { password: 'secret-pw' });
    assert.equal(ok.status, 200);
    const cookie = ok.headers.get('set-cookie').split(';')[0];
    const s = await fetch(`${base}/api/status`, { headers: { cookie } });
    assert.equal(s.status, 200);
    const tampered = await fetch(`${base}/api/status`, { headers: { cookie: cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) } });
    assert.equal(tampered.status, 401);
  } finally {
    delete process.env.ADMIN_PASSWORD;
  }
});

test('Live mode refuses to post to unlinked locations', async () => {
  setSetting(db, 'demo_mode', false);
  try {
    const loc = db.prepare("SELECT * FROM locations WHERE gbp_name = '' LIMIT 1").get();
    await post('/api/posts', { location_ids: [loc.id], body: 'Live' });
    const p = (await (await get('/api/posts')).json()).find((x) => x.body === 'Live');
    assert.equal(p.status, 'failed');
    assert.match(p.targets[0].error, /not linked/);
  } finally {
    setSetting(db, 'demo_mode', true);
  }
});
