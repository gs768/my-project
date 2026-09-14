const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

function buildOAuthClient({ clientId, clientSecret, redirectUri }) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function buildAuthorizedClient() {
  const oauth2Client = buildOAuthClient({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  });
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

function getDocsClient() {
  return google.docs({ version: 'v1', auth: buildAuthorizedClient() });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: buildAuthorizedClient() });
}

module.exports = { SCOPES, buildOAuthClient, getDocsClient, getSheetsClient };
