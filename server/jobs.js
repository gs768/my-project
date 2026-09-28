// Background work: review sync, scheduled posts, alerts, review requests.
import crypto from 'node:crypto';
import * as google from './google.js';
import { draftReply, firstName } from './ai.js';
import { sendSms, sendEmail, sendSlack } from './messaging.js';
import { getSetting, logActivity, fillTemplate } from './db.js';

const isDemo = (db) => Boolean(getSetting(db, 'demo_mode'));

export function upsertReviews(db, locationId, reviews) {
  const find = db.prepare("SELECT id, status, reply_body FROM reviews WHERE source = 'google' AND external_id = ?");
  const insert = db.prepare(`INSERT INTO reviews (location_id, source, external_id, author, author_photo, rating, body, created_at, reply_body, replied_at, status)
    VALUES (?, 'google', ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const update = db.prepare(`UPDATE reviews SET author = ?, author_photo = ?, rating = ?, body = ?, reply_body = ?, replied_at = ?,
    status = CASE WHEN ? IS NOT NULL THEN 'replied' WHEN status = 'replied' THEN 'new' ELSE status END WHERE id = ?`);
  let added = 0;
  for (const r of reviews) {
    const existing = find.get(r.external_id);
    if (existing) {
      update.run(r.author, r.author_photo, r.rating, r.body, r.reply_body, r.replied_at, r.reply_body, existing.id);
    } else {
      insert.run(locationId, r.external_id, r.author, r.author_photo, r.rating, r.body, r.created_at, r.reply_body, r.replied_at, r.reply_body ? 'replied' : 'new');
      added++;
    }
  }
  return added;
}

export async function syncLocation(db, location) {
  if (!location.gbp_name) return { added: 0, skipped: true };
  const reviews = await google.fetchReviews(db, location.gbp_name);
  const added = upsertReviews(db, location.id, reviews);
  // First import: don't fire alerts/auto-replies for historical reviews.
  if (!location.last_synced_at) db.prepare('UPDATE reviews SET alerted = 1 WHERE location_id = ?').run(location.id);

  // Last 35 days of performance metrics (Google lags a few days).
  const end = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const start = new Date(Date.now() - 37 * 864e5).toISOString().slice(0, 10);
  try {
    const rows = await google.fetchMetrics(db, location.gbp_name, start, end);
    const up = db.prepare('INSERT INTO metrics_daily (location_id, date, metric, value) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET value = excluded.value');
    for (const r of rows) up.run(location.id, r.date, r.metric, r.value);
  } catch (e) {
    logActivity(db, 'error', `Metrics sync failed for ${location.name}: ${e.message}`);
  }

  db.prepare("UPDATE locations SET last_synced_at = datetime('now') WHERE id = ?").run(location.id);
  if (added) logActivity(db, 'sync', `${added} new review(s) for ${location.name}`);
  return { added };
}

export async function syncAll(db) {
  if (!google.isConnected(db)) return;
  const locations = db.prepare("SELECT * FROM locations WHERE gbp_name != ''").all();
  for (const loc of locations) {
    try { await syncLocation(db, loc); } catch (e) { logActivity(db, 'error', `Sync failed for ${loc.name}: ${e.message}`); }
  }
}

// Post an owner reply to a review (to Google when linked).
export async function publishReply(db, reviewId, body) {
  const r = db.prepare('SELECT r.*, l.gbp_name, l.name AS location_name FROM reviews r JOIN locations l ON l.id = r.location_id WHERE r.id = ?').get(reviewId);
  if (!r) throw new Error('Review not found');
  if (r.source === 'google' && r.gbp_name && !isDemo(db)) await google.replyToReview(db, r.gbp_name, r.external_id, body);
  db.prepare("UPDATE reviews SET reply_body = ?, replied_at = ?, status = 'replied', draft_reply = NULL WHERE id = ?").run(body, new Date().toISOString(), reviewId);
  logActivity(db, 'reply', `Replied to ${r.author}'s ${r.rating}★ review at ${r.location_name}`);
}

// New negative reviews → alert email + Slack. Positive ones may auto-reply.
export async function processNewReviews(db) {
  const rows = db.prepare(`SELECT r.*, l.name AS location_name, l.address, l.phone, c.id AS cid, c.name AS client_name, c.alert_email, c.alert_threshold,
      c.auto_reply_positive, c.brand_voice, c.signature
    FROM reviews r JOIN locations l ON l.id = r.location_id JOIN clients c ON c.id = l.client_id
    WHERE r.alerted = 0`).all();
  const templates = db.prepare('SELECT * FROM templates').all();
  for (const r of rows) {
    db.prepare('UPDATE reviews SET alerted = 1 WHERE id = ?').run(r.id);
    if (r.status !== 'new') continue;
    if (r.rating <= r.alert_threshold) {
      const text = `⚠️ New ${r.rating}★ review for ${r.client_name} – ${r.location_name} from ${r.author}:\n"${r.body || '(no text)'}"`;
      await sendSlack(text).catch(() => {});
      if (r.alert_email) await sendEmail(r.alert_email, `New ${r.rating}-star review: ${r.location_name}`, text).catch(() => {});
      logActivity(db, 'alert', `Alert sent for ${r.rating}★ review at ${r.location_name}`);
    } else if (r.auto_reply_positive && r.rating >= 4) {
      try {
        const body = await draftReply({
          review: r,
          location: { name: r.location_name, address: r.address, phone: r.phone },
          client: { brand_voice: r.brand_voice, signature: r.signature },
          templates,
        });
        if (body) await publishReply(db, r.id, body);
      } catch (e) {
        logActivity(db, 'error', `Auto-reply failed for review ${r.id}: ${e.message}`);
      }
    }
  }
}

export async function publishDuePosts(db, now = new Date()) {
  const due = db.prepare("SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= ?").all(now.toISOString());
  for (const post of due) {
    const targets = db.prepare(`SELECT t.*, l.gbp_name, l.name FROM post_targets t JOIN locations l ON l.id = t.location_id
      WHERE t.post_id = ? AND t.status = 'pending'`).all(post.id);
    for (const t of targets) {
      try {
        let externalId = 'demo';
        if (!isDemo(db)) {
          if (!t.gbp_name) throw new Error('Location is not linked to Google Business Profile');
          externalId = (await google.createLocalPost(db, t.gbp_name, post)).name;
        }
        db.prepare("UPDATE post_targets SET status = 'published', external_id = ?, error = NULL WHERE id = ?").run(externalId, t.id);
      } catch (e) {
        db.prepare("UPDATE post_targets SET status = 'failed', error = ? WHERE id = ?").run(e.message, t.id);
      }
    }
    const counts = db.prepare('SELECT status, COUNT(*) AS n FROM post_targets WHERE post_id = ? GROUP BY status').all(post.id);
    const by = Object.fromEntries(counts.map((c) => [c.status, c.n]));
    const status = !by.failed ? 'published' : by.published ? 'partial' : 'failed';
    db.prepare('UPDATE posts SET status = ? WHERE id = ?').run(status, post.id);
    logActivity(db, 'post', `Post #${post.id} ${status} (${by.published || 0} published, ${by.failed || 0} failed)`);
  }
}

export function publicUrl() {
  return (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function createReviewRequest(db, { location_id, customer_name, phone, email, channel }) {
  const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(location_id);
  if (!loc) throw new Error('Location not found');
  if (channel === 'sms' && !phone) throw new Error('Phone number required for SMS');
  if (channel === 'email' && !email) throw new Error('Email required for email requests');
  const token = crypto.randomBytes(9).toString('base64url');
  const { lastInsertRowid } = db.prepare(`INSERT INTO review_requests (location_id, customer_name, phone, email, channel, token)
    VALUES (?, ?, ?, ?, ?, ?)`).run(location_id, customer_name || '', phone || '', email || '', channel, token);
  const id = Number(lastInsertRowid);

  const tpl = db.prepare('SELECT body FROM templates WHERE kind = ? ORDER BY id LIMIT 1').get(channel);
  const link = `${publicUrl()}/r/${token}`;
  const body = fillTemplate(tpl?.body || '{link}', { first_name: firstName(customer_name), location: loc.name, link });
  try {
    if (isDemo(db)) { /* simulated send */ }
    else if (channel === 'sms') await sendSms(phone, body);
    else await sendEmail(email, `How was your visit to ${loc.name}?`, body);
    db.prepare("UPDATE review_requests SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(id);
  } catch (e) {
    db.prepare("UPDATE review_requests SET status = 'failed', error = ? WHERE id = ?").run(e.message, id);
  }
  return db.prepare('SELECT * FROM review_requests WHERE id = ?').get(id);
}

export function startScheduler(db) {
  const minutes = Number(process.env.SYNC_INTERVAL_MINUTES || 30);
  let running = false;
  const tick = async (full) => {
    if (running) return;
    running = true;
    try {
      await publishDuePosts(db);
      if (full) await syncAll(db);
      await processNewReviews(db);
    } catch (e) {
      logActivity(db, 'error', `Scheduler: ${e.message}`);
    } finally {
      running = false;
    }
  };
  let n = 0;
  const every = Math.max(1, minutes);
  setInterval(() => tick(++n % every === 0), 60_000).unref();
  setTimeout(() => tick(true), 5_000).unref();
}
