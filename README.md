# LocalDesk

A self-hosted replacement for LocalClarity: manage reviews, Google Business Profile posts, review requests, and client reports for many clients and locations from one dashboard.

## Features

| Area | What it does |
|---|---|
| **Review inbox** | Pulls Google reviews for every linked location into one inbox, with filters by client, location, rating, status, source and text. You can reply to Google from the inbox. Reviews from other sites (Facebook, Yelp, …) can be added by hand. |
| **AI replies** | Claude drafts a reply that follows each client's brand voice and sign-off. You can also turn on auto-replies for new 4–5★ reviews. Without an API key, it uses rating-matched templates instead. |
| **Alerts** | Sends email and/or Slack alerts when a review comes in at or below a client's threshold. |
| **Posts** | Publish or schedule Google posts (Update, Offer or Event, with a button and image) to one or many locations at once. AI can write the post text. |
| **Review requests** | Send one SMS (Twilio) or email request, or paste a CSV to send many. Each customer gets a branded page that offers everyone the Google review link, plus a private-feedback form. Also gives shareable links and QR codes for each location. Tracks clicks. |
| **Reports** | Per client or location for any date range: avg rating, review volume, response rate, response time, rating spread, monthly trend, Google views, calls, website clicks, directions, and request click-through. Includes a printable white-label PDF. |
| **Multi-client** | Clients → locations. Import locations straight from the connected Google account. |

> The review page does **not** gate by rating: every customer sees the Google link. Google's policies forbid showing the review link only to happy customers.

## Quick start

```bash
npm install
cp .env.example .env      # fill in what you have; everything is optional for a demo
npm run seed              # optional: demo clients, locations, reviews & metrics (turns on demo mode)
npm start                 # http://localhost:3000
```

Needs **Node 22.13+**. It uses the built-in `node:sqlite`, so there is no database server to run. Data is kept in `data/localdesk.db`.

**Demo mode** (Settings) fakes Google replies, posts and SMS/email sends, so you can click through safely. Turn it off before going live.

## Going live

### 1. Google Business Profile
1. In Google Cloud, create a project and enable **My Business Account Management API**, **My Business Business Information API**, **Business Profile Performance API**, and **Google My Business API** (v4, used for reviews and posts).
2. Request Business Profile API access (<https://developers.google.com/my-business/content/prereqs>). Until Google approves it, calls will fail with quota errors.
3. Create an OAuth client (type *Web application*) with redirect URI `{PUBLIC_URL}/api/google/callback`.
4. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and restart the app.
5. In LocalDesk: **Settings → Connect Google**, sign in with the account that manages your clients' profiles, then **Import locations** into each client.

Reviews and performance metrics sync every `SYNC_INTERVAL_MINUTES`, or when you click **Sync**. The first sync of a location imports its past reviews without sending alerts for them.

### 2. Everything else (all optional)
- `ANTHROPIC_API_KEY`: AI reply drafts, auto-replies and post writing.
- `TWILIO_*`: SMS review requests.
- `SMTP_*`: email review requests and negative-review alert emails.
- `SLACK_WEBHOOK_URL`: negative-review alerts in Slack.

### 3. Deploy
Run it on any host that runs Node (Render, Railway, Fly.io, a VPS) and keep `data/` on a persistent disk. Set `PUBLIC_URL` to the public HTTPS URL and set `ADMIN_PASSWORD`. Without a password the dashboard is open to anyone who can reach it.

## Moving off LocalClarity
1. Connect Google and import your locations. Google reviews, including past ones and existing replies, come in on the first sync.
2. Copy each client's brand voice and reply templates into **Clients → Edit** and **Settings → Templates**.
3. Swap the review-request links and QR codes you had printed or shared for the new ones under **Review requests → Links & QR codes**.

## Development

```bash
npm run dev   # auto-restart on changes
npm test      # node:test suite (uses an in-memory DB, no network)
```

Layout: `server/` (Express API, Google/Claude/Twilio/SMTP integrations, scheduler, reports), `public/` (a no-build vanilla JS single-page app), `test/`.
