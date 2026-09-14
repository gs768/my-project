/*
 * Run this ONCE, on your own laptop (not the droplet), to obtain a refresh
 * token for your Google account. See README.md for the full walkthrough.
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run get-refresh-token
 */
const http = require('http');
const { URL } = require('url');
const { buildOAuthClient, SCOPES } = require('../src/googleClient');

const PORT = 53682;
const redirectUri = `http://127.0.0.1:${PORT}/oauth2callback`;

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars first.');
  process.exit(1);
}

const oauth2Client = buildOAuthClient({ clientId, clientSecret, redirectUri });

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404);
    return res.end();
  }
  const code = url.searchParams.get('code');
  res.end('Authorization received, you can close this tab and return to the terminal.');
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log('\nRefresh token (put this in .env as GOOGLE_REFRESH_TOKEN):\n');
  console.log(tokens.refresh_token);
  console.log();
});

server.listen(PORT, () => {
  console.log('Open this URL in a browser, sign in, and approve access:\n');
  console.log(authUrl);
  console.log(`\nWaiting for the redirect back to ${redirectUri} ...`);
});
