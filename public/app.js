// Beacon dashboard — plain ES modules, no build step.

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (v, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

const TOKEN_KEY = 'beacon-token';
const state = {
  projects: [],
  project: null,
  providers: [],
  tab: location.hash.slice(1) || 'overview',
  range: 30,
  provider: '',
  tag: '',
  hidden: new Set(),
  metric: 'visibility',
};

async function api(path, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(path, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...opts.headers },
    body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body,
  });
  if (res.status === 401) {
    const t = prompt('This Beacon instance is protected. Enter access token:');
    if (t) { localStorage.setItem(TOKEN_KEY, t); return api(path, opts); }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function query(extra = {}) {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - (state.range - 1) * 86400000).toISOString().slice(0, 10);
  const q = new URLSearchParams({ from, to, ...extra });
  if (state.provider) q.set('providers', state.provider);
  if (state.tag) q.set('tags', state.tag);
  return q.toString();
}

const providerLabel = (id) => state.providers.find((p) => p.id === id)?.label || id;
const brandById = (id) => state.project?.brands.find((b) => b.id === id);

function delta(v, { invert = false, suffix = '' } = {}) {
  if (v == null || v === 0) return '';
  const good = invert ? v < 0 : v > 0;
  return `<span class="delta ${good ? 'up' : 'down'}">${v > 0 ? '▲' : '▼'} ${Math.abs(v)}${suffix}</span>`;
}

// ---------- Charts ----------

function lineChart(el, days, series, { max = null, invert = false, suffix = '%' } = {}) {
  const W = 800, H = 280, L = 36, R = 12, T = 12, B = 26;
  const visible = series.filter((s) => !state.hidden.has(s.brandId));
  const vals = visible.flatMap((s) => s.values).filter((v) => v != null);
  const top = max ?? Math.max(1, Math.ceil(Math.max(...vals, 1) / 10) * 10);
  const lo = invert ? 1 : 0;
  const x = (i) => L + (days.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (days.length - 1));
  const y = (v) => (invert ? T + ((v - lo) / (top - lo || 1)) * (H - T - B) : H - B - (v / top) * (H - T - B));
  const ticks = invert ? [1, Math.round((top + 1) / 2), top] : [0, top / 2, top];
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
  for (const t of ticks) svg += `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`;
  const step = Math.max(1, Math.ceil(days.length / 8));
  days.forEach((d, i) => { if (i % step === 0) svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${d.slice(5)}</text>`; });
  for (const s of visible) {
    let dPath = '';
    s.values.forEach((v, i) => { if (v != null) dPath += `${dPath && s.values[i - 1] != null ? 'L' : 'M'}${x(i)},${y(v)}`; });
    svg += `<path d="${dPath}" fill="none" stroke="${s.color}" stroke-width="${s.isOwn ? 3 : 1.75}" stroke-linejoin="round"/>`;
  }
  svg += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" class="hover"/>`;
  svg += `<line class="cursor" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/></svg>`;
  el.innerHTML = svg;

  const tip = $('#tooltip');
  const svgEl = el.querySelector('svg');
  const cursor = el.querySelector('.cursor');
  svgEl.addEventListener('mousemove', (e) => {
    const r = svgEl.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(days.length - 1, Math.round(((px - L) / (W - L - R)) * (days.length - 1))));
    cursor.setAttribute('x1', x(i)); cursor.setAttribute('x2', x(i)); cursor.setAttribute('visibility', 'visible');
    const rows = visible.map((s) => ({ s, v: s.values[i] })).sort((a, b) => (invert ? (a.v ?? 99) - (b.v ?? 99) : (b.v ?? -1) - (a.v ?? -1)));
    tip.innerHTML = `<strong>${days[i]}</strong><br>` + rows.map(({ s, v }) => `<span class="swatch" style="background:${s.color}"></span>${esc(s.name)}: ${fmt(v, suffix)}`).join('<br>');
    tip.hidden = false;
    tip.style.left = Math.min(window.innerWidth - 200, e.clientX + 14) + 'px';
    tip.style.top = e.clientY + 14 + 'px';
  });
  svgEl.addEventListener('mouseleave', () => { tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); });
}

