# AI Visibility Tracker

A self-hosted replacement for [Peec.ai](https://peec.ai): it tracks how AI assistants
(ChatGPT, Claude, Gemini, Perplexity, Grok) talk about your brand compared with your
competitors, and which sources they cite.

Each day it sends your tracked prompts to every enabled model **with web search on**
(the way the consumer apps answer), then pulls out:

| Metric | Meaning |
|---|---|
| **Visibility** | % of answers that mention the brand |
| **Share of voice** | the brand's mentions as a share of all tracked-brand mentions |
| **Position** | where the brand shows up among tracked brands (1 = mentioned first) |
| **Sentiment** | 0–100 (50 = neutral), scored on the sentences that mention the brand |
| **Sources** | the domains and URLs the models cite, sorted into you / competitor / UGC / review / reference / institutional / editorial |

## Features

- **Overview dashboard**: KPI tiles with change vs. the previous period, trend chart
  (visibility, share of voice, position, sentiment), brand ranking, results per model,
  a list of the prompts where competitors beat you most ("Biggest gaps"), and top sources.
- **Prompts**: add them in bulk, tag them, pause them, get suggestions (from an LLM if
  one is configured, otherwise from templates), and see results per prompt.
- **Sources**: domain and URL tables showing each source's usage rate, citation count,
  and **how often answers that cite it also mention you**. Frequently cited domains that
  rarely mention you are your PR and outreach targets.
- **Responses**: every raw answer, with brand mentions highlighted and citations listed.
- **Competitor discovery**: brand names that keep appearing in answers but that you
  aren't tracking yet, each with a one-click "Track" button.
- **Filters** for date range, model and tag work on every page.
- **CSV export** of brands, prompts, sources, URLs, responses and mentions, plus a **JSON API**.
- **Daily scheduler** built in, or run it from cron with `python -m aivis run`.
- Aliases and domains count as mentions. Editing a brand re-analyses all stored answers.
- A **demo mode** with synthetic data, so you can try it without any API keys.
- Optional HTTP basic auth, a single SQLite file, and a Docker image.

## Quick start

```bash
pip install -r requirements.txt

# Try it without API keys: loads 30 days of synthetic data
python -m aivis demo
python -m aivis serve          # http://127.0.0.1:8000
```

For real tracking, copy `.env.example` to `.env`, add API keys for the models you
want, then create a project in the UI:

```bash
cp .env.example .env           # add your keys
python -m aivis providers      # check which models are configured
python -m aivis serve --host 0.0.0.0
```

### Docker

```bash
docker build -t aivis .
docker run -p 8000:8000 --env-file .env -v aivis-data:/app/data aivis
```

## Configuration

All settings are environment variables. They can also go in a `.env` file.

| Variable | Default | |
|---|---|---|
| `OPENAI_API_KEY` / `OPENAI_MODEL` | – / `gpt-5-mini` | ChatGPT via the Responses API + `web_search` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | – / `claude-opus-5` | Claude + server-side web search |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | – / `gemini-2.5-flash` | Gemini + Google Search grounding |
| `PERPLEXITY_API_KEY` / `PERPLEXITY_MODEL` | – / `sonar` | Perplexity (always searches) |
| `XAI_API_KEY` / `XAI_MODEL` | – / `grok-4` | Grok (chat completions) |
| `AIVIS_DB` | `data/aivis.db` | SQLite file |
| `AIVIS_SAMPLES` | `1` | times to ask each prompt, per model, per run (answers vary, so more samples = steadier numbers) |
| `AIVIS_SCHEDULE` / `AIVIS_SCHEDULE_HOUR` | `on` / `6` | daily run, hour in UTC |
| `AIVIS_WORKERS` | `4` | parallel API calls |
| `AIVIS_ANALYSIS_PROVIDER` | `auto` | model used for prompt suggestions: a provider key, `auto`, or `none` |
| `AIVIS_USER` / `AIVIS_PASSWORD` | – | turns on HTTP basic auth |

**Cost:** each run makes *prompts × models × samples* API calls with web search.
For example, 50 prompts × 4 models is 200 calls a day. To cut costs, set cheaper
models (for example `ANTHROPIC_MODEL=claude-haiku-4-5`) or track fewer prompts.

## CLI

```
python -m aivis serve [--host H --port P]   # dashboard + scheduler
python -m aivis run [PROJECT_ID]            # run now (use from cron if you prefer)
python -m aivis demo [--days N]             # seed a demo project
python -m aivis providers                   # show configured models
```

## API

```
GET  /api/projects
GET  /api/projects/{id}/brands?days=30&model=chatgpt&tag=discovery
GET  /api/projects/{id}/timeseries?metric=visibility|share_of_voice|position|sentiment
GET  /api/projects/{id}/prompts
GET  /api/projects/{id}/sources
GET  /api/projects/{id}/responses?limit=50&offset=0
POST /api/projects/{id}/runs            -> {"run_id": N}
GET  /api/runs/{run_id}
```

CSV exports: `/p/{id}/export/{brands|prompts|sources|urls|responses|mentions}.csv`.
They accept the same filters.

## How detection works

- A brand counts as mentioned when its name, an alias or one of its domains appears in
  the answer. Matching ignores case, with one exception: a brand name that starts with
  a capital letter only matches when the text also capitalises it, so "Close" (the CRM)
  doesn't match "close to".
- Position is the order in which tracked brands first appear.
- Sentiment is scored from a word list (with negation handling) over the sentences that
  mention the brand.
- Citations come from the provider's own citation data (OpenAI annotations, Claude web
  search citations, Gemini grounding chunks, Perplexity search results) plus any links
  written inline in the answer.

## Limitations

API answers come close to what the consumer apps show, but they don't match exactly.
The chat apps add personalisation, memory and their own system prompts. Google AI
Overviews / AI Mode has no official API, so it isn't included.

## Development

```bash
pip install -r requirements.txt pytest
python -m pytest
```
