import test from 'node:test';
import assert from 'node:assert/strict';
import { resetDb, all } from '../src/db.js';
import { createProject, getProject } from '../src/projects.js';
import { recordResponse, runProject } from '../src/runner.js';
import { brandMetrics, parseFilters, promptMetrics, sourceMetrics, timeseries, listResponses, exportCsv } from '../src/metrics.js';

test('metrics over recorded answers', async () => {
  resetDb(':memory:');
  const id = createProject({
    name: 'T',
    providers: ['mock-chatgpt'],
    brand: { name: 'Acme', domain: 'acme.com' },
    competitors: [{ name: 'Globex', domain: 'globex.com' }],
    prompts: [{ text: 'best widget', tags: ['category'] }, { text: 'widget pricing', tags: ['pricing'] }],
  });
  const p = getProject(id);
  const [q1, q2] = p.prompts;
  const { lastInsertRowid: runId } = (await import('../src/db.js')).run('INSERT INTO runs (project_id) VALUES (?)', id);
  const day = '2026-09-01';
  const base = { runId, providerId: 'mock-chatgpt', day, brands: p.brands, mock: true };
  await recordResponse({ ...base, prompt: q1, text: 'Globex is great. Acme is also good.', citations: [{ url: 'https://reddit.com/a' }] });
  await recordResponse({ ...base, prompt: q1, text: 'Acme leads the pack.', citations: [{ url: 'https://acme.com/' }] });
  await recordResponse({ ...base, prompt: q2, text: 'Globex only.', citations: [] });
  await recordResponse({ ...base, prompt: q2, text: null, error: 'boom' });

  const f = parseFilters(id, { from: day, to: day });
  const m = brandMetrics(f);
  assert.equal(m.totalResponses, 3); // errored answer excluded
  const acme = m.brands.find((b) => b.brand.name === 'Acme');
  const globex = m.brands.find((b) => b.brand.name === 'Globex');
  assert.equal(acme.visibility, 66.7);
  assert.equal(acme.position, 1.5);
  assert.equal(acme.shareOfVoice, 50);
  assert.equal(globex.visibility, 66.7);

  const tagged = brandMetrics(parseFilters(id, { from: day, to: day, tags: 'pricing' }));
  assert.equal(tagged.totalResponses, 1);
  assert.equal(tagged.brands.find((b) => b.brand.name === 'Acme').visibility, 0);

  const pm = promptMetrics(f);
  assert.equal(pm.find((x) => x.id === q1.id).visibility, 100);
  assert.equal(pm.find((x) => x.id === q2.id).visibility, 0);

  const s = sourceMetrics(f);
  assert.deepEqual(s.domains.map((d) => [d.domain, d.type]).sort(), [['acme.com', 'own'], ['reddit.com', 'ugc']]);

  const ts = timeseries(f);
  assert.deepEqual(ts.days, [day]);
  assert.equal(listResponses(f).total, 3);
  assert.match(exportCsv(f), /^day,provider/);
});

test('runProject asks every prompt to every engine', async () => {
  resetDb(':memory:');
  const id = createProject({
    name: 'Run',
    providers: ['mock-chatgpt', 'mock-claude'],
    brand: { name: 'Acme', domain: 'acme.com' },
    competitors: [{ name: 'Globex' }, { name: 'Initech' }],
    prompts: ['a', 'b', 'c'],
  });
  const runId = await runProject(id, { day: '2026-09-02' });
  const [r] = all('SELECT * FROM runs WHERE id = ?', runId);
  assert.equal(r.status, 'done');
  assert.equal(r.total, 6);
  assert.equal(r.done, 6);
  assert.equal(all('SELECT COUNT(*) AS n FROM responses')[0].n, 6);
  assert.ok(all('SELECT COUNT(*) AS n FROM mentions')[0].n >= 12); // mock always names ≥ 2 brands
});
