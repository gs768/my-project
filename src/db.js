import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  providers TEXT NOT NULL DEFAULT '[]',          -- JSON array of enabled provider ids
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  aliases TEXT NOT NULL DEFAULT '[]',            -- JSON array of alternative names
  is_own INTEGER NOT NULL DEFAULT 0,
  color TEXT
);

CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  country TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  total INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT,
  text TEXT,
  error TEXT,
  latency_ms INTEGER,
  day TEXT NOT NULL,                             -- YYYY-MM-DD, used for time series
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_responses_day ON responses(day);
CREATE INDEX IF NOT EXISTS idx_responses_prompt ON responses(prompt_id);

CREATE TABLE IF NOT EXISTS mentions (
  id INTEGER PRIMARY KEY,
  response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,                     -- 1 = first tracked brand named in the answer
  count INTEGER NOT NULL,
  sentiment REAL,                                -- 0..100
  snippet TEXT
);
CREATE INDEX IF NOT EXISTS idx_mentions_response ON mentions(response_id);

CREATE TABLE IF NOT EXISTS citations (
  id INTEGER PRIMARY KEY,
  response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  rank INTEGER
);
CREATE INDEX IF NOT EXISTS idx_citations_response ON citations(response_id);
`;

let db;

export function getDb(file = config.dbPath) {
  if (db) return db;
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

// For tests: swap in a fresh database.
export function resetDb(file = ':memory:') {
  if (db) db.close();
  db = undefined;
  return getDb(file);
}

export const all = (sql, ...p) => getDb().prepare(sql).all(...p);
export const get = (sql, ...p) => getDb().prepare(sql).get(...p);
export const run = (sql, ...p) => getDb().prepare(sql).run(...p);

export function tx(fn) {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const r = fn();
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

const parse = (s, fallback) => {
  try { return JSON.parse(s); } catch { return fallback; }
};

export const hydrateBrand = (b) => b && { ...b, aliases: parse(b.aliases, []), is_own: !!b.is_own };
export const hydratePrompt = (p) => p && { ...p, tags: parse(p.tags, []), active: !!p.active };
export const hydrateProject = (p) => p && { ...p, providers: parse(p.providers, []) };
