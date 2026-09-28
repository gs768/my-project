// Perplexity Sonar (search-grounded chat completions).
export function perplexityProvider({ apiKey, model }) {
  return {
    id: 'perplexity',
    label: 'Perplexity',
    model,
    async ask(prompt, { country } = {}) {
      const body = { model, messages: [{ role: 'user', content: prompt }] };
      if (country) body.web_search_options = { user_location: { country } };
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Perplexity ${res.status}: ${data?.error?.message || res.statusText}`);
      const text = data.choices?.[0]?.message?.content || '';
      const citations = data.search_results?.length
        ? data.search_results.map((r) => ({ url: r.url, title: r.title }))
        : (data.citations || []).map((url) => ({ url }));
      return { text, citations, model: data.model || model };
    },
  };
}
