import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMentions, lexiconSentiment, collectCitations, classifySource, normalizeDomain } from '../src/analysis.js';

const brands = [
  { id: 1, name: 'Acme', aliases: ['Acme CRM'], domain: 'acme.com', is_own: true },
  { id: 2, name: 'HubSpot', aliases: [], domain: 'hubspot.com', is_own: false },
  { id: 3, name: 'Monday.com', aliases: ['monday'], domain: 'monday.com', is_own: false },
];

test('detects mentions in order of first appearance', () => {
  const text = 'Top picks: 1. HubSpot is great. 2. Acme CRM is affordable. Many also like Acme.';
  const m = detectMentions(text, brands);
  assert.deepEqual(m.map((x) => [x.brandId, x.position, x.count]), [[2, 1, 1], [1, 2, 2]]);
});

test('overlapping aliases count once and word boundaries are respected', () => {
  const m = detectMentions('Acme CRM rocks. Acmeville is a town.', brands);
  assert.equal(m.length, 1);
  assert.equal(m[0].count, 1);
});

test('mentions inside URLs are ignored', () => {
  const m = detectMentions('Read more at https://www.hubspot.com/blog/acme-review', brands);
  assert.equal(m.length, 0);
});

test('brand names with punctuation match', () => {
  const m = detectMentions('Consider Monday.com, or monday for short.', brands);
  assert.equal(m[0].brandId, 3);
  assert.equal(m[0].count, 2);
});

test('lexicon sentiment scores only sentences naming the brand', () => {
  const text = 'Acme is the best and most reliable option. HubSpot is expensive and complex.';
  assert.ok(lexiconSentiment(text, brands[0]) > 60);
  assert.ok(lexiconSentiment(text, brands[1]) < 40);
  assert.equal(lexiconSentiment('Acme exists.', brands[0]), 50);
});

test('citations merge provider sources and inline URLs, strip utm, dedupe', () => {
  const c = collectCitations(
    [{ url: 'https://www.g2.com/x?utm_source=chatgpt.com', title: 'G2' }],
    'See https://www.g2.com/x and https://reddit.com/r/crm.',
  );
  assert.deepEqual(c.map((x) => [x.domain, x.rank]), [['g2.com', 1], ['reddit.com', 2]]);
});

test('source classification', () => {
  assert.equal(classifySource('blog.acme.com', brands), 'own');
  assert.equal(classifySource('hubspot.com', brands), 'competitor');
  assert.equal(classifySource('www.reddit.com', brands), 'ugc');
  assert.equal(classifySource('en.wikipedia.org', brands), 'reference');
  assert.equal(classifySource('nasa.gov', brands), 'institutional');
  assert.equal(classifySource('example.org', brands), 'other');
  assert.equal(normalizeDomain('https://WWW.Example.com/path'), 'example.com');
});
