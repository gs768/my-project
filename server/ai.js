// AI drafting for review replies and Google posts, via the Claude API.
// Falls back to the best-matching template when ANTHROPIC_API_KEY is not set.
import Anthropic from '@anthropic-ai/sdk';
import { fillTemplate } from './db.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';
let client = null;

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

async function complete(system, prompt, maxTokens = 2000) {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    // Re-run declined requests on Anthropic's recommended fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  if (res.stop_reason === 'refusal') throw new Error('The model declined to draft this response');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('Empty response from model');
  return text;
}

export function firstName(author) {
  const n = String(author || '').trim().split(/\s+/)[0];
  return !n || /^(anonymous|google)$/i.test(n) ? 'there' : n;
}

export function templateReply(templates, review, location) {
  const t = templates.find((t) => t.kind === 'reply' && review.rating >= t.min_rating && review.rating <= t.max_rating);
  if (!t) return '';
  return fillTemplate(t.body, { first_name: firstName(review.author), location: location.name, phone: location.phone || 'our team' });
}

export async function draftReply({ review, location, client: brand, templates }) {
  if (!aiEnabled()) return templateReply(templates, review, location);
  const system = [
    'You write public owner replies to online reviews for a local business.',
    'Write in the first person plural as the business. Keep it to 2-4 sentences, warm and specific to what the reviewer said.',
    'Never invent facts, offers, names of staff, or policies that are not in the review or brand notes.',
    'For negative reviews: acknowledge, apologize without admitting liability, and invite them to continue the conversation offline using the contact details provided.',
    'Do not mention star ratings, do not use hashtags or emojis, and do not include a subject line. Return only the reply text.',
  ].join(' ');
  const prompt = [
    `Business: ${location.name}${location.address ? ` (${location.address})` : ''}`,
    location.phone ? `Contact phone: ${location.phone}` : '',
    brand?.brand_voice ? `Brand voice notes: ${brand.brand_voice}` : '',
    brand?.signature ? `Sign off with: ${brand.signature}` : '',
    '',
    `Reviewer: ${review.author || 'Anonymous'}`,
    `Rating: ${review.rating}/5`,
    `Review: ${review.body ? `"""${review.body}"""` : '(no text, rating only)'}`,
  ].filter((l) => l !== '').join('\n');
  return complete(system, prompt);
}

export async function draftPost({ topic, client: brand, locationNames }) {
  if (!aiEnabled()) throw new Error('Set ANTHROPIC_API_KEY to generate posts with AI');
  const system = 'You write Google Business Profile update posts for local businesses. Posts are 60-250 words, plain text, friendly, with a clear reason to visit or call. No hashtags, no emojis, no phone numbers or URLs (those go in the call-to-action button). Return only the post text.';
  const prompt = [
    `Business: ${brand?.name || ''}`,
    locationNames?.length ? `Locations: ${locationNames.join(', ')}` : '',
    brand?.brand_voice ? `Brand voice notes: ${brand.brand_voice}` : '',
    `Post topic: ${topic}`,
  ].filter(Boolean).join('\n');
  return complete(system, prompt);
}
