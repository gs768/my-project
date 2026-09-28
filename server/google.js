// Google Business Profile integration (OAuth 2.0 + REST, no SDK).
// Requires a Google Cloud project with the Business Profile APIs enabled and
// approved (https://developers.google.com/my-business/content/prereqs).
import { getSetting, setSetting } from './db.js';

const SCOPE = 'https://www.googleapis.com/auth/business.manage';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ACCOUNTS_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const V4_API = 'https://mybusiness.googleapis.com/v4';
const PERF_API = 'https://businessprofileperformance.googleapis.com/v1';

export const PERF_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
];

const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function creds() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.PUBLIC_URL || 'http://localhost:3000'}/api/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function isConfigured() {
  const { clientId, clientSecret } = creds();
  return Boolean(clientId && clientSecret);
}

export function isConnected(db) {
  return Boolean(getSetting(db, 'google_tokens')?.refresh_token);
}

export function authUrl(state) {
  const { clientId, redirectUri } = creds();
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${AUTH_URL}?${q}`;
}

async function tokenRequest(params) {
  const { clientId, clientSecret, redirectUri } = creds();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, ...params }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google token error: ${json.error_description || json.error || res.status}`);
  return json;
}

export async function exchangeCode(db, code) {
  const t = await tokenRequest({ code, grant_type: 'authorization_code' });
  setSetting(db, 'google_tokens', {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: Date.now() + (t.expires_in - 60) * 1000,
  });
}

async function accessToken(db) {
  const tokens = getSetting(db, 'google_tokens');
  if (!tokens?.refresh_token) throw new Error('Google Business Profile is not connected');
  if (tokens.access_token && tokens.expires_at > Date.now()) return tokens.access_token;
  const t = await tokenRequest({ refresh_token: tokens.refresh_token, grant_type: 'refresh_token' });
  const next = { ...tokens, access_token: t.access_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
  setSetting(db, 'google_tokens', next);
  return next.access_token;
}

async function api(db, method, url, body) {
  const token = await accessToken(db);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Google API ${res.status}: ${json.error?.message || text.slice(0, 200)}`);
  return json;
}

async function paginate(db, baseUrl, key) {
  const out = [];
  let pageToken = '';
  do {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const json = await api(db, 'GET', `${baseUrl}${pageToken ? `${sep}pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    out.push(...(json[key] || []));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return out;
}

// Returns every location the connected Google user can manage, across accounts.
export async function listAllLocations(db) {
  const accounts = await paginate(db, `${ACCOUNTS_API}/accounts?pageSize=20`, 'accounts');
  const readMask = 'name,title,storefrontAddress,phoneNumbers,websiteUri,metadata';
  const results = [];
  for (const acct of accounts) {
    const locs = await paginate(db, `${INFO_API}/${acct.name}/locations?pageSize=100&readMask=${readMask}`, 'locations');
    for (const l of locs) results.push(mapLocation(acct, l));
  }
  return results;
}

export function mapLocation(acct, l) {
  const a = l.storefrontAddress || {};
  const address = [...(a.addressLines || []), a.locality, a.administrativeArea, a.postalCode].filter(Boolean).join(', ');
  return {
    account: acct.accountName || acct.name,
    gbp_name: `${acct.name}/${l.name}`, // accounts/{a}/locations/{l}
    name: l.title,
    address,
    phone: l.phoneNumbers?.primaryPhone || '',
    website: l.websiteUri || '',
    place_id: l.metadata?.placeId || '',
  };
}

export function mapReview(r) {
  return {
    external_id: r.reviewId,
    author: r.reviewer?.isAnonymous ? 'Anonymous' : (r.reviewer?.displayName || 'Google user'),
    author_photo: r.reviewer?.profilePhotoUrl || '',
    rating: STARS[r.starRating] || 0,
    body: r.comment || '',
    created_at: r.createTime,
    reply_body: r.reviewReply?.comment || null,
    replied_at: r.reviewReply?.updateTime || null,
  };
}

export async function fetchReviews(db, gbpName) {
  const raw = await paginate(db, `${V4_API}/${gbpName}/reviews?pageSize=50&orderBy=updateTime%20desc`, 'reviews');
  return raw.map(mapReview);
}

export async function replyToReview(db, gbpName, reviewId, comment) {
  return api(db, 'PUT', `${V4_API}/${gbpName}/reviews/${reviewId}/reply`, { comment });
}

export async function createLocalPost(db, gbpName, post) {
  const body = { languageCode: 'en-US', summary: post.body, topicType: post.topic_type || 'STANDARD' };
  if (post.cta_type) body.callToAction = post.cta_type === 'CALL' ? { actionType: 'CALL' } : { actionType: post.cta_type, url: post.cta_url };
  if (post.image_url) body.media = [{ mediaFormat: 'PHOTO', sourceUrl: post.image_url }];
  return api(db, 'POST', `${V4_API}/${gbpName}/localPosts`, body);
}

// Daily performance metrics for the given date range (YYYY-MM-DD).
export async function fetchMetrics(db, gbpName, start, end) {
  const locId = gbpName.split('/').slice(-2).join('/'); // locations/{l}
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const q = new URLSearchParams();
  for (const m of PERF_METRICS) q.append('dailyMetrics', m);
  Object.entries({
    'dailyRange.start_date.year': sy, 'dailyRange.start_date.month': sm, 'dailyRange.start_date.day': sd,
    'dailyRange.end_date.year': ey, 'dailyRange.end_date.month': em, 'dailyRange.end_date.day': ed,
  }).forEach(([k, v]) => q.append(k, v));
  const json = await api(db, 'GET', `${PERF_API}/${locId}:fetchMultiDailyMetricsTimeSeries?${q}`);
  return flattenMetrics(json);
}

export function flattenMetrics(json) {
  const rows = [];
  for (const group of json.multiDailyMetricTimeSeries || []) {
    for (const series of group.dailyMetricTimeSeries || []) {
      for (const dv of series.timeSeries?.datedValues || []) {
        const d = dv.date;
        const date = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        rows.push({ date, metric: series.dailyMetric, value: Number(dv.value || 0) });
      }
    }
  }
  return rows;
}

export function reviewLink(location) {
  if (location.review_url) return location.review_url;
  if (location.place_id) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(location.place_id)}`;
  return '';
}