// ---------- Views ----------

const views = {
  async overview(el) {
    const data = await api(`/api/projects/${state.project.id}/overview?${query()}`);
    if (!data.totalResponses) return emptyState(el);
    const own = data.brands.find((b) => b.brand.is_own) || data.brands[0];
    const metricDefs = {
      visibility: { label: 'Visibility', suffix: '%' },
      position: { label: 'Avg. position', suffix: '', invert: true },
      sentiment: { label: 'Sentiment', suffix: '', max: 100 },
    };
    const md = metricDefs[state.metric];
    el.innerHTML = `
      <div class="grid kpis">
        ${kpi('Visibility', fmt(own.visibility, '%'), delta(own.change.visibility, { suffix: ' pts' }), `${esc(own.brand.name)} appears in this share of answers`)}
        ${kpi('Share of voice', fmt(own.shareOfVoice, '%'), delta(own.change.shareOfVoice, { suffix: ' pts' }), 'Of all tracked-brand mentions')}
        ${kpi('Avg. position', fmt(own.position), delta(own.change.position, { invert: true }), 'Rank among brands in the answer')}
        ${kpi('Sentiment', fmt(own.sentiment, '/100'), delta(own.change.sentiment), '50 = neutral')}
        ${kpi('Rank', `#${own.rank}`, '', `of ${data.brands.length} tracked brands`)}
        ${kpi('Answers analysed', data.totalResponses.toLocaleString(), '', `${data.previousResponses.toLocaleString()} previous period`)}
      </div>
      <div class="grid two" style="margin-top:16px">
        <div class="card chart">
          <div class="row" style="justify-content:space-between"><h3>${md.label} over time</h3>
            <select id="metricSelect">${Object.entries(metricDefs).map(([k, v]) => `<option value="${k}" ${k === state.metric ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
          </div>
          <div id="chart"></div>
          <div class="legend" id="legend"></div>
        </div>
        <div class="card">
          <h3>By engine <span class="muted">— ${esc(own.brand.name)}</span></h3>
          <table>
            <tr><th>Engine</th><th>Visibility</th><th class="num">Pos.</th></tr>
            ${data.providers.map((p) => `<tr><td>${esc(providerLabel(p.provider))}<div class="muted" style="font-size:12px">${p.responses} answers</div></td>
              <td><div class="bar"><span style="width:${p.visibility || 0}%"></span></div>${fmt(p.visibility, '%')}</td><td class="num">${fmt(p.position)}</td></tr>`).join('')}
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Brand leaderboard</h3>
        <div class="table-wrap"><table>
          <tr><th>#</th><th>Brand</th><th class="num">Visibility</th><th class="num">Share of voice</th><th class="num">Avg. position</th><th class="num">Sentiment</th><th class="num">Mentions</th></tr>
          ${data.brands.map((b) => `<tr class="${b.brand.is_own ? 'own' : ''}">
            <td>${b.rank}</td>
            <td><span class="swatch" style="background:${esc(b.brand.color)}"></span>${esc(b.brand.name)} ${b.brand.is_own ? '<span class="pill own">you</span>' : ''}</td>
            <td class="num">${fmt(b.visibility, '%')} ${delta(b.change.visibility)}</td>
            <td class="num">${fmt(b.shareOfVoice, '%')} ${delta(b.change.shareOfVoice)}</td>
            <td class="num">${fmt(b.position)} ${delta(b.change.position, { invert: true })}</td>
            <td class="num">${fmt(b.sentiment)} ${delta(b.change.sentiment)}</td>
            <td class="num">${b.mentions}</td></tr>`).join('')}
        </table></div>
      </div>`;
    const draw = () => {
      const series = data.timeseries.series.map((s) => ({ ...s, values: s[state.metric] }));
      lineChart($('#chart', el), data.timeseries.days, series, md);
      $('#legend', el).innerHTML = series.map((s) => `<span data-id="${s.brandId}" class="${state.hidden.has(s.brandId) ? 'off' : ''}"><span class="swatch" style="background:${esc(s.color)}"></span>${esc(s.name)}</span>`).join('');
    };
    draw();
    $('#legend', el).addEventListener('click', (e) => {
      const id = Number(e.target.closest('[data-id]')?.dataset.id);
      if (!id) return;
      state.hidden.has(id) ? state.hidden.delete(id) : state.hidden.add(id);
      draw();
    });
    $('#metricSelect', el).addEventListener('change', (e) => { state.metric = e.target.value; render(); });
  },

  async prompts(el) {
    const rows = await api(`/api/projects/${state.project.id}/prompt-metrics?${query()}`);
    const own = state.project.brands.find((b) => b.is_own);
    el.innerHTML = `<div class="card"><h3>Prompts <span class="muted">— how ${esc(own?.name || 'your brand')} performs on each question</span></h3>
      <div class="table-wrap"><table>
        <tr><th>Prompt</th><th>Tags</th><th class="num">Answers</th><th class="num">Visibility</th><th class="num">Position</th><th class="num">Sentiment</th><th>Top brands mentioned</th><th></th></tr>
        ${rows.map((p) => `<tr>
          <td>${esc(p.text)}${p.country ? ` <span class="pill">${esc(p.country)}</span>` : ''}${p.active ? '' : ' <span class="pill">paused</span>'}</td>
          <td>${p.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</td>
          <td class="num">${p.responses}</td>
          <td class="num"><div class="bar"><span style="width:${p.visibility || 0}%"></span></div>${fmt(p.visibility, '%')}</td>
          <td class="num">${fmt(p.position)}</td>
          <td class="num">${fmt(p.sentiment)}</td>
          <td>${p.topBrands.map((b) => `<span class="pill ${brandById(b.brandId)?.is_own ? 'own' : ''}">${esc(b.name)} ${b.visibility}%</span>`).join('')}</td>
          <td><button class="small ghost" data-prompt="${p.id}">Answers →</button></td></tr>`).join('')}
      </table></div></div>`;
    el.addEventListener('click', (e) => {
      const id = e.target.dataset.prompt;
      if (id) { state.promptFilter = Number(id); setTab('responses'); }
    });
  },

  async sources(el) {
    const data = await api(`/api/projects/${state.project.id}/sources?${query()}`);
    if (!data.totalResponses) return emptyState(el);
    const totalCites = Object.values(data.byType).reduce((a, b) => a + b, 0) || 1;
    const types = Object.entries(data.byType).sort((a, b) => b[1] - a[1]);
    el.innerHTML = `
      <div class="card"><h3>Source types <span class="muted">— what kind of pages the engines lean on</span></h3>
        <div class="row">${types.map(([t, n]) => `<span class="pill ${t}">${esc(t)} · ${Math.round((100 * n) / totalCites)}%</span>`).join('')}</div>
      </div>
      <div class="grid two" style="margin-top:16px">
        <div class="card"><h3>Top domains <span class="muted">— usage = % of answers citing the domain</span></h3>
          <div class="table-wrap"><table>
            <tr><th>Domain</th><th>Type</th><th class="num">Usage</th><th class="num">Citations</th><th class="num">Avg. rank</th><th class="num">You mentioned</th></tr>
            ${data.domains.map((d) => `<tr><td>${esc(d.domain)}</td><td><span class="pill ${d.type}">${esc(d.type)}</span></td>
              <td class="num">${d.usage}%</td><td class="num">${d.citations}</td><td class="num">${fmt(d.avgRank)}</td><td class="num">${d.ownMentionRate}%</td></tr>`).join('')}
          </table></div>
        </div>
        <div class="card"><h3>Top URLs</h3>
          <div class="table-wrap" style="max-height:640px;overflow-y:auto"><table>
            <tr><th>URL</th><th class="num">Usage</th></tr>
            ${data.urls.map((u) => `<tr><td><a href="${esc(u.url)}" target="_blank" rel="noopener noreferrer">${esc(u.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80))}</a><div class="muted" style="font-size:12px">${esc(u.domain)}</div></td><td class="num">${u.usage}%</td></tr>`).join('')}
          </table></div>
        </div>
      </div>`;
  },

  async responses(el) {
    const extra = { limit: 25, offset: state.offset || 0 };
    if (state.promptFilter) extra.prompt = state.promptFilter;
    if (state.brandFilter) extra.brand = state.brandFilter;
    const data = await api(`/api/projects/${state.project.id}/responses?${query(extra)}`);
    const brands = state.project.brands;
    el.innerHTML = `<div class="card">
      <div class="row" style="justify-content:space-between">
        <h3>Responses <span class="muted">— ${data.total.toLocaleString()} answers</span></h3>
        <div class="row">
          <select id="respPrompt"><option value="">All prompts</option>${state.project.prompts.map((p) => `<option value="${p.id}" ${p.id === state.promptFilter ? 'selected' : ''}>${esc(p.text.slice(0, 70))}</option>`).join('')}</select>
          <select id="respBrand"><option value="">Any brand</option>${brands.map((b) => `<option value="${b.id}" ${b.id === state.brandFilter ? 'selected' : ''}>Mentions ${esc(b.name)}</option>`).join('')}</select>
        </div>
      </div>
      ${data.items.map((r) => `<article class="response">
        <header><strong>${esc(providerLabel(r.provider))}</strong><span class="muted">${esc(r.model || '')} · ${esc(r.day)}</span></header>
        <div class="muted" style="margin-bottom:6px">“${esc(r.prompt)}”</div>
        <div class="row" style="margin-bottom:6px">${r.mentions.map((m) => { const b = brandById(m.brand_id); return `<span class="pill ${b?.is_own ? 'own' : 'competitor'}">#${m.position} ${esc(b?.name)} · sentiment ${Math.round(m.sentiment)}</span>`; }).join('') || '<span class="muted">No tracked brands mentioned</span>'}</div>
        <div class="body">${highlight(r.text)}</div>
        <button class="small ghost expand">Show full answer</button>
        ${r.citations.length ? `<div class="sources">Sources: ${r.citations.map((c) => `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.domain)}</a>`).join(', ')}</div>` : ''}
      </article>`).join('') || '<div class="empty">No answers match these filters.</div>'}
      <div class="row" style="justify-content:center;margin-top:12px">
        <button id="prevPage" ${extra.offset ? '' : 'disabled'}>← Newer</button>
        <button id="nextPage" ${extra.offset + 25 < data.total ? '' : 'disabled'}>Older →</button>
      </div></div>`;
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('expand')) {
        const body = e.target.previousElementSibling;
        body.classList.toggle('open');
        e.target.textContent = body.classList.contains('open') ? 'Collapse' : 'Show full answer';
      }
    });
    $('#respPrompt', el).onchange = (e) => { state.promptFilter = Number(e.target.value) || null; state.offset = 0; render(); };
    $('#respBrand', el).onchange = (e) => { state.brandFilter = Number(e.target.value) || null; state.offset = 0; render(); };
    $('#prevPage', el).onclick = () => { state.offset = Math.max(0, extra.offset - 25); render(); };
    $('#nextPage', el).onclick = () => { state.offset = extra.offset + 25; render(); };
  },

  async settings(el) {
    const p = state.project;
    const runs = await api(`/api/projects/${p.id}/runs`);
    el.innerHTML = `
      <div class="grid two">
        <div class="card">
          <h3>Brands</h3>
          <table>
            <tr><th>Name</th><th>Domain</th><th>Aliases</th><th></th></tr>
            ${p.brands.map((b) => `<tr class="${b.is_own ? 'own' : ''}"><td><span class="swatch" style="background:${esc(b.color)}"></span>${esc(b.name)} ${b.is_own ? '<span class="pill own">you</span>' : ''}</td>
              <td>${esc(b.domain || '')}</td><td>${b.aliases.map((a) => `<span class="pill">${esc(a)}</span>`).join('')}</td>
              <td class="num"><button class="small ghost" data-edit-brand="${b.id}">Edit</button> <button class="small ghost danger" data-del-brand="${b.id}">✕</button></td></tr>`).join('')}
          </table>
          <button id="addBrand" style="margin-top:10px">+ Add competitor</button>
        </div>
        <div class="card">
          <h3>Engines</h3>
          <div class="checks">${state.providers.map((pr) => `<label title="${pr.available ? esc(pr.model) : 'Add an API key to enable'}">
            <input type="checkbox" value="${pr.id}" ${p.providers.includes(pr.id) ? 'checked' : ''} ${pr.available ? '' : 'disabled'}/> ${esc(pr.label)}${pr.available ? '' : ' <span class="muted">(no key)</span>'}</label>`).join('')}</div>
          <button id="saveEngines" style="margin-top:10px">Save engines</button>
          <h3 style="margin-top:20px">Recent runs</h3>
          <table><tr><th>Started</th><th>Trigger</th><th>Status</th><th class="num">Done</th><th class="num">Errors</th></tr>
            ${runs.runs.map((r) => `<tr><td>${esc(r.started_at)}</td><td>${esc(r.trigger)}</td><td>${esc(r.status)}</td><td class="num">${r.done}/${r.total}</td><td class="num">${r.errors}</td></tr>`).join('')}
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Prompts <span class="muted">— the questions asked to every engine on each run</span></h3>
        <table>
          <tr><th>Prompt</th><th>Tags</th><th>Country</th><th></th></tr>
          ${p.prompts.map((q) => `<tr><td>${esc(q.text)}</td><td>${q.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</td><td>${esc(q.country || '')}</td>
            <td class="num"><button class="small ghost" data-toggle-prompt="${q.id}" data-active="${q.active}">${q.active ? 'Pause' : 'Resume'}</button> <button class="small ghost danger" data-del-prompt="${q.id}">✕</button></td></tr>`).join('')}
        </table>
        <div class="form-grid" style="margin-top:12px">
          <label>Add prompts (one per line)<textarea id="newPrompts" placeholder="best crm for startups&#10;hubspot alternatives"></textarea></label>
          <div class="row"><input id="newPromptTags" placeholder="tags, comma separated" style="max-width:260px"/><input id="newPromptCountry" placeholder="country (e.g. US)" style="max-width:160px"/><button id="addPrompts" class="primary">Add prompts</button></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Project</h3>
        <div class="row"><input id="projectName" value="${esc(p.name)}" style="max-width:360px"/><button id="saveName">Rename</button><div class="spacer"></div><button id="deleteProject" class="danger">Delete project</button></div>
      </div>`;

    el.addEventListener('click', async (e) => {
      const d = e.target.dataset;
      try {
        if (d.delBrand && confirm('Remove this brand and its history?')) await api(`/api/brands/${d.delBrand}`, { method: 'DELETE' });
        else if (d.editBrand) await brandDialog(p.brands.find((b) => b.id === Number(d.editBrand)));
        else if (d.delPrompt && confirm('Delete this prompt and its answers?')) await api(`/api/prompts/${d.delPrompt}`, { method: 'DELETE' });
        else if (d.togglePrompt) await api(`/api/prompts/${d.togglePrompt}`, { method: 'PATCH', body: { active: d.active !== 'true' } });
        else if (e.target.id === 'addBrand') await brandDialog();
        else if (e.target.id === 'saveEngines') await api(`/api/projects/${p.id}`, { method: 'PATCH', body: { providers: [...el.querySelectorAll('.checks input:checked')].map((i) => i.value) } });
        else if (e.target.id === 'addPrompts') await api(`/api/projects/${p.id}/prompts`, { method: 'POST', body: { bulk: $('#newPrompts').value, tags: $('#newPromptTags').value, country: $('#newPromptCountry').value } });
        else if (e.target.id === 'saveName') await api(`/api/projects/${p.id}`, { method: 'PATCH', body: { name: $('#projectName').value } });
        else if (e.target.id === 'deleteProject') {
          if (!confirm(`Delete "${p.name}" and all of its data?`)) return;
          await api(`/api/projects/${p.id}`, { method: 'DELETE' });
          localStorage.removeItem('beacon-project');
          return boot();
        } else return;
        await loadProject(p.id);
        render();
      } catch (err) { alert(err.message); }
    });
  },
};

