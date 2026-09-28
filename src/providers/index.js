import { config } from '../config.js';
import { openaiProvider } from './openai.js';
import { anthropicProvider } from './anthropic.js';
import { geminiProvider } from './gemini.js';
import { perplexityProvider } from './perplexity.js';
import { mockProvider, MOCK_ENGINES } from './mock.js';

const REAL = [
  { id: 'openai', label: 'ChatGPT', make: openaiProvider },
  { id: 'anthropic', label: 'Claude', make: anthropicProvider },
  { id: 'gemini', label: 'Gemini', make: geminiProvider },
  { id: 'perplexity', label: 'Perplexity', make: perplexityProvider },
];

const cache = new Map();

/** Every engine the app knows about, with whether it is usable right now. */
export function listProviders() {
  return [
    ...REAL.map((p) => ({ id: p.id, label: p.label, model: config.models[p.id], available: !!config.keys[p.id], mock: false })),
    ...MOCK_ENGINES.map((m) => ({ ...m, available: true, mock: true })),
  ];
}

export function getProvider(id) {
  if (cache.has(id)) return cache.get(id);
  let p;
  const real = REAL.find((r) => r.id === id);
  if (real) {
    if (!config.keys[id]) throw new Error(`No API key configured for ${real.label}`);
    p = real.make({ apiKey: config.keys[id], model: config.models[id] });
  } else {
    const m = MOCK_ENGINES.find((e) => e.id === id);
    if (!m) throw new Error(`Unknown provider: ${id}`);
    p = mockProvider(m);
  }
  cache.set(id, p);
  return p;
}

/** Default engine set for a new project: every real engine with a key, else the demo engines. */
export function defaultProviderIds() {
  const real = REAL.filter((p) => config.keys[p.id]).map((p) => p.id);
  return real.length ? real : MOCK_ENGINES.map((m) => m.id);
}
