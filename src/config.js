import fs from 'node:fs';
import path from 'node:path';

// Minimal .env loader so the app runs with zero extra dependencies.
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const env = process.env;

export const config = {
  port: Number(env.PORT || 3000),
  dbPath: env.DB_PATH || path.resolve(process.cwd(), 'data', 'beacon.db'),
  // Hour of day (server local time) for the automatic daily run. Empty/"off" disables it.
  dailyRunHour: env.DAILY_RUN_HOUR === 'off' || env.DAILY_RUN_HOUR === '' ? null : Number(env.DAILY_RUN_HOUR ?? 6),
  concurrency: Number(env.RUN_CONCURRENCY || 3),
  // Optional shared secret for the web UI / API. If set, send it as `Authorization: Bearer <token>`.
  authToken: env.BEACON_TOKEN || null,
  keys: {
    openai: env.OPENAI_API_KEY || null,
    anthropic: env.ANTHROPIC_API_KEY || null,
    gemini: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || null,
    perplexity: env.PERPLEXITY_API_KEY || null,
  },
  models: {
    openai: env.OPENAI_MODEL || 'gpt-5',
    anthropic: env.ANTHROPIC_MODEL || 'claude-opus-5',
    gemini: env.GEMINI_MODEL || 'gemini-2.5-flash',
    perplexity: env.PERPLEXITY_MODEL || 'sonar',
  },
  // Which provider (if any) to use as an LLM judge for sentiment. Falls back to a lexicon.
  judge: env.SENTIMENT_JUDGE || 'auto',
};
