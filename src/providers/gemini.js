// Google Gemini with Google Search grounding (the closest API proxy for AI Overviews / AI Mode).
export function geminiProvider({ apiKey, model }) {
  return {
    id: 'gemini',
    label: 'Gemini',
    model,
    async ask(prompt) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message || res.statusText}`);
      const cand = data.candidates?.[0];
      const text = (cand?.content?.parts || []).map((p) => p.text || '').join('');
      // Grounding URIs are Google redirect links; the chunk title carries the real source domain.
      const citations = (cand?.groundingMetadata?.groundingChunks || [])
        .filter((c) => c.web?.uri)
        .map((c) => ({ url: c.web.uri, title: c.web.title, domain: c.web.title?.includes('.') ? c.web.title : undefined }));
      return { text, citations, model: data.modelVersion || model };
    },
  };
}
