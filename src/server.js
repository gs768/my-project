import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { getDb } from './db.js';
import * as projects from './projects.js';
import * as metrics from './metrics.js';
import { runProject, isRunning } from './runner.js';
import { listProviders } from './providers/index.js';
import { startScheduler } from './scheduler.js';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
  routes.push({ method, re, keys, handler });
};

const need = (v, what = 'Not found') => { if (!v) throw new HttpError(404, what); return v; };
const projectOr404 = (id) => need(projects.getProject(Number(id)), 'Project not found');

route('GET', '/api/providers', () => listProviders());

route('GET', '/api/projects', () => projects.listProjects());
route('POST', '/api/projects', ({ body }) => projects.getProject(projects.createProject(body)));
route('GET', '/api/projects/:id', ({ params }) => ({ ...projectOr404(params.id), running: isRunning(params.id) }));
route('PATCH', '/api/projects/:id', ({ params, body }) => (projectOr404(params.id), projects.updateProject(Number(params.id), body)));
route('DELETE', '/api/projects/:id', ({ params }) => (projects.deleteProject(Number(params.id)), { ok: true }));

route('POST', '/api/projects/:id/brands', ({ params, body }) => (projectOr404(params.id), projects.addBrand(Number(params.id), body)));
route('PATCH', '/api/brands/:id', ({ params, body }) => projects.updateBrand(Number(params.id), body));
route('DELETE', '/api/brands/:id', ({ params }) => (projects.deleteBrand(Number(params.id)), { ok: true }));

route('POST', '/api/projects/:id/prompts', ({ params, body }) => {
  projectOr404(params.id);
  // Accept one prompt, an array, or a newline-separated bulk paste.
  const items = Array.isArray(body) ? body : body.bulk ? body.bulk.split('\n').map((text) => ({ text, tags: body.tags, country: body.country })) : [body];
  return items.filter((p) => p.text?.trim()).map((p) => projects.addPrompt(Number(params.id), p));
});
route('PATCH', '/api/prompts/:id', ({ params, body }) => projects.updatePrompt(Number(params.id), body));
route('DELETE', '/api/prompts/:id', ({ params }) => (projects.deletePrompt(Number(params.id)), { ok: true }));

route('GET', '/api/projects/:id/runs', ({ params }) => ({ running: isRunning(params.id), runs: projects.listRuns(Number(params.id)) }));
route('POST', '/api/projects/:id/runs', async ({ params }) => {
  projectOr404(params.id);
  if (isRunning(params.id)) throw new HttpError(409, 'A run is already in progress');
  const runId = await new Promise((resolve, reject) => {
    runProject(params.id, { onStart: resolve }).catch((e) => { console.error(`[run] ${e.message}`); reject(e); });
  });
  return { runId };
});

const filters = (params, query) => metrics.parseFilters(params.id, query);
route('GET', '/api/projects/:id/overview', ({ params, query }) => {
  const f = filters(params, query);
  return { filters: f, ...metrics.brandMetrics(f), timeseries: metrics.timeseries(f), providers: metrics.providerBreakdown(f) };
});
route('GET', '/api/projects/:id/prompt-metrics', ({ params, query }) => metrics.promptMetrics(filters(params, query)));
route('GET', '/api/projects/:id/sources', ({ params, query }) => metrics.sourceMetrics(filters(params, query)));
route('GET', '/api/projects/:id/responses', ({ params, query }) =>
  metrics.listResponses(filters(params, query), { limit: Math.min(200, Number(query.limit) || 25), offset: Number(query.offset) || 0, brandId: query.brand }));
route('GET', '/api/projects/:id/export.csv', ({ params, query }) => ({ __csv: metrics.exportCsv(filters(params, query)) }));

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Invalid JSON body'); }
}

function serveStatic(req, res, pathname) {
  let file = path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);

    const send = (status, data) => {
      if (data?.__csv !== undefined) {
        res.writeHead(status, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="beacon-export.csv"' });
        return res.end(data.__csv);
      }
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    if (config.authToken) {
      const given = req.headers.authorization?.replace(/^Bearer\s+/i, '') || url.searchParams.get('token');
      if (given !== config.authToken) return send(401, { error: 'Unauthorized' });
    }

    const match = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!match) return send(404, { error: 'Not found' });
    const m = url.pathname.match(match.re);
    const params = Object.fromEntries(match.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    try {
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
      const result = await match.handler({ params, query: Object.fromEntries(url.searchParams), body, req });
      send(200, result);
    } catch (e) {
      const status = e.status || (/required|invalid|already/i.test(e.message) ? 400 : 500);
      if (status === 500) console.error(e);
      send(status, { error: e.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  getDb();
  createServer().listen(config.port, () => console.log(`Beacon running at http://localhost:${config.port}`));
  startScheduler();
}
