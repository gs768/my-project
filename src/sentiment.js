// Sentiment scoring: an optional Claude judge, with the lexicon scorer as the fallback.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { config } from './config.js';
import { lexiconSentiment } from './analysis.js';

const JudgeSchema = z.object({
  brands: z.array(z.object({ name: z.string(), sentiment: z.number() })),
});

let client;
const judgeEnabled = () =>
  config.keys.anthropic && (config.judge === 'anthropic' || config.judge === 'auto');

/**
 * Score how `text` portrays each mentioned brand, 0 (very negative) – 100 (very positive).
 * Returns Map<brandId, score>.
 */
export async function scoreSentiment(text, mentionedBrands, { mock = false } = {}) {
  const scores = new Map(mentionedBrands.map((b) => [b.id, lexiconSentiment(text, b)]));
  if (mock || !judgeEnabled() || mentionedBrands.length === 0) return scores;
  try {
    client ??= new Anthropic({ apiKey: config.keys.anthropic });
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system:
        'You rate how an AI assistant answer portrays specific brands. For each brand, give a sentiment ' +
        'score from 0 (very negative) to 100 (very positive); 50 means neutral or merely listed.',
      messages: [
        {
          role: 'user',
          content: `Brands: ${mentionedBrands.map((b) => b.name).join(', ')}\n\n<answer>\n${text}\n</answer>`,
        },
      ],
      output_config: { format: zodOutputFormat(JudgeSchema) },
    });
    for (const r of response.parsed_output?.brands || []) {
      const b = mentionedBrands.find((x) => x.name.toLowerCase() === r.name.toLowerCase());
      if (b) scores.set(b.id, Math.max(0, Math.min(100, Math.round(r.sentiment))));
    }
  } catch (err) {
    console.warn(`[sentiment] judge failed, using lexicon: ${err.message}`);
  }
  return scores;
}
