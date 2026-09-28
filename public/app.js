// LocalDesk single-page app (no build step).
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const view = $('#view');
let STATUS = {};

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && path !== '/login') { showLogin(); throw new Error('Not signed in'); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3500);
}

const modal = {
  open(html, bind) {
    $('#modal-body').innerHTML = html;
    $('#modal').showModal();
    $$('[data-close]', $('#modal')).forEach((b) => b.addEventListener('click', () => modal.close()));
    bind?.($('#modal-body'));
  },
  close() { $('#modal').close(); },
};

function stars(n) {
  const full = Math.round(n || 0);
  return `<span class="stars" aria-label="${n} stars">${'★'.repeat(full)}<span class="off">${'★'.repeat(5 - full)}</span></span>`;
}
const fmtDate = (s) => (s ? new Date(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const fmtDateTime = (s) => (s ? new Date(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const num = (n, d = 0) => (n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }));
const statusBadge = (s) => {
  const cls = { replied: 'good', published: 'good', sent: 'good', clicked: 'good', new: 'warn', drafted: '', scheduled: '', partial: 'warn', failed: 'bad', ignored: '' }[s] ?? '';
  return `<span class="badge ${cls}">${esc(s)}</span>`;
};
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const reviewRows = new Map();
let clientsCache = null;
let locationsCache = null;
async function clients(force) { if (force || !clientsCache) clientsCache = await api('/clients'); return clientsCache; }
async function locations(force) { if (force || !locationsCache) locationsCache = await api('/locations'); return locationsCache; }
function invalidate() { clientsCache = null; locationsCache = null; }

function clientOptions(list, selected, allLabel = 'All clients') {
  return `<option value="">${allLabel}</option>${list.map((c) => `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`;
}
function locationOptions(list, selected, allLabel = 'All locations') {
  return `${allLabel ? `<option value="">${allLabel}</option>` : ''}${list.map((l) => `<option value="${l.id}" ${String(l.id) === String(selected) ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}`;
}

function kpi(label, value, sub = '') {
  return `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>`;
}

function distribution(dist) {
  const max = Math.max(1, ...dist);
  return `<div class="bars">${[5, 4, 3, 2, 1].map((s) => `<div class="bar"><span>${s}★</span><div class="track"><div class="fill" style="width:${(dist[s - 1] / max) * 100}%"></div></div><span class="muted">${dist[s - 1]}</span></div>`).join('')}</div>`;
}

function columnChart(rows, key, label) {
  if (!rows.length) return '<p class="muted">No data for this period.</p>';
  const w = 600, h = 180, pad = 22;
  const max = Math.max(1, ...rows.map((r) => r[key] || 0));
  const bw = (w - pad) / rows.length;
  const cols = rows.map((r, i) => {
    const bh = ((r[key] || 0) / max) * (h - pad * 2);
    return `<rect class="col" x="${pad + i * bw + bw * 0.15}" y="${h - pad - bh}" width="${bw * 0.7}" height="${bh}" rx="3"><title>${esc(r.month)}: ${r[key]} ${label}</title></rect>
      <text x="${pad + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${esc(r.month.slice(2))}</text>
      <text x="${pad + i * bw + bw / 2}" y="${h - pad - bh - 4}" text-anchor="middle">${r[key]}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(label)} by month">${cols}</svg>`;
}

// ---------------- Views ----------------

async function dashboardView() {
  const d = await api('/dashboard');
  const p = d.report.period;
  const m = d.report.metrics;
  view.innerHTML = `
    <div class="page-head"><div><h1>Dashboard</h1><p class="muted">Last 30 days across ${d.counts.clients} clients and ${d.counts.locations} locations</p></div>
      <button class="btn" id="sync-all">Sync now</button></div>
    <div class="grid kpis">
      ${kpi('New reviews', num(p.count))}
      ${kpi('Avg rating (30d)', p.avg_rating ?? '—', `Lifetime ${d.report.lifetime.avg_rating ?? '—'} from ${num(d.report.lifetime.count)}`)}
      ${kpi('Response rate', p.response_rate == null ? '—' : `${p.response_rate}%`)}
      ${kpi('Avg response time', p.avg_response_hours == null ? '—' : `${num(p.avg_response_hours, 1)}h`)}
      ${kpi('Unanswered', num(d.report.lifetime.unanswered), 'all time')}
      ${m.impressions != null ? kpi('Profile views', num(m.impressions), `${num(m.calls)} calls · ${num(m.website_clicks)} site clicks`) : ''}
    </div>
    <div class="grid two">
      <div class="card"><div class="row"><h2>Needs attention</h2><span class="spacer"></span><a href="#/reviews?status=open">Open inbox →</a></div>
        ${d.attention.length ? d.attention.map(reviewSummary).join('') : '<p class="empty">Inbox zero. Nice.</p>'}</div>
      <div class="card"><h2>Recent activity</h2>
        ${d.activity.length ? `<ul class="list-plain">${d.activity.map((a) => `<li><span class="badge">${esc(a.kind)}</span> ${esc(a.message)} <span class="muted small">· ${fmtDateTime(a.created_at)}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}
        <p class="muted small">${d.upcoming_posts} post(s) scheduled.</p></div>
    </div>`;
  $('#sync-all').onclick = async (e) => {
    e.target.disabled = true;
    try { await api('/sync', { body: {} }); toast('Sync complete'); route(); } catch (err) { toast(err.message); e.target.disabled = false; }
  };
}

function reviewSummary(r) {
  return `<div class="review"><div class="meta">${stars(r.rating)} <strong>${esc(r.author)}</strong> <span class="muted small">${esc(r.location_name)} · ${fmtDate(r.created_at)}</span></div>
    <div class="body">${esc((r.body || '(rating only)').slice(0, 180))}${r.body?.length > 180 ? '…' : ''}</div>
    <a class="btn sm" href="#/reviews?review=${r.id}">Respond</a></div>`;
}

async function reviewsView(params) {
  const [cl, locs] = await Promise.all([clients(), locations()]);
  const f = { client_id: params.get('client_id') || '', location_id: params.get('location_id') || '', status: params.get('status') ?? 'open', rating: params.get('rating') || '', source: params.get('source') || '', q: params.get('q') || '', offset: Number(params.get('offset') || 0) };
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v !== 0));
  if (params.get('review')) qs.set('status', '');
  const data = await api(`/reviews?${qs}&limit=25`);
  let rows = data.rows;
  rows.forEach((r) => reviewRows.set(String(r.id), r));
  if (params.get('review')) rows = rows.filter((r) => String(r.id) === params.get('review')).concat(rows.filter((r) => String(r.id) !== params.get('review')));
  const locList = f.client_id ? locs.filter((l) => String(l.client_id) === f.client_id) : locs;
  view.innerHTML = `
    <div class="page-head"><div><h1>Reviews</h1><p class="muted">${num(data.total)} matching</p></div>
      <button class="btn" id="add-review">Log a review manually</button></div>
    <form class="filters" id="filters">
      <select name="client_id">${clientOptions(cl, f.client_id)}</select>
      <select name="location_id">${locationOptions(locList, f.location_id)}</select>
      <select name="status">
        ${[['open', 'Needs reply'], ['', 'All statuses'], ['replied', 'Replied'], ['ignored', 'Ignored']].map(([v, l]) => `<option value="${v}" ${f.status === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <select name="rating">
        ${[['', 'All ratings'], ['1,2', '1–2★ (negative)'], ['3', '3★'], ['4,5', '4–5★ (positive)']].map(([v, l]) => `<option value="${v}" ${f.rating === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <select name="source">${[['', 'All sources'], ['google', 'Google'], ['facebook', 'Facebook'], ['yelp', 'Yelp'], ['other', 'Other']].map(([v, l]) => `<option value="${v}" ${f.source === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input name="q" placeholder="Search text or author" value="${esc(f.q)}">
    </form>
    <div class="card" id="review-list">${rows.length ? rows.map(reviewCard).join('') : '<p class="empty">No reviews match these filters.</p>'}</div>
    <div class="row" style="margin-top:12px">
      ${f.offset > 0 ? `<button class="btn" data-page="${Math.max(0, f.offset - 25)}">← Newer</button>` : ''}
      <span class="spacer"></span>
      ${f.offset + 25 < data.total ? `<button class="btn" data-page="${f.offset + 25}">Older →</button>` : ''}
    </div>`;

  const form = $('#filters');
  const apply = (offset = 0) => {
    const p = new URLSearchParams([...new FormData(form)]);
    if (offset) p.set('offset', offset);
    location.hash = `#/reviews?${p}`;
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'client_id') form.location_id.value = ''; apply(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  $$('[data-page]').forEach((b) => b.addEventListener('click', () => apply(Number(b.dataset.page))));
  $('#add-review').onclick = () => manualReviewModal(locs);
  bindReviewCards($('#review-list'));
}

function reviewCard(r) {
  return `<div class="review" data-id="${r.id}">
    <div class="meta">${stars(r.rating)} <strong>${esc(r.author)}</strong> ${statusBadge(r.status)} <span class="badge">${esc(r.source)}</span>
      <span class="muted small">${esc(r.client_name)} · ${esc(r.location_name)} · ${fmtDate(r.created_at)}</span></div>
    <div class="body">${r.body ? esc(r.body) : '<span class="muted">(rating only, no text)</span>'}</div>
    ${r.reply_body ? `<div class="reply"><strong class="small">Owner reply · ${fmtDate(r.replied_at)}</strong>\n${esc(r.reply_body)}</div>` : `
      <div class="composer">
        <textarea placeholder="Write a reply…">${esc(r.draft_reply || '')}</textarea>
        <div class="row" style="margin-top:8px">
          <button class="btn" data-act="draft">${STATUS.ai ? '✨ Draft with AI' : 'Use template'}</button>
          <button class="btn primary" data-act="reply">${r.source === 'google' && !STATUS.demo ? 'Post reply to Google' : 'Save reply'}</button>
          <span class="spacer"></span>
          ${r.status === 'ignored' ? '<button class="link" data-act="unignore">Restore</button>' : '<button class="link" data-act="ignore">Ignore</button>'}
        </div>
      </div>`}
  </div>`;
}

function bindReviewCards(root) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.review');
    const id = card.dataset.id;
    const ta = $('textarea', card);
    btn.disabled = true;
    try {
      if (btn.dataset.act === 'draft') {
        btn.textContent = 'Drafting…';
        const { draft } = await api(`/reviews/${id}/draft`, { body: {} });
        ta.value = draft;
        ta.focus();
      } else if (btn.dataset.act === 'reply') {
        const r = await api(`/reviews/${id}/reply`, { body: { body: ta.value } });
        toast('Reply posted');
        const merged = { ...reviewRows.get(id), ...r };
        reviewRows.set(id, merged);
        card.outerHTML = reviewCard(merged);
      } else {
        await api(`/reviews/${id}/status`, { body: { status: btn.dataset.act === 'ignore' ? 'ignored' : 'new' } });
        card.remove();
      }
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; if (btn.dataset.act === 'draft') btn.textContent = STATUS.ai ? '✨ Draft with AI' : 'Use template'; }
  });
}

function manualReviewModal(locs) {
  modal.open(`<h2>Log a review</h2><p class="muted small">For platforms LocalDesk doesn't sync automatically (Facebook, Yelp, etc.). Replies to these are saved here only.</p>
    <form id="mr"><div class="form-grid">
      <label class="field"><span>Location</span><select name="location_id" required>${locationOptions(locs, '', '')}</select></label>
      <label class="field"><span>Source</span><select name="source"><option>facebook</option><option>yelp</option><option>tripadvisor</option><option>other</option></select></label>
      <label class="field"><span>Reviewer</span><input name="author"></label>
      <label class="field"><span>Rating</span><select name="rating">${[5, 4, 3, 2, 1].map((n) => `<option>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Date</span><input type="date" name="created_at" value="${today()}"></label>
    </div>
    <label class="field"><span>Review text</span><textarea name="body"></textarea></label>
    <div class="row"><span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`, (root) => {
    $('#mr', root).onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/reviews', { body: Object.fromEntries(new FormData(e.target)) }); modal.close(); toast('Review logged'); route(); } catch (err) { toast(err.message); }
    };
  });
}

async function postsView() {
  const [posts, cl, locs] = await Promise.all([api('/posts'), clients(), locations()]);
  view.innerHTML = `
    <div class="page-head"><div><h1>Posts</h1><p class="muted">Publish or schedule Google Business Profile updates to one or many locations.</p></div>
      <button class="btn primary" id="new-post">New post</button></div>
    <div class="card table-wrap">${posts.length ? `<table><thead><tr><th>When</th><th>Client</th><th>Post</th><th>Locations</th><th>Status</th><th></th></tr></thead><tbody>
      ${posts.map((p) => `<tr><td>${fmtDateTime(p.scheduled_at)}</td><td>${esc(p.client_name || '')}</td>
        <td>${esc(p.body.slice(0, 120))}${p.body.length > 120 ? '…' : ''}${p.cta_type ? `<div class="muted small">Button: ${esc(p.cta_type)}</div>` : ''}</td>
        <td>${p.targets.map((t) => `<div class="small">${esc(t.location_name)} ${statusBadge(t.status)}${t.error ? ` <span class="muted" title="${esc(t.error)}">⚠</span>` : ''}</div>`).join('')}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${p.status === 'scheduled' ? `<button class="btn sm danger" data-del="${p.id}">Cancel</button>` : ''}</td></tr>`).join('')}
    </tbody></table>` : '<p class="empty">No posts yet.</p>'}</div>`;
  $('#new-post').onclick = () => postModal(cl, locs);
  $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Cancel this scheduled post?')) return;
    await api(`/posts/${b.dataset.del}`, { method: 'DELETE' });
    route();
  }));
}

function postModal(cl, locs) {
  modal.open(`<h2>New Google post</h2><form id="pf">
    <label class="field"><span>Client</span><select name="client_id" required>${clientOptions(cl, '', 'Choose client…')}</select></label>
    <div class="field"><span class="muted small">Locations</span><div id="loc-checks" class="muted small">Choose a client first.</div></div>
    <label class="field"><span>Post type</span><select name="topic_type"><option value="STANDARD">Update</option><option value="OFFER">Offer</option><option value="EVENT">Event</option></select></label>
    <label class="field"><span>Text <span id="count"></span></span><textarea name="body" maxlength="1500" required style="min-height:140px"></textarea></label>
    ${STATUS.ai ? '<div class="row" style="margin:-4px 0 12px"><input id="topic" placeholder="Topic, e.g. Fall AC tune-up special" style="flex:1"><button type="button" class="btn" id="gen">✨ Write with AI</button></div>' : ''}
    <div class="form-grid">
      <label class="field"><span>Button</span><select name="cta_type"><option value="">None</option><option value="LEARN_MORE">Learn more</option><option value="BOOK">Book</option><option value="ORDER">Order online</option><option value="SHOP">Buy</option><option value="SIGN_UP">Sign up</option><option value="CALL">Call now</option></select></label>
      <label class="field"><span>Button URL</span><input name="cta_url" type="url" placeholder="https://"></label>
      <label class="field"><span>Image URL (optional)</span><input name="image_url" type="url" placeholder="https://…/photo.jpg"></label>
      <label class="field"><span>Schedule (blank = now)</span><input name="scheduled_at" type="datetime-local"></label>
    </div>
    <div class="row"><span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save post</button></div></form>`, (root) => {
    const form = $('#pf', root);
    form.client_id.onchange = () => {
      const list = locs.filter((l) => String(l.client_id) === form.client_id.value);
      $('#loc-checks', root).innerHTML = list.length ? list.map((l) => `<label class="check"><input type="checkbox" name="loc" value="${l.id}" checked> ${esc(l.name)}${l.gbp_name ? '' : ' <span class="badge warn">not linked to Google</span>'}</label>`).join('') : 'This client has no locations.';
    };
    form.body.oninput = () => { $('#count', root).textContent = `(${form.body.value.length}/1500)`; };
    const gen = $('#gen', root);
    if (gen) gen.onclick = async () => {
      gen.disabled = true; gen.textContent = 'Writing…';
      try {
        const { body } = await api('/posts/generate', { body: { client_id: form.client_id.value, topic: $('#topic', root).value, location_ids: $$('input[name=loc]:checked', root).map((c) => Number(c.value)) } });
        form.body.value = body; form.body.oninput();
      } catch (err) { toast(err.message); }
      gen.disabled = false; gen.textContent = '✨ Write with AI';
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      const payload = { ...fd, location_ids: $$('input[name=loc]:checked', root).map((c) => Number(c.value)), scheduled_at: fd.scheduled_at ? new Date(fd.scheduled_at).toISOString() : '' };
      delete payload.loc;
      try { await api('/posts', { body: payload }); modal.close(); toast(payload.scheduled_at ? 'Post scheduled' : 'Post published'); route(); } catch (err) { toast(err.message); }
    };
  });
}

async function requestsView(params) {
  const tab = params.get('tab') || 'send';
  const locs = await locations();
  const [reqs, fb] = await Promise.all([api('/requests'), api('/feedback')]);
  const channelNote = (!STATUS.sms && !STATUS.email && !STATUS.demo) ? '<p class="badge warn">Configure Twilio or SMTP in .env to send requests.</p>' : '';
  view.innerHTML = `
    <div class="page-head"><div><h1>Review requests</h1><p class="muted">Ask customers for reviews by SMS or email. Every customer is offered the Google review link.</p></div></div>
    <div class="row" style="margin-bottom:16px">
      ${[['send', 'Send'], ['history', `History (${reqs.length})`], ['feedback', `Private feedback (${fb.length})`], ['links', 'Links & QR codes']].map(([k, l]) => `<a class="btn ${tab === k ? 'primary' : ''}" href="#/requests?tab=${k}">${l}</a>`).join('')}
    </div>
    <div id="tab"></div>`;
  const t = $('#tab');
  if (tab === 'send') {
    t.innerHTML = `<div class="grid two">
      <form class="card" id="single"><h2>Single request</h2>${channelNote}
        <label class="field"><span>Location</span><select name="location_id" required>${locationOptions(locs, '', '')}</select></label>
        <label class="field"><span>Channel</span><select name="channel"><option value="sms">SMS</option><option value="email">Email</option></select></label>
        <label class="field"><span>Customer name</span><input name="customer_name"></label>
        <label class="field"><span>Mobile (E.164, e.g. +15551234567)</span><input name="phone" type="tel"></label>
        <label class="field"><span>Email</span><input name="email" type="email"></label>
        <button class="btn primary">Send request</button></form>
      <form class="card" id="bulk"><h2>Bulk send</h2>
        <label class="field"><span>Location</span><select name="location_id" required>${locationOptions(locs, '', '')}</select></label>
        <label class="field"><span>Channel</span><select name="channel"><option value="sms">SMS</option><option value="email">Email</option></select></label>
        <label class="field"><span>Paste CSV: name,phone,email (one per line)</span><textarea name="csv" style="min-height:160px" placeholder="Jane Doe,+15551234567,jane@example.com"></textarea></label>
        <button class="btn primary">Send all</button><p class="muted small" id="bulk-result"></p></form></div>`;
    $('#single').onsubmit = async (e) => {
      e.preventDefault();
      try { const r = await api('/requests', { body: Object.fromEntries(new FormData(e.target)) }); toast(r.status === 'sent' ? 'Request sent' : `Failed: ${r.error}`); if (r.status === 'sent') e.target.reset(); } catch (err) { toast(err.message); }
    };
    $('#bulk').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button', e.target); btn.disabled = true;
      try { const r = await api('/requests/bulk', { body: Object.fromEntries(new FormData(e.target)) }); $('#bulk-result').textContent = `${r.sent} sent, ${r.failed} failed.`; } catch (err) { toast(err.message); }
      btn.disabled = false;
    };
  } else if (tab === 'history') {
    t.innerHTML = `<div class="card table-wrap">${reqs.length ? `<table><thead><tr><th>Date</th><th>Location</th><th>Customer</th><th>Channel</th><th>Status</th></tr></thead><tbody>
      ${reqs.map((r) => `<tr><td>${fmtDateTime(r.created_at)}</td><td>${esc(r.location_name)}</td><td>${esc(r.customer_name)}<div class="muted small">${esc(r.phone || r.email)}</div></td><td>${esc(r.channel)}</td><td>${statusBadge(r.status)}${r.error ? `<div class="muted small">${esc(r.error)}</div>` : ''}</td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">No requests sent yet.</p>'}</div>`;
  } else if (tab === 'feedback') {
    t.innerHTML = `<div class="card">${fb.length ? fb.map((f) => `<div class="review"><div class="meta"><strong>${esc(f.name || 'Anonymous')}</strong> <span class="muted small">${esc(f.contact)} · ${esc(f.location_name)} · ${fmtDateTime(f.created_at)}</span></div><div class="body">${esc(f.message)}</div></div>`).join('') : '<p class="empty">No private feedback yet.</p>'}</div>`;
  } else {
    t.innerHTML = `<div class="card table-wrap"><p class="muted">Share these links on receipts, email signatures or print the QR code for the counter.</p><table><thead><tr><th>Location</th><th>Review page</th><th>QR</th></tr></thead><tbody>
      ${locs.map((l) => { const url = `${STATUS.public_url}/l/${l.slug}`; return `<tr><td>${esc(l.name)}${l.place_id || l.review_url ? '' : ' <span class="badge warn">no Google place ID</span>'}</td><td><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></td>
        <td><a class="btn sm" target="_blank" rel="noopener" href="https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}">QR code</a></td></tr>`; }).join('')}
    </tbody></table></div>`;
  }
}

async function reportsView(params) {
  const [cl, locs] = await Promise.all([clients(), locations()]);
  const f = { client_id: params.get('client_id') || '', location_id: params.get('location_id') || '', from: params.get('from') || daysAgo(90), to: params.get('to') || today() };
  const r = await api(`/reports?${new URLSearchParams(Object.entries(f).filter(([, v]) => v))}`);
  const locList = f.client_id ? locs.filter((l) => String(l.client_id) === f.client_id) : locs;
  const p = r.period;
  const title = r.client ? r.client.name : 'All clients';
  view.innerHTML = `
    <div class="page-head no-print"><div><h1>Reports</h1></div>
      <form class="filters" id="rf" style="margin:0">
        <select name="client_id">${clientOptions(cl, f.client_id)}</select>
        <select name="location_id">${locationOptions(locList, f.location_id)}</select>
        <input type="date" name="from" value="${f.from}"> <input type="date" name="to" value="${f.to}">
        <button type="button" class="btn" id="print">Print / PDF</button>
      </form></div>
    <div class="row" style="margin-bottom:16px">${r.client?.logo_url ? `<img src="${esc(r.client.logo_url)}" alt="" style="max-height:44px">` : ''}
      <div><h2 style="margin:0">${esc(title)} — Reputation report</h2><div class="muted">${fmtDate(f.from)} – ${fmtDate(f.to)} · prepared by ${esc(STATUS.agency_name)}</div></div></div>
    <div class="grid kpis">
      ${kpi('New reviews', num(p.count))}
      ${kpi('Avg rating (period)', p.avg_rating ?? '—', `Lifetime ${r.lifetime.avg_rating ?? '—'} (${num(r.lifetime.count)} reviews)`)}
      ${kpi('Response rate', p.response_rate == null ? '—' : `${p.response_rate}%`)}
      ${kpi('Avg response time', p.avg_response_hours == null ? '—' : `${num(p.avg_response_hours, 1)}h`)}
      ${r.metrics.impressions != null ? kpi('Profile views', num(r.metrics.impressions)) + kpi('Calls', num(r.metrics.calls)) + kpi('Website clicks', num(r.metrics.website_clicks)) + kpi('Direction requests', num(r.metrics.directions)) : ''}
      ${r.requests.sent ? kpi('Review requests', num(r.requests.sent), `${r.requests.click_rate}% clicked`) : ''}
    </div>
    <div class="grid two" style="margin-bottom:16px">
      <div class="card"><h3>Reviews per month</h3>${columnChart(r.monthly, 'count', 'reviews')}</div>
      <div class="card"><h3>Rating distribution (period)</h3>${distribution(p.distribution)}</div>
    </div>
    <div class="card table-wrap"><h3>By location</h3><table><thead><tr><th>Location</th><th class="num">New reviews</th><th class="num">Avg (period)</th><th class="num">Avg (lifetime)</th><th class="num">Total reviews</th><th class="num">Response rate</th><th class="num">Unanswered</th></tr></thead><tbody>
      ${r.locations.map((l) => `<tr><td>${esc(l.name)}</td><td class="num">${num(l.period.count)}</td><td class="num">${l.period.avg_rating ?? '—'}</td><td class="num">${l.lifetime.avg_rating ?? '—'}</td><td class="num">${num(l.lifetime.count)}</td><td class="num">${l.period.response_rate == null ? '—' : `${l.period.response_rate}%`}</td><td class="num">${num(l.lifetime.unanswered)}</td></tr>`).join('')}
    </tbody></table></div>`;
  const form = $('#rf');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'client_id') form.location_id.value = '';
    location.hash = `#/reports?${new URLSearchParams([...new FormData(form)].filter(([, v]) => v))}`;
  });
  $('#print').onclick = () => window.print();
}

async function clientsView() {
  const [cl, locs] = await Promise.all([clients(true), locations(true)]);
  view.innerHTML = `
    <div class="page-head"><div><h1>Clients &amp; locations</h1></div>
      <div class="row"><button class="btn" id="add-client">Add client</button><button class="btn primary" id="add-loc">Add location</button></div></div>
    ${cl.length ? cl.map((c) => `<div class="card" style="margin-bottom:16px">
      <div class="row"><h2 style="margin:0">${esc(c.name)}</h2>
        <span class="muted">${c.location_count} location(s) · ${c.avg_rating ?? '—'}★ avg · ${c.review_count} reviews · ${c.open_count} open</span>
        <span class="spacer"></span><a class="btn sm" href="#/reports?client_id=${c.id}">Report</a><button class="btn sm" data-edit-client="${c.id}">Edit</button></div>
      <div class="table-wrap"><table style="margin-top:12px"><thead><tr><th>Location</th><th>Google</th><th class="num">Rating</th><th class="num">Reviews</th><th class="num">Open</th><th>Last sync</th><th></th></tr></thead><tbody>
        ${locs.filter((l) => l.client_id === c.id).map((l) => `<tr><td>${esc(l.name)}<div class="muted small">${esc(l.address)}</div></td>
          <td>${l.gbp_name ? '<span class="badge good">linked</span>' : '<span class="badge">manual</span>'}</td>
          <td class="num">${l.avg_rating ?? '—'}</td><td class="num">${l.review_count}</td><td class="num"><a href="#/reviews?location_id=${l.id}">${l.open_count}</a></td>
          <td class="small muted">${l.last_synced_at ? fmtDateTime(l.last_synced_at) : '—'}</td>
          <td class="row">${l.gbp_name ? `<button class="btn sm" data-sync="${l.id}">Sync</button>` : ''}<button class="btn sm" data-edit-loc="${l.id}">Edit</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No locations yet.</td></tr>'}
      </tbody></table></div></div>`).join('') : '<div class="card empty">No clients yet. Add one, or import locations from Google in Settings.</div>'}`;
  $('#add-client').onclick = () => clientModal({});
  $('#add-loc').onclick = () => (cl.length ? locationModal({}, cl) : toast('Add a client first'));
  $$('[data-edit-client]').forEach((b) => b.addEventListener('click', () => clientModal(cl.find((c) => String(c.id) === b.dataset.editClient))));
  $$('[data-edit-loc]').forEach((b) => b.addEventListener('click', () => locationModal(locs.find((l) => String(l.id) === b.dataset.editLoc), cl)));
  $$('[data-sync]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true; b.textContent = 'Syncing…';
    try { const r = await api('/sync', { body: { location_id: Number(b.dataset.sync) } }); toast(`${r.added} new review(s)`); invalidate(); route(); } catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Sync'; }
  }));
}

function clientModal(c) {
  modal.open(`<h2>${c.id ? 'Edit client' : 'New client'}</h2><form id="cf">
    <label class="field"><span>Name</span><input name="name" value="${esc(c.name)}" required></label>
    <label class="field"><span>Brand voice (guides AI replies)</span><textarea name="brand_voice" placeholder="e.g. Warm, professional, never salesy. Family-owned since 1987.">${esc(c.brand_voice)}</textarea></label>
    <div class="form-grid">
      <label class="field"><span>Reply sign-off</span><input name="signature" value="${esc(c.signature)}" placeholder="— The Team at …"></label>
      <label class="field"><span>Logo URL (reports & review page)</span><input name="logo_url" value="${esc(c.logo_url)}"></label>
      <label class="field"><span>Alert email</span><input name="alert_email" type="email" value="${esc(c.alert_email)}"></label>
      <label class="field"><span>Alert on reviews at or below</span><select name="alert_threshold">${[0, 1, 2, 3, 4].map((n) => `<option value="${n}" ${Number(c.alert_threshold ?? 3) === n ? 'selected' : ''}>${n ? `${n}★` : 'Never'}</option>`).join('')}</select></label>
    </div>
    <label class="check"><input type="checkbox" name="auto_reply_positive" ${c.auto_reply_positive ? 'checked' : ''}> Automatically reply to new 4–5★ reviews</label>
    <div class="row">${c.id ? '<button type="button" class="btn danger" id="del">Delete client</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`, (root) => {
    $('#cf', root).onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      body.auto_reply_positive = e.target.auto_reply_positive.checked ? 1 : 0;
      body.alert_threshold = Number(body.alert_threshold);
      try { await api(c.id ? `/clients/${c.id}` : '/clients', { method: c.id ? 'PUT' : 'POST', body }); modal.close(); invalidate(); route(); } catch (err) { toast(err.message); }
    };
    const del = $('#del', root);
    if (del) del.onclick = async () => {
      if (!confirm(`Delete ${c.name} and all its locations, reviews and posts? This cannot be undone.`)) return;
      await api(`/clients/${c.id}`, { method: 'DELETE' }); modal.close(); invalidate(); route();
    };
  });
}

function locationModal(l, cl) {
  modal.open(`<h2>${l.id ? 'Edit location' : 'New location'}</h2><form id="lf"><div class="form-grid">
    <label class="field"><span>Client</span><select name="client_id" required>${clientOptions(cl, l.client_id, 'Choose…')}</select></label>
    <label class="field"><span>Name</span><input name="name" value="${esc(l.name)}" required></label>
    <label class="field"><span>Address</span><input name="address" value="${esc(l.address)}"></label>
    <label class="field"><span>Phone</span><input name="phone" value="${esc(l.phone)}"></label>
    <label class="field"><span>Website</span><input name="website" value="${esc(l.website)}"></label>
    <label class="field"><span>Google place ID</span><input name="place_id" value="${esc(l.place_id)}" placeholder="ChIJ…"></label>
    <label class="field"><span>Custom review link (optional)</span><input name="review_url" value="${esc(l.review_url)}"></label>
    <label class="field"><span>GBP resource name</span><input name="gbp_name" value="${esc(l.gbp_name)}" placeholder="accounts/…/locations/…"></label>
    </div>
    <div class="row">${l.id ? '<button type="button" class="btn danger" id="del">Delete</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`, (root) => {
    $('#lf', root).onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      body.client_id = Number(body.client_id);
      try { await api(l.id ? `/locations/${l.id}` : '/locations', { method: l.id ? 'PUT' : 'POST', body }); modal.close(); invalidate(); route(); } catch (err) { toast(err.message); }
    };
    const del = $('#del', root);
    if (del) del.onclick = async () => {
      if (!confirm(`Delete ${l.name} and all its reviews? This cannot be undone.`)) return;
      await api(`/locations/${l.id}`, { method: 'DELETE' }); modal.close(); invalidate(); route();
    };
  });
}

async function settingsView(params) {
  STATUS = await api('/status');
  const templates = await api('/templates');
  const g = STATUS.google;
  const check = (ok, label, hint) => `<li>${ok ? '<span class="badge good">on</span>' : '<span class="badge">off</span>'} <strong>${label}</strong> <span class="muted small">${hint}</span></li>`;
  view.innerHTML = `
    <div class="page-head"><div><h1>Settings</h1></div></div>
    <div class="grid two" style="margin-bottom:16px">
      <div class="card"><h2>Google Business Profile</h2>
        ${!g.configured ? '<p>Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>.env</code>, then restart. See the README for Google Cloud setup.</p>'
          : g.connected ? `<p><span class="badge good">Connected</span></p><div class="row"><button class="btn primary" id="import">Import locations</button><button class="btn danger" id="disconnect">Disconnect</button></div>`
          : '<p class="muted">Connect the Google account that manages your clients\' profiles.</p><a class="btn primary" href="/api/google/connect">Connect Google</a>'}
        ${params.get('google') === 'connected' ? '<p class="badge good">Google connected — now import your locations.</p>' : ''}
      </div>
      <div class="card"><h2>Integrations</h2><ul class="list-plain">
        ${check(STATUS.ai, 'AI replies & posts', 'ANTHROPIC_API_KEY')}
        ${check(STATUS.sms, 'SMS review requests', 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM')}
        ${check(STATUS.email, 'Email review requests & alerts', 'SMTP_HOST / SMTP_FROM')}
        ${check(STATUS.slack, 'Slack alerts', 'SLACK_WEBHOOK_URL')}
      </ul>
      <label class="check" style="margin-top:12px"><input type="checkbox" id="demo" ${STATUS.demo ? 'checked' : ''}> Demo mode <span class="muted small">(replies, posts and requests are simulated, nothing is sent)</span></label></div>
    </div>
    <div class="card"><div class="row"><h2 style="margin:0">Templates</h2><span class="spacer"></span><button class="btn" id="add-tpl">Add template</button></div>
      <p class="muted small">Placeholders: {first_name} {location} {phone} {link}. Reply templates are used when AI is off; SMS/email templates are used for review requests (first of each kind).</p>
      <table><thead><tr><th>Kind</th><th>Name</th><th>Ratings</th><th>Body</th><th></th></tr></thead><tbody>
      ${templates.map((t) => `<tr><td><span class="badge">${esc(t.kind)}</span></td><td>${esc(t.name)}</td><td>${t.kind === 'reply' ? `${t.min_rating}–${t.max_rating}★` : ''}</td><td class="small">${esc(t.body.slice(0, 140))}${t.body.length > 140 ? '…' : ''}</td><td><button class="btn sm" data-tpl="${t.id}">Edit</button></td></tr>`).join('')}
      </tbody></table></div>`;
  $('#demo').onchange = async (e) => { await api('/settings/demo', { body: { enabled: e.target.checked } }); STATUS.demo = e.target.checked; $('#demo-badge').hidden = !STATUS.demo; toast(`Demo mode ${STATUS.demo ? 'on' : 'off'}`); };
  const imp = $('#import');
  if (imp) imp.onclick = importModal;
  const disc = $('#disconnect');
  if (disc) disc.onclick = async () => { if (confirm('Disconnect Google? Syncing and posting will stop.')) { await api('/google/disconnect', { body: {} }); route(); } };
  $('#add-tpl').onclick = () => templateModal({ kind: 'reply', min_rating: 1, max_rating: 5 });
  $$('[data-tpl]').forEach((b) => b.addEventListener('click', () => templateModal(templates.find((t) => String(t.id) === b.dataset.tpl))));
}

async function importModal() {
  modal.open('<h2>Import from Google</h2><p class="muted">Loading your locations…</p>');
  try {
    const [gl, cl] = await Promise.all([api('/google/locations'), clients(true)]);
    modal.open(`<h2>Import from Google</h2><form id="imp">
      <label class="field"><span>Assign to client</span><select name="client_id" required>${clientOptions(cl, '', 'Choose client…')}</select></label>
      <p class="muted small">Tip: create a client per brand first, then import each brand's locations into it.</p>
      <div style="max-height:320px;overflow:auto">${gl.map((l, i) => `<label class="check"><input type="checkbox" name="i" value="${i}" ${l.linked ? 'disabled' : ''}> ${esc(l.name)} <span class="muted small">${esc(l.address)} · ${esc(l.account)}</span>${l.linked ? ' <span class="badge">already added</span>' : ''}</label>`).join('') || '<p class="muted">No locations found on this Google account.</p>'}</div>
      <div class="row"><span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Import selected</button></div></form>`, (root) => {
      $('#imp', root).onsubmit = async (e) => {
        e.preventDefault();
        const items = $$('input[name=i]:checked', root).map((c) => gl[Number(c.value)]);
        try { const r = await api('/google/import', { body: { client_id: Number(e.target.client_id.value), items } }); modal.close(); invalidate(); toast(`Imported ${r.imported}. Syncing reviews…`); await api('/sync', { body: {} }); location.hash = '#/clients'; } catch (err) { toast(err.message); }
      };
    });
  } catch (err) { modal.close(); toast(err.message); }
}

function templateModal(t) {
  modal.open(`<h2>${t.id ? 'Edit template' : 'New template'}</h2><form id="tf"><div class="form-grid">
    <label class="field"><span>Kind</span><select name="kind">${['reply', 'sms', 'email'].map((k) => `<option ${t.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    <label class="field"><span>Name</span><input name="name" value="${esc(t.name)}" required></label>
    <label class="field"><span>Min rating</span><input name="min_rating" type="number" min="1" max="5" value="${t.min_rating}"></label>
    <label class="field"><span>Max rating</span><input name="max_rating" type="number" min="1" max="5" value="${t.max_rating}"></label></div>
    <label class="field"><span>Body</span><textarea name="body" required style="min-height:140px">${esc(t.body)}</textarea></label>
    <div class="row">${t.id ? '<button type="button" class="btn danger" id="del">Delete</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`, (root) => {
    $('#tf', root).onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      body.min_rating = Number(body.min_rating); body.max_rating = Number(body.max_rating);
      try { await api(t.id ? `/templates/${t.id}` : '/templates', { method: t.id ? 'PUT' : 'POST', body }); modal.close(); route(); } catch (err) { toast(err.message); }
    };
    const del = $('#del', root);
    if (del) del.onclick = async () => { if (confirm('Delete this template?')) { await api(`/templates/${t.id}`, { method: 'DELETE' }); modal.close(); route(); } };
  });
}

// ---------------- Router & boot ----------------
const ROUTES = { '': dashboardView, reviews: reviewsView, posts: postsView, requests: requestsView, reports: reportsView, clients: clientsView, settings: settingsView };

async function route() {
  const [pathPart, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const name = pathPart.split('/')[0];
  const fn = ROUTES[name] || dashboardView;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${name}`));
  try { await fn(new URLSearchParams(query)); } catch (err) { if (err.message !== 'Not signed in') view.innerHTML = `<div class="card error">${esc(err.message)}</div>`; }
}

function showLogin() {
  $('#shell').hidden = true;
  $('#login').hidden = false;
}

async function boot() {
  try { STATUS = await api('/status'); } catch { return; }
  $('#login').hidden = true;
  $('#shell').hidden = false;
  $('#brand').textContent = STATUS.agency_name;
  document.title = STATUS.agency_name;
  $('#demo-badge').hidden = !STATUS.demo;
  if (!boot.started) window.addEventListener('hashchange', route);
  boot.started = true;
  route();
}

$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  try { await api('/login', { body: { password: e.target.password.value } }); boot(); }
  catch (err) { $('#login-error').textContent = err.message; }
};
$('#logout').onclick = async () => { await api('/logout', { body: {} }); showLogin(); };

boot();
