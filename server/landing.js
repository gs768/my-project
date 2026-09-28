// Public, customer-facing review landing page. Every visitor is offered the
// public review link — no rating-based gating, which Google's policies forbid.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function page(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#16181d;--muted:#5d6470;--line:#e2e5ea;--accent:#1a73e8}
@media (prefers-color-scheme:dark){:root{--bg:#111316;--card:#1b1e23;--ink:#eceef1;--muted:#9aa1ac;--line:#2c3038;--accent:#6ea8ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:460px;margin:0 auto;padding:40px 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px}
.logo{max-height:56px;max-width:180px;margin-bottom:16px}
h1{font-size:1.4rem;margin:0 0 6px}p{color:var(--muted);margin:0 0 20px}
.btn{display:block;width:100%;text-align:center;padding:14px;border-radius:10px;font-weight:600;text-decoration:none;border:0;font-size:1rem;cursor:pointer}
.primary{background:var(--accent);color:#fff}
.secondary{background:transparent;color:var(--ink);border:1px solid var(--line);margin-top:12px}
details summary{list-style:none}details summary::-webkit-details-marker{display:none}
form{margin-top:16px;display:grid;gap:10px}
input,textarea{width:100%;padding:12px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit}
textarea{min-height:120px}
</style></head><body><main><div class="card">${inner}</div></main></body></html>`;
}

export function renderLanding({ location, client, token, slug, googleLink }) {
  const t = token ? `?t=${encodeURIComponent(token)}` : '';
  return page(`Review ${location.name}`, `
    ${client?.logo_url ? `<img class="logo" src="${esc(client.logo_url)}" alt="">` : ''}
    <h1>How was your experience at ${esc(location.name)}?</h1>
    <p>Your feedback helps us improve and helps neighbors find us. It only takes a moment.</p>
    ${googleLink ? `<a class="btn primary" href="/go/${esc(slug)}${t}">Leave a review on Google</a>` : ''}
    <details>
      <summary class="btn secondary">Send a private message to the team</summary>
      <form method="post" action="/feedback/${esc(slug)}">
        <input type="hidden" name="t" value="${esc(token)}">
        <input name="name" placeholder="Your name (optional)" autocomplete="name">
        <input name="contact" placeholder="Email or phone (optional)">
        <textarea name="message" required placeholder="What should we know?"></textarea>
        <button class="btn primary" type="submit">Send message</button>
      </form>
    </details>`);
}

export function renderThanks(location) {
  return page('Thank you', `<h1>Thank you!</h1><p>Your message has been sent to the team at ${esc(location.name)}. We appreciate you taking the time.</p>`);
}