function kpi(label, value, deltaHtml, sub) {
  return `<div class="card kpi"><div class="label">${label}</div><div class="value">${value} <span style="font-size:14px">${deltaHtml}</span></div><div class="sub">${sub}</div></div>`;
}

function highlight(text) {
  let html = esc(text);
  const terms = state.project.brands.flatMap((b) => [b.name, ...b.aliases].map((t) => ({ t, own: b.is_own })));
  terms.sort((a, b) => b.t.length - a.t.length);
  for (const { t, own } of terms) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}>])(${esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}\\p{N}<])`, 'giu');
    html = html.replace(re, `<mark class="${own ? '' : 'comp'}">$1</mark>`);
  }
  return html;
}

function emptyState(el) {
  const p = state.project;
  el.innerHTML = `<div class="card empty"><h2>No data yet</h2>
    <p>${p.prompts.length} prompts × ${p.providers.length} engines are configured. Click <strong>Run now</strong> to ask them for the first time.</p>
    <p>Beacon also runs automatically every day, so trends build up over time.</p></div>`;
}

// ---------- Dialogs ----------

function openDialog(html, onSubmit) {
  const dlg = $('#dialog');
  const form = $('#dialogForm');
  form.innerHTML = html + `<div class="row" style="justify-content:flex-end;margin-top:16px"><button value="cancel" formnovalidate>Cancel</button><button value="ok" class="primary">Save</button></div>`;
  return new Promise((resolve) => {
    form.onsubmit = async (e) => {
      if (e.submitter?.value !== 'ok') return resolve(null);
      e.preventDefault();
      try { resolve(await onSubmit(Object.fromEntries(new FormData(form)))); dlg.close(); } catch (err) { alert(err.message); }
    };
    dlg.showModal();
  });
}

function brandDialog(brand) {
  return openDialog(`<h3>${brand ? 'Edit brand' : 'Add competitor'}</h3><div class="form-grid">
      <label>Name<input name="name" required value="${esc(brand?.name || '')}"/></label>
      <label>Domain<input name="domain" placeholder="example.com" value="${esc(brand?.domain || '')}"/></label>
      <label>Aliases (comma separated — other names the engines may use)<input name="aliases" value="${esc(brand?.aliases.join(', ') || '')}"/></label>
      <label>Color<input name="color" type="color" value="${esc(brand?.color || '#868e96')}"/></label></div>`,
    (v) => (brand ? api(`/api/brands/${brand.id}`, { method: 'PATCH', body: v }) : api(`/api/projects/${state.project.id}/brands`, { method: 'POST', body: v })));
}

function newProjectDialog() {
  return openDialog(`<h3>New project</h3><div class="form-grid">
      <label>Project name<input name="name" required placeholder="Acme — CRM category"/></label>
      <label>Your brand<input name="brand" required placeholder="Acme"/></label>
      <label>Your domain<input name="domain" placeholder="acme.com"/></label>
      <label>Aliases<input name="aliases" placeholder="Acme CRM, AcmeHQ"/></label>
      <label>Competitors (one per line, optionally "Name | domain")<textarea name="competitors" placeholder="HubSpot | hubspot.com&#10;Salesforce | salesforce.com"></textarea></label>
      <label>Prompts (one per line)<textarea name="prompts" placeholder="best crm for small business&#10;hubspot alternatives"></textarea></label></div>`,
    async (v) => {
      const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);
      const p = await api('/api/projects', {
        method: 'POST',
        body: {
          name: v.name,
          brand: { name: v.brand, domain: v.domain, aliases: v.aliases },
          competitors: lines(v.competitors).map((l) => { const [name, domain] = l.split('|').map((s) => s.trim()); return { name, domain }; }),
          prompts: lines(v.prompts),
        },
      });
      localStorage.setItem('beacon-project', p.id);
      await boot();
      return p;
    });
}

// ---------- Wiring ----------

async function loadProject(id) {
  state.project = await api(`/api/projects/${id}`);
  const tags = [...new Set(state.project.prompts.flatMap((p) => p.tags))].sort();
  $('#tagFilter').innerHTML = `<option value="">All tags</option>` + tags.map((t) => `<option ${t === state.tag ? 'selected' : ''}>${esc(t)}</option>`).join('');
  $('#providerFilter').innerHTML = `<option value="">All engines</option>` + state.project.providers.map((id) => `<option value="${esc(id)}" ${id === state.provider ? 'selected' : ''}>${esc(providerLabel(id))}</option>`).join('');
  setRunning(state.project.running);
}

async function render() {
  const el = $('#view');
  const fresh = el.cloneNode(false); // drop old listeners
  el.replaceWith(fresh);
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  $('#filters').style.display = state.tab === 'settings' ? 'none' : '';
  $('#exportLink').href = state.project ? `/api/projects/${state.project.id}/export.csv?${query()}` : '#';
  if (!state.project) {
    fresh.innerHTML = `<div class="card empty"><h2>Track how AI search talks about your brand</h2>
      <p>Create a project with your brand, competitors and the questions your customers ask ChatGPT, Claude, Gemini and Perplexity.</p>
      <p><button class="primary" id="emptyNew">Create your first project</button></p>
      <p class="muted">Or run <code>npm run demo</code> to load 30 days of sample data.</p></div>`;
    $('#emptyNew').onclick = newProjectDialog;
    return;
  }
  try { await views[state.tab](fresh); } catch (e) { fresh.innerHTML = `<div class="card empty">Error: ${esc(e.message)}</div>`; }
}

function setTab(tab) {
  state.tab = tab;
  if (tab !== 'responses') { state.offset = 0; }
  history.replaceState(null, '', '#' + tab);
  render();
}

let pollTimer;
function setRunning(running) {
  $('#runBtn').disabled = running;
  $('#runBtn').textContent = running ? 'Running…' : 'Run now';
  clearTimeout(pollTimer);
  if (running) pollTimer = setTimeout(pollRun, 3000);
  else $('#runStatus').textContent = '';
}

async function pollRun() {
  const { running, runs } = await api(`/api/projects/${state.project.id}/runs`);
  const r = runs[0];
  $('#runStatus').textContent = running && r ? `${r.done}/${r.total} answers` : '';
  setRunning(running);
  if (!running) render();
}

async function boot() {
  [state.providers, state.projects] = await Promise.all([api('/api/providers'), api('/api/projects')]);
  const saved = Number(localStorage.getItem('beacon-project'));
  const current = state.projects.find((p) => p.id === saved) || state.projects[state.projects.length - 1];
  $('#projectSelect').innerHTML = state.projects.map((p) => `<option value="${p.id}" ${p.id === current?.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  $('#projectSelect').style.display = state.projects.length ? '' : 'none';
  $('#runBtn').style.display = state.projects.length ? '' : 'none';
  state.project = null;
  if (current) await loadProject(current.id);
  render();
}

$('#tabs').addEventListener('click', (e) => e.target.dataset.tab && setTab(e.target.dataset.tab));
$('#projectSelect').addEventListener('change', async (e) => {
  localStorage.setItem('beacon-project', e.target.value);
  state.tag = state.provider = ''; state.promptFilter = state.brandFilter = null; state.hidden.clear();
  await loadProject(e.target.value);
  render();
});
$('#newProjectBtn').addEventListener('click', newProjectDialog);
$('#rangeSelect').addEventListener('change', (e) => { state.range = Number(e.target.value); render(); });
$('#providerFilter').addEventListener('change', (e) => { state.provider = e.target.value; render(); });
$('#tagFilter').addEventListener('change', (e) => { state.tag = e.target.value; render(); });
$('#runBtn').addEventListener('click', async () => {
  try { await api(`/api/projects/${state.project.id}/runs`, { method: 'POST' }); setRunning(true); } catch (e) { alert(e.message); }
});

boot().catch((e) => { $('#view').innerHTML = `<div class="card empty">Could not reach the server: ${esc(e.message)}</div>`; });
window.addEventListener('hashchange', () => {
  const tab = location.hash.slice(1);
  if (views[tab] && tab !== state.tab) setTab(tab);
});
