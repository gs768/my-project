// Single-password admin auth with an HMAC-signed session cookie.
import crypto from 'node:crypto';

const COOKIE = 'ld_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-secret';
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issue(res) {
  const payload = `admin.${Date.now() + MAX_AGE_MS}`;
  const secure = (process.env.PUBLIC_URL || '').startsWith('https://') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_MS / 1000}${secure}`);
}

export function clear(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export function isAuthed(req) {
  if (!process.env.ADMIN_PASSWORD) return true; // auth disabled (local use)
  const raw = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const value = raw.slice(COOKIE.length + 1);
  const i = value.lastIndexOf('.');
  const payload = value.slice(0, i);
  const sig = value.slice(i + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(payload.split('.')[1]) > Date.now();
}

export function checkPassword(pw) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return expected !== '' && crypto.timingSafeEqual(a, b);
}

export function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'Not signed in' });
}
