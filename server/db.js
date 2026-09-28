import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand_voice TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  alert_email TEXT DEFAULT '',
  alert_threshold INTEGER DEFAULT 3,
  auto_reply_positive INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  gbp_name TEXT DEFAULT '',          -- accounts/{a}/locations/{l}
  place_id TEXT DEFAULT '',
  review_url TEXT DEFAULT '',         -- override for the review request link
  last_synced_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'google',
  external_id TEXT NOT NULL,
  author TEXT DEFAULT '',
  author_photo TEXT DEFAULT '',
  rating INTEGER NOT NULL,
  body TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  reply_body TEXT,
  replied_at TEXT,
  draft_reply TEXT,
  status TEXT NOT NULL DEFAULT 'new',  -- new | drafted | replied | ignored
  alerted INTEGER DEFAULT 0,
  UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_location ON reviews(location_id, created_at);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  topic_type TEXT DEFAULT 'STANDARD',
  cta_type TEXT DEFAULT '',
  cta_url TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | published | partial | failed
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | published | failed
  external_id TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS review_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  customer_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  channel TEXT NOT NULL,               -- sms | email
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed | clicked
  error TEXT,
  token TEXT UNIQUE NOT NULL,
  sent_at TEXT,
  clicked_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  request_id INTEGER REFERENCES review_requests(id) ON DELETE SET NULL,
  name TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS metrics_daily (
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (location_id, date, metric)
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,                  -- reply | sms | email
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  min_rating INTEGER DEFAULT 1,
  max_rating INTEGER DEFAULT 5
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export function openDb(file = process.env.DB_PATH || 'data/localdesk.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  seedDefaultTemplates(db);
  return db;
}

function seedDefaultTemplates(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM templates').get();
  if (n > 0) return;
  const ins = db.prepare('INSERT INTO templates (kind, name, body, min_rating, max_rating) VALUES (?, ?, ?, ?, ?)');
  ins.run('reply', 'Positive – thank you', 'Thank you so much, {first_name}! We really appreciate you taking the time to share your experience with {location}. We look forward to seeing you again soon.', 4, 5);
  ins.run('reply', 'Neutral – improve', 'Thanks for the feedback, {first_name}. We are always looking to improve at {location}, and we would love to hear more about how we can make your next visit even better.', 3, 3);
  ins.run('reply', 'Negative – take offline', 'Hi {first_name}, we are sorry to hear about your experience at {location}. This is not the standard we hold ourselves to. Please reach out to us at {phone} so we can make this right.', 1, 2);
  ins.run('sms', 'Default SMS request', 'Hi {first_name}, thanks for choosing {location}! Would you mind leaving us a quick review? {link}', 1, 5);
  ins.run('email', 'Default email request', 'Hi {first_name},\n\nThank you for choosing {location}. Your feedback helps us improve and helps others find us. Could you take 30 seconds to leave a review?\n\n{link}\n\nThank you!\n{location}', 1, 5);
}

export function getSetting(db, key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

export function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

export function logActivity(db, kind, message) {
  db.prepare('INSERT INTO activity (kind, message) VALUES (?, ?)').run(kind, message);
}

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'location';
}

export function uniqueSlug(db, base) {
  let slug = slugify(base);
  let i = 2;
  while (db.prepare('SELECT 1 FROM locations WHERE slug = ?').get(slug)) slug = `${slugify(base)}-${i++}`;
  return slug;
}

// Fill {placeholders} in a template string.
export function fillTemplate(body, vars) {
  return String(body).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m));
}
