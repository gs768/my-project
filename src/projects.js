// CRUD for projects, brands (own + competitors) and prompts.
import { all, get, run, tx, hydrateBrand, hydratePrompt, hydrateProject } from './db.js';
import { defaultProviderIds } from './providers/index.js';
import { normalizeDomain } from './analysis.js';

const PALETTE = ['#2a6df4', '#e8590c', '#12b886', '#be4bdb', '#fab005', '#15aabf', '#fa5252', '#7950f2', '#82c91e', '#868e96'];

const cleanList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim()).filter(Boolean);

export function listProjects() {
  return all(
    `SELECT p.*, (SELECT COUNT(*) FROM prompts WHERE project_id = p.id) AS prompt_count,
            (SELECT COUNT(*) FROM brands WHERE project_id = p.id) AS brand_count,
            (SELECT MAX(started_at) FROM runs WHERE project_id = p.id) AS last_run
     FROM projects p ORDER BY p.id`,
  ).map(hydrateProject);
}

export function getProject(id) {
  const project = hydrateProject(get('SELECT * FROM projects WHERE id = ?', id));
  if (!project) return null;
  project.brands = all('SELECT * FROM brands WHERE project_id = ? ORDER BY is_own DESC, id', id).map(hydrateBrand);
  project.prompts = all('SELECT * FROM prompts WHERE project_id = ? ORDER BY id', id).map(hydratePrompt);
  return project;
}

export function createProject({ name, providers, brand, competitors = [], prompts = [] }) {
  if (!name) throw new Error('name is required');
  return tx(() => {
    const { lastInsertRowid } = run(
      'INSERT INTO projects (name, providers) VALUES (?, ?)',
      name, JSON.stringify(providers?.length ? providers : defaultProviderIds()),
    );
    const id = Number(lastInsertRowid);
    if (brand) addBrand(id, { ...brand, is_own: true });
    for (const c of competitors) addBrand(id, c);
    for (const p of prompts) addPrompt(id, typeof p === 'string' ? { text: p } : p);
    return id;
  });
}

export function updateProject(id, { name, providers }) {
  if (name != null) run('UPDATE projects SET name = ? WHERE id = ?', name, id);
  if (providers != null) run('UPDATE projects SET providers = ? WHERE id = ?', JSON.stringify(cleanList(providers)), id);
  return getProject(id);
}

export function deleteProject(id) {
  run('DELETE FROM projects WHERE id = ?', id);
}

export function addBrand(projectId, { name, domain, aliases, is_own, color }) {
  if (!name) throw new Error('brand name is required');
  const n = get('SELECT COUNT(*) AS n FROM brands WHERE project_id = ?', projectId).n;
  if (is_own) run('UPDATE brands SET is_own = 0 WHERE project_id = ?', projectId);
  const { lastInsertRowid } = run(
    'INSERT INTO brands (project_id, name, domain, aliases, is_own, color) VALUES (?,?,?,?,?,?)',
    projectId, name.trim(), domain ? normalizeDomain(domain) : null, JSON.stringify(cleanList(aliases)), is_own ? 1 : 0,
    color || PALETTE[n % PALETTE.length],
  );
  return hydrateBrand(get('SELECT * FROM brands WHERE id = ?', lastInsertRowid));
}

export function updateBrand(id, patch) {
  const b = get('SELECT * FROM brands WHERE id = ?', id);
  if (!b) throw new Error('brand not found');
  if (patch.is_own) run('UPDATE brands SET is_own = 0 WHERE project_id = ?', b.project_id);
  run(
    'UPDATE brands SET name = ?, domain = ?, aliases = ?, is_own = ?, color = ? WHERE id = ?',
    patch.name ?? b.name,
    patch.domain !== undefined ? (patch.domain ? normalizeDomain(patch.domain) : null) : b.domain,
    patch.aliases !== undefined ? JSON.stringify(cleanList(patch.aliases)) : b.aliases,
    patch.is_own !== undefined ? (patch.is_own ? 1 : 0) : b.is_own,
    patch.color ?? b.color,
    id,
  );
  return hydrateBrand(get('SELECT * FROM brands WHERE id = ?', id));
}

export function deleteBrand(id) {
  run('DELETE FROM brands WHERE id = ?', id);
}

export function addPrompt(projectId, { text, tags, country }) {
  if (!text?.trim()) throw new Error('prompt text is required');
  const { lastInsertRowid } = run(
    'INSERT INTO prompts (project_id, text, tags, country) VALUES (?,?,?,?)',
    projectId, text.trim(), JSON.stringify(cleanList(tags)), country ? country.toUpperCase() : null,
  );
  return hydratePrompt(get('SELECT * FROM prompts WHERE id = ?', lastInsertRowid));
}

export function updatePrompt(id, patch) {
  const p = get('SELECT * FROM prompts WHERE id = ?', id);
  if (!p) throw new Error('prompt not found');
  run(
    'UPDATE prompts SET text = ?, tags = ?, country = ?, active = ? WHERE id = ?',
    patch.text ?? p.text,
    patch.tags !== undefined ? JSON.stringify(cleanList(patch.tags)) : p.tags,
    patch.country !== undefined ? (patch.country ? patch.country.toUpperCase() : null) : p.country,
    patch.active !== undefined ? (patch.active ? 1 : 0) : p.active,
    id,
  );
  return hydratePrompt(get('SELECT * FROM prompts WHERE id = ?', id));
}

export function deletePrompt(id) {
  run('DELETE FROM prompts WHERE id = ?', id);
}

export function listRuns(projectId, limit = 20) {
  return all('SELECT * FROM runs WHERE project_id = ? ORDER BY id DESC LIMIT ?', projectId, limit);
}
