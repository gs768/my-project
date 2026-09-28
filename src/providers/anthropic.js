// Claude via the Anthropic SDK with the server-side web search tool.
import Anthropic from '@anthropic-ai/sdk';

export function anthropicProvider({ apiKey, model, fetch }) {
  const client = new Anthropic({ apiKey, ...(fetch ? { fetch } : {}) });

  return {
    id: 'anthropic',
    label: 'Claude',
    model,
    async ask(prompt, { country } = {}) {
      const tool = { type: 'web_search_20260209', name: 'web_search', max_uses: 5 };
      if (country) tool.user_location = { type: 'approximate', country };
      const messages = [{ role: 'user', content: prompt }];
      const content = [];
      let response;
      // Long server-tool turns can pause; resume a few times before giving up.
      for (let i = 0; i < 4; i++) {
        response = await client.beta.messages.create({
          model,
          max_tokens: 16000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          tools: [tool],
          messages,
        });
        content.push(...response.content);
        if (response.stop_reason !== 'pause_turn') break;
        messages.push({ role: 'assistant', content: response.content });
      }
      if (response.stop_reason === 'refusal') {
        throw new Error(`Claude declined the prompt (${response.stop_details?.category || 'refusal'})`);
      }

      const texts = [];
      const cited = [];
      const searched = [];
      for (const block of content) {
        if (block.type === 'text') {
          texts.push(block.text);
          for (const c of block.citations || []) {
            if (c.type === 'web_search_result_location') cited.push({ url: c.url, title: c.title });
          }
        } else if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
          for (const r of block.content) if (r.type === 'web_search_result') searched.push({ url: r.url, title: r.title });
        }
      }
      // Sources Claude actually cited rank ahead of results it only looked at.
      return { text: texts.join(''), citations: [...cited, ...searched], model: response.model || model };
    },
  };
}
