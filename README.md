# Beacon — self-hosted AI search visibility tracking

Beacon is an open, self-hosted alternative to Peec.ai. It tracks how **ChatGPT, Claude, Gemini and Perplexity** answer the questions your customers ask, and measures how often your brand shows up compared to competitors, where it ranks, how it is described, and which sources the engines cite.

You pay only for the API calls you make. There are no per-seat or per-prompt fees.

## What it tracks

| Metric | Meaning |
|---|---|
| **Visibility** | % of answers that mention the brand |
| **Share of voice** | The brand's share of all tracked-brand mentions |
| **Avg. position** | Where the brand ranks among the tracked brands named in an answer (1 = named first) |
| **Sentiment** | 0–100 score for how the answer describes the brand (50 = neutral) |
| **Sources** | Cited domains and URLs, with usage %, average citation rank, and type (own / competitor / UGC / review / reference / news / video / social / institutional / other) |

Every metric can be filtered by date range, engine and prompt tag. Each one also shows the change from the previous period of the same length.

**Dashboard tabs**

- **Overview**: KPI tiles, a trend chart (visibility, position or sentiment per brand), results per engine, and a brand leaderboard
- **Prompts**: results for each question, plus the competitors that win it
- **Sources**: source-type mix, top domains and top URLs
- **Responses**: the full text of every answer, with brand mentions highlighted, their position and sentiment, and the cited sources
- **Settings**: brands and aliases, competitors, prompts (bulk paste, tags, country), engines and run history
- **Export CSV**: every answer × brand row, for spreadsheets or BI tools

## Quick start

Requires Node.js 22.5 or later. The database is Node's built-in SQLite, so you don't need a database server.

```bash
npm install
npm run demo      # optional: seeds a sample project with 30 days of simulated data
npm start         # http://localhost:3000
```

To track real engines, copy `.env.example` to `.env` and add API keys:

```bash
cp .env.example .env
# set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / PERPLEXITY_API_KEY
```

Next, create a project in the UI with your brand, its domain and aliases, your competitors, and your prompts. Then click **Run now**. The server also runs every project once a day (`DAILY_RUN_HOUR`), so trends build up automatically.

```bash
npm run run-now          # run every project once from the command line (for cron, CI, etc.)
npm test
```

## How it works

For each run, Beacon sends every active prompt to every enabled engine, with live web search turned on:

| Engine | API |
|---|---|
| ChatGPT | OpenAI Responses API + `web_search` tool (`url_citation` annotations) |
| Claude | Anthropic Messages API + `web_search_20260209` server tool (resumes `pause_turn`; server-side refusal fallback enabled) |
| Gemini | Gemini API + Google Search grounding (the closest proxy for AI Overviews) |
| Perplexity | Sonar chat completions (`search_results`) |

Each answer then goes through these steps:

1. **Mention detection.** Brand names and aliases are matched on word boundaries, including names with punctuation like `Monday.com`. Matches inside URLs are ignored. Brands are ranked by where they are first mentioned.
2. **Sentiment.** If an Anthropic key is set, Claude Haiku 4.5 scores each mentioned brand and returns structured output. Without a key, a lexicon scorer rates only the sentences that name the brand.
3. **Citations.** Sources from the engine and inline URLs are merged, deduplicated and stripped of `utm_*` parameters, then classified by domain.

Everything is stored in SQLite at `data/beacon.db`: responses, mentions and citations. Metrics are calculated when you view the dashboard, so changing a brand's aliases or filters doesn't require a re-run.

## Layout

```
src/
  server.js        HTTP API + static UI, starts the daily scheduler
  runner.js        prompt × engine fan-out, stores analysed answers
  analysis.js      mention detection, lexicon sentiment, citation extraction, source classification
  sentiment.js     optional Claude judge
  metrics.js       visibility / SOV / position / sentiment / sources / CSV
  projects.js      projects, brands, prompts CRUD
  providers/       openai, anthropic, gemini, perplexity, mock (demo)
public/            dashboard (vanilla JS, no build step)
test/              node:test suites
```

## API

The UI runs entirely on a small JSON API, which you can also use for scripts and integrations:

```
GET    /api/projects                     POST /api/projects
GET    /api/projects/:id                 PATCH/DELETE /api/projects/:id
POST   /api/projects/:id/brands          PATCH/DELETE /api/brands/:id
POST   /api/projects/:id/prompts         PATCH/DELETE /api/prompts/:id   ({text} | [{text}] | {bulk:"a\nb"})
POST   /api/projects/:id/runs            GET /api/projects/:id/runs
GET    /api/projects/:id/overview        ?from=YYYY-MM-DD&to=…&providers=openai,gemini&tags=pricing
GET    /api/projects/:id/prompt-metrics
GET    /api/projects/:id/sources
GET    /api/projects/:id/responses       &prompt=ID&brand=ID&limit=&offset=
GET    /api/projects/:id/export.csv
```

If you set `BEACON_TOKEN`, every API request must include `Authorization: Bearer <token>`. The UI asks for the token once and remembers it.

## Notes and limits

- API answers are close to what consumers see in these apps, but not identical. The apps add personalization, memory and their own UI features. Treat the numbers as trends, not exact replicas.
- Cost is roughly (prompts × engines × days) API calls. For example, 50 prompts × 4 engines once a day is about 6,000 calls a month.
- Google AI Overviews / AI Mode have no official API. Gemini with Search grounding stands in for them. A SERP-API provider can be added in `src/providers/`: implement `ask(prompt) → { text, citations: [{url, title}] }` and register it in `providers/index.js`.
