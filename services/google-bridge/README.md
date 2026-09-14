# google-bridge

A small self-hosted HTTP service that reads and writes Google Docs and Sheets
on behalf of *your* Google account, running on your own DigitalOcean droplet.
Every request is written to an on-disk audit log (`logs/audit.log`), so you
have a record of every change made through it.

Auth model: OAuth2 as your own Google account. Credentials (client
id/secret + refresh token) live only in `.env` on the droplet — never
committed to git, never held by any third party.

## 1. Create a Google OAuth client (one time)

1. Go to https://console.cloud.google.com/ and create (or pick) a project.
2. Enable these APIs for the project: **Google Docs API**, **Google Sheets
   API**, **Google Drive API**.
3. Go to "APIs & Services" → "OAuth consent screen". Choose "External" (or
   "Internal" if you're on a Google Workspace domain) and add yourself as a
   test user if prompted.
4. Go to "APIs & Services" → "Credentials" → "Create credentials" → "OAuth
   client ID" → application type **Desktop app**. Note the **Client ID** and
   **Client secret**.

## 2. Get a refresh token (one time, run on your own laptop)

```bash
cd services/google-bridge
npm install
GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npm run get-refresh-token
```

This prints a URL. Open it, sign in with the Google account you want the
bridge to act as, and approve access. The script prints a refresh token —
save it, you'll put it in `.env` on the droplet in the next step.

## 3. First-time droplet setup

SSH into the droplet once, manually:

```bash
git clone <this-repo-url>
cd my-project/services/google-bridge
cp .env.example .env
# edit .env: set API_KEY (openssl rand -hex 32), GOOGLE_CLIENT_ID,
# GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN from steps 1-2
docker compose up -d --build
```

The container binds to `127.0.0.1:8080` only — it is not reachable from the
internet by itself. Put a TLS reverse proxy in front of it (see
`Caddyfile.example` for a Caddy config, which gets you free automatic HTTPS
for a subdomain pointed at the droplet).

## 4. Automatic deploys via GitHub Actions

`.github/workflows/deploy-google-bridge.yml` deploys automatically whenever
`services/google-bridge/**` changes on `main`. Add these repo secrets under
Settings → Secrets and variables → Actions:

| Secret               | Value                                                        |
|----------------------|---------------------------------------------------------------|
| `DROPLET_HOST`       | droplet IP or hostname                                       |
| `DROPLET_USER`       | SSH user (e.g. `deploy`)                                     |
| `DROPLET_SSH_KEY`    | private key with SSH access to that user (no passphrase)     |
| `DROPLET_DEPLOY_PATH`| absolute path to the git clone on the droplet, e.g. `/home/deploy/my-project` |

The workflow only runs `git pull` + `docker compose up -d --build` — it
never touches `.env`, so rotate/edit secrets on the droplet directly.

## Using the API

All requests except `/health` require an `X-API-Key` header matching `.env`.

```bash
BASE=https://bridge.yourdomain.com
KEY=your-api-key

# Read a Doc
curl -H "X-API-Key: $KEY" "$BASE/docs/$DOC_ID"

# Append text to a Doc
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"text": "\nNew line appended.\n"}' \
  "$BASE/docs/$DOC_ID/append"

# Find/replace in a Doc
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"find": "TODO", "replace": "done"}' \
  "$BASE/docs/$DOC_ID/replace"

# Read Sheet values
curl -H "X-API-Key: $KEY" "$BASE/sheets/$SHEET_ID/values?range=Sheet1!A1:D10"

# Write/append Sheet values
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"range": "Sheet1!A1", "values": [["a","b"],["c","d"]], "mode": "append"}' \
  "$BASE/sheets/$SHEET_ID/values"

# Recent audit log entries
curl -H "X-API-Key: $KEY" "$BASE/logs?limit=20"
```

Note: your Google account must already have edit access to any Doc/Sheet ID
you pass in — the bridge acts as you, it doesn't grant new access on its own.

## Audit log

Every request is appended as one JSON line to
`services/google-bridge/logs/audit.log` on the droplet (persisted outside the
container via the `docker-compose.yml` volume mount). Tail it directly:

```bash
tail -f services/google-bridge/logs/audit.log
```

or fetch recent entries over the API via `GET /logs`.
