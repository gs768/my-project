// ChatGPT via the OpenAI Responses API with the hosted web search tool.
export function openaiProvider({ apiKey, model }) {
  return {
    id: 'openai',
    label: 'ChatGPT',
    model,
    async ask(prompt, { country } = {}) {
      const tool = { type: 'web_search' };
      if (country) tool.user_location = { type: 'approximate', country };
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, input: prompt, tools: [tool] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${body?.error?.message || res.statusText}`);
      const texts = [];
      const citations = [];
      for (const item of body.output || []) {
        if (item.type !== 'message') continue;
        for (const part of item.content || []) {
          if (part.type !== 'output_text') continue;
          texts.push(part.text);
          for (const a of part.annotations || []) {
            if (a.type === 'url_citation') citations.push({ url: a.url, title: a.title });
          }
        }
      }
      return { text: texts.join('\n\n'), citations, model: body.model || model };
    },
  };
}
