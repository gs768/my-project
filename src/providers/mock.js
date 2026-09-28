// Deterministic fake engines, so the dashboard can be explored without API keys.
// Each simulated engine has its own "bias" per brand, which drifts slowly over time.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed) {
  let s = seed || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)), (s >>> 0) / 4294967296);
}

const PRAISE = ['is a popular choice', 'is widely recommended', 'stands out for its intuitive interface', 'is known for reliable performance', 'offers a comprehensive feature set', 'is a strong option for growing teams'];
const CRITIQUE = ['can be expensive for small teams', 'has a steep learning curve', 'lacks some advanced integrations', 'has had complaints about support'];
const GENERIC_SOURCES = ['reddit.com', 'g2.com', 'capterra.com', 'en.wikipedia.org', 'youtube.com', 'forbes.com', 'techradar.com', 'medium.com', 'trustradius.com', 'zapier.com/blog'];

export function mockProvider({ id, label, model }) {
  return {
    id,
    label,
    model,
    mock: true,
    async ask(prompt, { brands = [], day = new Date().toISOString().slice(0, 10) } = {}) {
      const r = rng(hash(`${id}|${prompt}|${day}`));
      const t = Date.parse(day) / 86400000;
      const scored = brands.map((b) => {
        const bias = (hash(`${id}|${b.name}`) % 100) / 100;
        const drift = Math.sin(t / 9 + (hash(b.name) % 7)) * 0.15 + (b.is_own ? (t % 365) * 0.0012 : 0);
        return { b, score: bias + drift + r() * 0.6 };
      });
      scored.sort((a, b) => b.score - a.score);
      const shown = scored.filter((s, i) => i < 2 || s.score > 0.75).slice(0, 6);

      const lines = [`Here are some of the options worth considering for "${prompt}":`, ''];
      shown.forEach(({ b }, i) => {
        const good = PRAISE[Math.floor(r() * PRAISE.length)];
        const bad = r() < 0.35 ? `, but it ${CRITIQUE[Math.floor(r() * CRITIQUE.length)]}` : '';
        lines.push(`${i + 1}. **${b.name}** ${good}${bad}.`);
      });
      lines.push('', 'The right pick depends on your budget, team size and the integrations you need.');

      const citations = [];
      for (const { b } of shown.slice(0, 3)) if (b.domain && r() < 0.6) citations.push({ url: `https://${b.domain}/`, title: b.name });
      const n = 2 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const d = GENERIC_SOURCES[Math.floor(r() * GENERIC_SOURCES.length)];
        citations.push({ url: `https://${d}/${encodeURIComponent(prompt.toLowerCase().split(/\s+/).slice(0, 4).join('-'))}`, title: d });
      }
      return { text: lines.join('\n'), citations, model };
    },
  };
}

export const MOCK_ENGINES = [
  { id: 'mock-chatgpt', label: 'ChatGPT (demo)', model: 'demo' },
  { id: 'mock-claude', label: 'Claude (demo)', model: 'demo' },
  { id: 'mock-gemini', label: 'Gemini (demo)', model: 'demo' },
  { id: 'mock-perplexity', label: 'Perplexity (demo)', model: 'demo' },
];
