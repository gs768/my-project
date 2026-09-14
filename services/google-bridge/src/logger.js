const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

fs.mkdirSync(LOG_DIR, { recursive: true });

function logEvent(entry) {
  const line = JSON.stringify({ time: new Date().toISOString(), ...entry });
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function readRecent(limit = 50) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map((line) => JSON.parse(line));
}

module.exports = { logEvent, readRecent };
