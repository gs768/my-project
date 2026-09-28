import { all, get, run, tx, hydrateBrand, hydratePrompt, hydrateProject } from './db.js';
import { detectMentions, collectCitations } from './analysis.js';
import { scoreSentiment } from './sentiment.js';
import { getProvider } from './providers/index.js';
import { config } from './config.js';

const today = () => new Date().toISOString().slice(0, 10);
const active = new Map(); // projectId -> runId

export function isRunning(projectId) {
  return active.has(Number(projectId));
}

async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

/** Store one answer and everything derived from it. */
export async function recordResponse({ runId, prompt, providerId, model, text, citations, error, latencyMs, day, brands, mock }) {
  const mentions = error ? [] : detectMentions(text, brands);
  const mentioned = mentions.map((m) => brands.find((b) => b.id === m.brandId));
  const sentiment = error ? new Map() : await scoreSentiment(text, mentioned, { mock });
  const cites = error ? [] : collectCitations(citations, text);

  tx(() => {
    const { lastInsertRowid: responseId } = run(
      `INSERT INTO responses (run_id, prompt_id, provider, model, text, error, latency_ms, day) VALUES (?,?,?,?,?,?,?,?)`,
      runId, prompt.id, providerId, model ?? null, text ?? null, error ?? null, latencyMs ?? null, day,
    );
    for (const m of mentions) {
      run(
        `INSERT INTO mentions (response_id, brand_id, position, count, sentiment, snippet) VALUES (?,?,?,?,?,?)`,
        responseId, m.brandId, m.position, m.count, sentiment.get(m.brandId) ?? 50, m.snippet,
      );
    }
    for (const c of cites) {
      run(`INSERT INTO citations (response_id, url, domain, title, rank) VALUES (?,?,?,?,?)`, responseId, c.url, c.domain, c.title, c.rank);
    }
  });
}

/**
 * Ask every active prompt of a project to every enabled engine and store the results.
 * Returns the run id immediately via `onStart`, resolves when finished.
 */
export async function runProject(projectId, { trigger = 'manual', day = today(), onStart } = {}) {
  projectId = Number(projectId);
  if (active.has(projectId)) throw new Error('A run is already in progress for this project');
  const project = hydrateProject(get('SELECT * FROM projects WHERE id = ?', projectId));
  if (!project) throw new Error('Project not found');
  const brands = all('SELECT * FROM brands WHERE project_id = ?', projectId).map(hydrateBrand);
  const prompts = all('SELECT * FROM prompts WHERE project_id = ? AND active = 1', projectId).map(hydratePrompt);
  const providers = project.providers.map((id) => {
    try { return getProvider(id); } catch (e) { console.warn(`[run] skipping ${id}: ${e.message}`); return null; }
  }).filter(Boolean);

  const jobs = prompts.flatMap((prompt) => providers.map((provider) => ({ prompt, provider })));
  const { lastInsertRowid } = run('INSERT INTO runs (project_id, trigger, total) VALUES (?,?,?)', projectId, trigger, jobs.length);
  const runId = Number(lastInsertRowid);
  active.set(projectId, runId);
  onStart?.(runId);

  try {
    await pool(jobs, config.concurrency, async ({ prompt, provider }) => {
      const started = Date.now();
      let result;
      let error;
      try {
        result = await provider.ask(prompt.text, { country: prompt.country || undefined, brands, day });
      } catch (e) {
        error = e.message || String(e);
      }
      await recordResponse({
        runId, prompt, providerId: provider.id, model: result?.model ?? provider.model, text: result?.text,
        citations: result?.citations, error, latencyMs: Date.now() - started, day, brands, mock: provider.mock,
      });
      run(`UPDATE runs SET done = done + 1, errors = errors + ? WHERE id = ?`, error ? 1 : 0, runId);
    });
    run(`UPDATE runs SET status = 'done', finished_at = datetime('now') WHERE id = ?`, runId);
  } catch (e) {
    run(`UPDATE runs SET status = 'failed', finished_at = datetime('now') WHERE id = ?`, runId);
    throw e;
  } finally {
    active.delete(projectId);
  }
  return runId;
}
