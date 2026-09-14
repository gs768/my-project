require('dotenv').config();

const express = require('express');
const { getDocsClient, getSheetsClient } = require('./googleClient');
const { logEvent, readRecent } = require('./logger');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logEvent({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      params: req.method === 'GET' ? req.query : req.body,
    });
  });
  next();
});

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.header('X-API-Key');
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'missing or invalid X-API-Key header' });
  }
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/logs', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  res.json(readRecent(limit));
});

// ---- Docs ----

function extractText(doc) {
  const content = doc.data.body?.content || [];
  let text = '';
  for (const el of content) {
    const elements = el.paragraph?.elements || [];
    for (const e of elements) {
      text += e.textRun?.content || '';
    }
  }
  return text;
}

app.get('/docs/:id', async (req, res, next) => {
  try {
    const docs = getDocsClient();
    const doc = await docs.documents.get({ documentId: req.params.id });
    res.json({ id: req.params.id, title: doc.data.title, text: extractText(doc) });
  } catch (err) {
    next(err);
  }
});

app.post('/docs/:id/append', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string' || !text.length) {
      return res.status(400).json({ error: 'body must include non-empty string "text"' });
    }
    const docs = getDocsClient();
    const doc = await docs.documents.get({ documentId: req.params.id });
    const content = doc.data.body?.content || [];
    const endIndex = content.length ? content[content.length - 1].endIndex - 1 : 1;

    await docs.documents.batchUpdate({
      documentId: req.params.id,
      requestBody: {
        requests: [{ insertText: { location: { index: endIndex }, text } }],
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post('/docs/:id/replace', async (req, res, next) => {
  try {
    const { find, replace, matchCase } = req.body;
    if (typeof find !== 'string' || !find.length || typeof replace !== 'string') {
      return res.status(400).json({ error: 'body must include string "find" and string "replace"' });
    }
    const docs = getDocsClient();
    await docs.documents.batchUpdate({
      documentId: req.params.id,
      requestBody: {
        requests: [
          {
            replaceAllText: {
              containsText: { text: find, matchCase: Boolean(matchCase) },
              replaceText: replace,
            },
          },
        ],
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- Sheets ----

app.get('/sheets/:id/values', async (req, res, next) => {
  try {
    const range = req.query.range;
    if (!range) return res.status(400).json({ error: 'query param "range" is required, e.g. Sheet1!A1:D10' });
    const sheets = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({ spreadsheetId: req.params.id, range });
    res.json({ range: result.data.range, values: result.data.values || [] });
  } catch (err) {
    next(err);
  }
});

app.post('/sheets/:id/values', async (req, res, next) => {
  try {
    const { range, values, mode } = req.body;
    if (!range || !Array.isArray(values)) {
      return res.status(400).json({ error: 'body must include "range" and array-of-arrays "values"' });
    }
    const sheets = getSheetsClient();
    const spreadsheetId = req.params.id;

    if (mode === 'append') {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  const message = err.errors?.[0]?.message || err.message || 'internal error';
  logEvent({ level: 'error', path: req.path, message });
  res.status(err.code && Number.isInteger(err.code) ? err.code : 500).json({ error: message });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`google-bridge listening on :${port}`));
