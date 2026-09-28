import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb, getSetting, setSetting, logActivity, uniqueSlug } from './db.js';
import * as auth from './auth.js';
import * as google from './google.js';
import { aiEnabled, draftReply, draftPost } from './ai.js';
import { smsConfigured, emailConfigured } from './messaging.js';
import { syncLocation, syncAll, publishReply, publishDuePosts, processNewReviews, createReviewRequest, startScheduler } from './jobs.js';
import { buildReport } from './reports.js';
import { renderLanding, renderThanks } from './landing.js';

const here = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(file = path.join(here, '..', '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

// Wrap async handlers so errors become JSON 400/500s.
const h = (fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (e) {
    if (!res.headersSent) res.status(e.status || 400).json({ error: e.message });
  }
};

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

function updateRow(db, table, id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  db.prepare(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), id);
}

const CLIENT_FIELDS = ['name', 'brand_voice', 'signature', 'logo_url', 'alert_email', 'alert_threshold', 'auto_reply_positive'];
const LOCATION_FIELDS = ['client_id', 'name', 'address', 'phone', 'website', 'gbp_name', 'place_id', 'review_url'];
const TEMPLATE_FIELDS = ['kind', 'name', 'body', 'min_rating', 'max_rating'];

export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));

  // ---------- Public: review request landing pages ----------
  const landingFor = (req, res, loc, request) => {
    res.type('html').send(renderLanding({ location: loc, client: db.prepare('SELECT * FROM clients WHERE id = ?').get(loc.client_id), token: request?.token || '', slug: loc.slug, googleLink: google.reviewLink(loc) }));
  };
  app.get('/r/:token', (req, res) => {
    const rq = db.prepare('SELECT * FROM review_requests WHERE token = ?').get(req.params.token);
    if (!rq) return res.status(404).send('Link not found');
    landingFor(req, res, db.prepare('SELECT * FROM locations WHERE id = ?').get(rq.location_id), rq);
  });
  app.get('/l/:slug', (req, res) => {
    const loc = db.prepare('SELECT * FROM locations WHERE slug = ?').get(req.params.slug);
    if (!loc) return res.status(404).send('Location not found');
    landingFor(req, res, loc, null);
  });
  app.get('/go/:slug', (req, res) => {
    const loc = db.prepare('SELECT * FROM locations WHERE slug = ?').get(req.params.slug);
    if (!loc) return res.status(404).send('Location not found');
    if (req.query.t) {
      db.prepare("UPDATE review_requests SET status = 'clicked', clicked_at = datetime('now') WHERE token = ? AND location_id = ? AND status != 'clicked'").run(String(req.query.t), loc.id);
    }
    const link = google.reviewLink(loc);
    if (!link) return res.status(404).send('This location has no review link configured yet.');
    res.redirect(302, link);
  });
  app.post('/feedback/:slug', (req, res) => {
    const loc = db.prepare('SELECT * FROM locations WHERE slug = ?').get(req.params.slug);
    if (!loc) return res.status(404).send('Location not found');
    const message = String(req.body.message || '').trim().slice(0, 5000);
    if (!message) return res.redirect(303, `/l/${loc.slug}`);
    const rq = req.body.t ? db.prepare('SELECT id FROM review_requests WHERE token = ?').get(String(req.body.t)) : null;
    db.prepare('INSERT INTO feedback (location_id, request_id, name, contact, message) VALUES (?, ?, ?, ?, ?)')
      .run(loc.id, rq?.id ?? null, String(req.body.name || '').slice(0, 200), String(req.body.contact || '').slice(0, 200), message);
    logActivity(db, 'feedback', `Private feedback received for ${loc.name}`);
    res.type('html').send(renderThanks(loc));
  });

  // ---------- Auth ----------
  app.post('/api/login', (req, res) => {
    if (!auth.checkPassword(req.body.password || '')) return res.status(401).json({ error: 'Incorrect password' });
    auth.issue(res);
    res.json({ ok: true });
  });
  app.post('/api/logout', (req, res) => { auth.clear(res); res.json({ ok: true }); });

  // Google OAuth callback must be reachable while signed in (browser redirect).
  app.get('/api/google/callback', auth.requireAuth, h(async (req, res) => {
    const expected = getSetting(db, 'google_oauth_state');
    if (!req.query.code || !expected || req.query.state !== expected) throw httpError(400, 'Invalid OAuth state');
    await google.exchangeCode(db, String(req.query.code));
    setSetting(db, 'google_oauth_state', null);
    logActivity(db, 'google', 'Connected Google Business Profile');
    res.redirect('/#/settings?google=connected');
  }));

  const api = express.Router();
  api.use(auth.requireAuth);

  api.get('/status', h(() => ({
    google: { configured: google.isConfigured(), connected: google.isConnected(db) },
    ai: aiEnabled(),
    sms: smsConfigured(),
    email: emailConfigured(),
    slack: Boolean(process.env.SLACK_WEBHOOK_URL),
    demo: Boolean(getSetting(db, 'demo_mode')),
    public_url: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),
    agency_name: process.env.AGENCY_NAME || 'LocalDesk',
  })));

  // ----- Google -----
  api.get('/google/connect', (req, res) => {
    if (!google.isConfigured()) return res.status(400).json({ error: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first' });
    const state = crypto.randomBytes(16).toString('hex');
    setSetting(db, 'google_oauth_state', state);
    res.redirect(google.authUrl(state));
  });
  api.post('/settings/demo', h((req) => { setSetting(db, 'demo_mode', Boolean(req.body.enabled)); return { demo: Boolean(req.body.enabled) }; }));
  api.post('/google/disconnect', h(() => { setSetting(db, 'google_tokens', null); return { ok: true }; }));
  api.get('/google/locations', h(async () => {
    const linked = new Set(db.prepare("SELECT gbp_name FROM locations WHERE gbp_name != ''").all().map((r) => r.gbp_name));
    return (await google.listAllLocations(db)).map((l) => ({ ...l, linked: linked.has(l.gbp_name) }));
  }));
  api.post('/google/import', h(async (req) => {
    const { client_id, items } = req.body;
    if (!db.prepare('SELECT 1 FROM clients WHERE id = ?').get(client_id)) throw httpError(400, 'Choose a client');
    const ins = db.prepare('INSERT INTO locations (client_id, name, slug, address, phone, website, gbp_name, place_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    let n = 0;
    for (const l of items || []) {
      if (db.prepare('SELECT 1 FROM locations WHERE gbp_name = ?').get(l.gbp_name)) continue;
      ins.run(client_id, l.name, uniqueSlug(db, l.name), l.address || '', l.phone || '', l.website || '', l.gbp_name, l.place_id || '');
      n++;
    }
    logActivity(db, 'google', `Imported ${n} location(s) from Google`);
    return { imported: n };
  }));
  api.post('/sync', h(async (req) => {
    if (req.body.location_id) {
      const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.body.location_id);
      if (!loc) throw httpError(404, 'Location not found');
      const out = await syncLocation(db, loc);
      await processNewReviews(db);
      return out;
    }
    await syncAll(db);
    await processNewReviews(db);
    return { ok: true };
  }));

  // ----- Clients -----
  api.get('/clients', h(() => db.prepare(`SELECT c.*,
      (SELECT COUNT(*) FROM locations l WHERE l.client_id = c.id) AS location_count,
      (SELECT ROUND(AVG(r.rating), 2) FROM reviews r JOIN locations l ON l.id = r.location_id WHERE l.client_id = c.id) AS avg_rating,
      (SELECT COUNT(*) FROM reviews r JOIN locations l ON l.id = r.location_id WHERE l.client_id = c.id) AS review_count,
      (SELECT COUNT(*) FROM reviews r JOIN locations l ON l.id = r.location_id WHERE l.client_id = c.id AND r.status IN ('new','drafted')) AS open_count
    FROM clients c ORDER BY c.name`).all()));
  api.post('/clients', h((req) => {
    const f = pick(req.body, CLIENT_FIELDS);
    if (!f.name?.trim()) throw httpError(400, 'Name is required');
    const { lastInsertRowid } = db.prepare('INSERT INTO clients (name) VALUES (?)').run(f.name.trim());
    updateRow(db, 'clients', lastInsertRowid, f);
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(lastInsertRowid);
  }));
  api.put('/clients/:id', h((req) => {
    updateRow(db, 'clients', req.params.id, pick(req.body, CLIENT_FIELDS));
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  }));
  api.delete('/clients/:id', h((req) => { db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id); return { ok: true }; }));

  // ----- Locations -----
  api.get('/locations', (req, res) => {
    const args = [];
    let where = '';
    if (req.query.client_id) { where = 'WHERE l.client_id = ?'; args.push(req.query.client_id); }
    res.json(db.prepare(`SELECT l.*, c.name AS client_name,
        (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE location_id = l.id) AS avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE location_id = l.id) AS review_count,
        (SELECT COUNT(*) FROM reviews WHERE location_id = l.id AND status IN ('new','drafted')) AS open_count
      FROM locations l JOIN clients c ON c.id = l.client_id ${where} ORDER BY c.name, l.name`).all(...args));
  });
  api.post('/locations', h((req) => {
    const f = pick(req.body, LOCATION_FIELDS);
    if (!f.name?.trim() || !f.client_id) throw httpError(400, 'Name and client are required');
    const { lastInsertRowid } = db.prepare('INSERT INTO locations (client_id, name, slug) VALUES (?, ?, ?)').run(f.client_id, f.name.trim(), uniqueSlug(db, f.name));
    updateRow(db, 'locations', lastInsertRowid, f);
    return db.prepare('SELECT * FROM locations WHERE id = ?').get(lastInsertRowid);
  }));
  api.put('/locations/:id', h((req) => {
    updateRow(db, 'locations', req.params.id, pick(req.body, LOCATION_FIELDS));
    return db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  }));
  api.delete('/locations/:id', h((req) => { db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id); return { ok: true }; }));

  // ----- Reviews -----
  api.get('/reviews', (req, res) => {
    const where = ['1=1'];
    const args = [];
    const q = req.query;
    if (q.client_id) { where.push('l.client_id = ?'); args.push(q.client_id); }
    if (q.location_id) { where.push('r.location_id = ?'); args.push(q.location_id); }
    if (q.rating) { where.push(`r.rating IN (${String(q.rating).split(',').map(() => '?').join(',')})`); args.push(...String(q.rating).split(',').map(Number)); }
    if (q.status === 'open') where.push("r.status IN ('new','drafted')");
    else if (q.status) { where.push('r.status = ?'); args.push(q.status); }
    if (q.source) { where.push('r.source = ?'); args.push(q.source); }
    if (q.q) { where.push('(r.body LIKE ? OR r.author LIKE ?)'); args.push(`%${q.q}%`, `%${q.q}%`); }
    const limit = Math.min(Number(q.limit) || 50, 200);
    const offset = Math.max(Number(q.offset) || 0, 0);
    const base = `FROM reviews r JOIN locations l ON l.id = r.location_id JOIN clients c ON c.id = l.client_id WHERE ${where.join(' AND ')}`;
    const { total } = db.prepare(`SELECT COUNT(*) AS total ${base}`).get(...args);
    const rows = db.prepare(`SELECT r.*, l.name AS location_name, c.name AS client_name, c.id AS client_id ${base} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
    res.json({ total, rows });
  });
  api.post('/reviews', h((req) => {
    // Manually log a review from a source we don't sync (Facebook, Yelp, etc.).
    const { location_id, source, author, rating, body, created_at } = req.body;
    const r = Number(rating);
    if (!location_id || !(r >= 1 && r <= 5)) throw httpError(400, 'Location and a 1–5 rating are required');
    const { lastInsertRowid } = db.prepare(`INSERT INTO reviews (location_id, source, external_id, author, rating, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(location_id, source || 'other', `manual-${crypto.randomUUID()}`, author || '', r, body || '', created_at ? new Date(created_at).toISOString() : new Date().toISOString());
    return db.prepare('SELECT * FROM reviews WHERE id = ?').get(lastInsertRowid);
  }));
  api.post('/reviews/:id/draft', h(async (req) => {
    const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!r) throw httpError(404, 'Review not found');
    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(r.location_id);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(location.client_id);
    const draft = await draftReply({ review: r, location, client, templates: db.prepare('SELECT * FROM templates').all() });
    db.prepare("UPDATE reviews SET draft_reply = ?, status = CASE WHEN status = 'new' THEN 'drafted' ELSE status END WHERE id = ?").run(draft, r.id);
    return { draft, ai: aiEnabled() };
  }));
  api.post('/reviews/:id/reply', h(async (req) => {
    const body = String(req.body.body || '').trim();
    if (!body) throw httpError(400, 'Reply cannot be empty');
    await publishReply(db, Number(req.params.id), body);
    return db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  }));
  api.post('/reviews/:id/status', h((req) => {
    if (!['new', 'drafted', 'ignored'].includes(req.body.status)) throw httpError(400, 'Invalid status');
    db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    return { ok: true };
  }));

  // ----- Posts -----
  api.get('/posts', (req, res) => {
    const posts = db.prepare(`SELECT p.*, c.name AS client_name FROM posts p LEFT JOIN clients c ON c.id = p.client_id ORDER BY p.scheduled_at DESC LIMIT 200`).all();
    const targets = db.prepare('SELECT t.*, l.name AS location_name FROM post_targets t JOIN locations l ON l.id = t.location_id WHERE t.post_id = ?');
    res.json(posts.map((p) => ({ ...p, targets: targets.all(p.id) })));
  });
  api.post('/posts', h(async (req) => {
    const { client_id, location_ids, body, topic_type, cta_type, cta_url, image_url, scheduled_at } = req.body;
    if (!body?.trim()) throw httpError(400, 'Post text is required');
    if (!location_ids?.length) throw httpError(400, 'Choose at least one location');
    if (body.length > 1500) throw httpError(400, 'Google posts are limited to 1500 characters');
    if (cta_type && cta_type !== 'CALL' && !cta_url) throw httpError(400, 'Button URL is required');
    const when = scheduled_at ? new Date(scheduled_at) : new Date();
    if (Number.isNaN(when.getTime())) throw httpError(400, 'Invalid schedule time');
    const { lastInsertRowid } = db.prepare(`INSERT INTO posts (client_id, body, topic_type, cta_type, cta_url, image_url, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(client_id || null, body.trim(), topic_type || 'STANDARD', cta_type || '', cta_url || '', image_url || '', when.toISOString());
    const ins = db.prepare('INSERT INTO post_targets (post_id, location_id) VALUES (?, ?)');
    for (const id of location_ids) ins.run(lastInsertRowid, id);
    if (when <= new Date()) await publishDuePosts(db);
    return db.prepare('SELECT * FROM posts WHERE id = ?').get(lastInsertRowid);
  }));
  api.delete('/posts/:id', h((req) => { db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id); return { ok: true }; }));
  api.post('/posts/generate', h(async (req) => {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.body.client_id);
    const ids = req.body.location_ids || [];
    const names = ids.length ? db.prepare(`SELECT name FROM locations WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids).map((r) => r.name) : [];
    return { body: await draftPost({ topic: String(req.body.topic || 'A general update'), client, locationNames: names }) };
  }));

  // ----- Review requests & feedback -----
  api.get('/requests', h(() => db.prepare(`SELECT rq.*, l.name AS location_name FROM review_requests rq JOIN locations l ON l.id = rq.location_id ORDER BY rq.id DESC LIMIT 300`).all()));
  api.post('/requests', h((req) => createReviewRequest(db, req.body)));
  api.post('/requests/bulk', h(async (req) => {
    // CSV lines: name,phone,email
    const { location_id, channel, csv } = req.body;
    const results = [];
    for (const line of String(csv || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
      const [customer_name, phone, email] = line.split(',').map((s) => s?.trim());
      if (/^name$/i.test(customer_name)) continue;
      try { results.push(await createReviewRequest(db, { location_id, channel, customer_name, phone, email })); }
      catch (e) { results.push({ customer_name, status: 'failed', error: e.message }); }
    }
    return { sent: results.filter((r) => r.status === 'sent').length, failed: results.filter((r) => r.status === 'failed').length, results };
  }));
  api.get('/feedback', h(() => db.prepare('SELECT f.*, l.name AS location_name FROM feedback f JOIN locations l ON l.id = f.location_id ORDER BY f.id DESC LIMIT 300').all()));

  // ----- Templates -----
  api.get('/templates', h(() => db.prepare('SELECT * FROM templates ORDER BY kind, min_rating DESC, id').all()));
  api.post('/templates', h((req) => {
    const f = pick(req.body, TEMPLATE_FIELDS);
    if (!f.kind || !f.name || !f.body) throw httpError(400, 'Kind, name and body are required');
    const { lastInsertRowid } = db.prepare('INSERT INTO templates (kind, name, body) VALUES (?, ?, ?)').run(f.kind, f.name, f.body);
    updateRow(db, 'templates', lastInsertRowid, f);
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(lastInsertRowid);
  }));
  api.put('/templates/:id', h((req) => { updateRow(db, 'templates', req.params.id, pick(req.body, TEMPLATE_FIELDS)); return { ok: true }; }));
  api.delete('/templates/:id', h((req) => { db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id); return { ok: true }; }));

  // ----- Reports & dashboard -----
  api.get('/reports', (req, res) => {
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const from = req.query.from || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const report = buildReport(db, { clientId: req.query.client_id, locationId: req.query.location_id, from, to });
    report.client = req.query.client_id ? db.prepare('SELECT * FROM clients WHERE id = ?').get(req.query.client_id) : null;
    res.json(report);
  });
  api.get('/dashboard', h(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const report = buildReport(db, { from, to });
    const attention = db.prepare(`SELECT r.*, l.name AS location_name, c.name AS client_name FROM reviews r
      JOIN locations l ON l.id = r.location_id JOIN clients c ON c.id = l.client_id
      WHERE r.status IN ('new','drafted') ORDER BY r.rating ASC, r.created_at DESC LIMIT 8`).all();
    const activity = db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 15').all();
    const upcoming = db.prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'scheduled'").get().n;
    return { report, attention, activity, upcoming_posts: upcoming, counts: db.prepare('SELECT (SELECT COUNT(*) FROM clients) AS clients, (SELECT COUNT(*) FROM locations) AS locations').get() };
  }));

  app.use('/api', api);
  app.use(express.static(path.join(here, '..', 'public')));
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadEnv();
  const db = openDb();
  const app = createApp(db);
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`LocalDesk running on http://localhost:${port}`);
    if (!process.env.ADMIN_PASSWORD) console.log('⚠️  ADMIN_PASSWORD is not set — the dashboard is open to anyone who can reach this port.');
  });
  startScheduler(db);
}
