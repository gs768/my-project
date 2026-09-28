import test from 'node:test';
import assert from 'node:assert/strict';
import { anthropicProvider } from '../src/providers/anthropic.js';

test('Claude provider sends web search and parses citations, resuming pause_turn', async () => {
  const bodies = [];
  const replies = [
    { stop_reason: 'pause_turn', content: [{ type: 'web_search_tool_result', tool_use_id: 't', content: [{ type: 'web_search_result', url: 'https://g2.com/a', title: 'G2' }] }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Acme is great.', citations: [{ type: 'web_search_result_location', url: 'https://acme.com/', title: 'Acme', cited_text: 'x' }] }] },
  ];
  const fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    const r = replies.shift();
    return new Response(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5', usage: {}, ...r }), { headers: { 'content-type': 'application/json' } });
  };
  const p = anthropicProvider({ apiKey: 'k', model: 'claude-opus-5', fetch });
  const out = await p.ask('best crm', { country: 'US' });
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].tools[0].type, 'web_search_20260209');
  assert.equal(bodies[0].fallbacks, 'default');
  assert.equal(bodies[0].tools[0].user_location.country, 'US');
  assert.equal(bodies[1].messages.at(-1).role, 'assistant');
  assert.equal(out.text, 'Acme is great.');
  assert.deepEqual(out.citations.map((c) => c.url), ['https://acme.com/', 'https://g2.com/a']);
});
