// Load demo data so the dashboard can be explored without Google credentials.
// Usage: npm run seed  (enables demo mode: replies/posts/requests are simulated)
import { openDb, setSetting, uniqueSlug } from './db.js';
import { fileURLToPath } from 'node:url';

const CLIENTS = [
  { name: 'Brightside Dental', voice: 'Friendly, reassuring, professional. Patients are nervous — be warm.', sig: '— The Brightside Dental Team', locations: [
    { name: 'Brightside Dental – Downtown', address: '120 Main St, Springfield, IL', phone: '(217) 555-0140' },
    { name: 'Brightside Dental – Westgate', address: '88 Westgate Blvd, Springfield, IL', phone: '(217) 555-0188' },
  ] },
  { name: 'Oak & Ember Pizza', voice: 'Casual, upbeat, a little playful. Family-owned wood-fired pizzeria.', sig: '— Marco & the Oak & Ember crew', locations: [
    { name: 'Oak & Ember Pizza', address: '9 Market Sq, Riverton, OH', phone: '(614) 555-0199' },
  ] },
  { name: 'Summit HVAC', voice: 'Direct, dependable, no fluff.', sig: '', locations: [
    { name: 'Summit HVAC – North', address: '4500 Industrial Pkwy, Denver, CO', phone: '(303) 555-0111' },
    { name: 'Summit HVAC – South', address: '210 Broadway, Littleton, CO', phone: '(303) 555-0122' },
    { name: 'Summit HVAC – Boulder', address: '77 Pearl St, Boulder, CO', phone: '(303) 555-0133' },
  ] },
];

const NAMES = ['Jessica M.', 'David Chen', 'Priya Patel', 'Tom Walker', 'Maria Garcia', 'Kevin O\'Brien', 'Aisha Johnson', 'Liam Nguyen', 'Sarah K.', 'Anonymous', 'Robert Fox', 'Emily Stone', 'Carlos Ruiz', 'Hannah Lee', 'Marcus Bell'];
const TEXT = {
  5: ['Absolutely fantastic experience. Staff were friendly and everything was quick.', 'Best in town, hands down. Will be back!', 'They went above and beyond. Highly recommend.', 'Super professional and on time. Great value.', ''],
  4: ['Really good overall, just a short wait when we arrived.', 'Great service, a bit pricey but worth it.', 'Friendly team and clean space.'],
  3: ['It was okay. Nothing special but no complaints either.', 'Decent, though communication could be better.'],
  2: ['Had to wait 40 minutes past my appointment and nobody explained why.', 'Order was wrong and took forever to fix.'],
  1: ['Very disappointed. Rude front desk and I was overcharged.', 'Never showed up for the scheduled window and didn\'t call.'],
};

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function weightedRating() { const x = Math.random(); return x < 0.55 ? 5 : x < 0.75 ? 4 : x < 0.85 ? 3 : x < 0.93 ? 2 : 1; }

export function seed(db) {
  setSetting(db, 'demo_mode', true);
  const insReview = db.prepare(`INSERT INTO reviews (location_id, source, external_id, author, rating, body, created_at, reply_body, replied_at, status, alerted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
  const insMetric = db.prepare('INSERT OR REPLACE INTO metrics_daily (location_id, date, metric, value) VALUES (?, ?, ?, ?)');
  let n = 0;
  for (const c of CLIENTS) {
    const { lastInsertRowid: cid } = db.prepare('INSERT INTO clients (name, brand_voice, signature, alert_threshold) VALUES (?, ?, ?, 3)').run(c.name, c.voice, c.sig);
    for (const l of c.locations) {
      const { lastInsertRowid: lid } = db.prepare('INSERT INTO locations (client_id, name, slug, address, phone, place_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(cid, l.name, uniqueSlug(db, l.name), l.address, l.phone, 'ChIJdemo' + Math.random().toString(36).slice(2, 10));
      const count = 25 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const rating = weightedRating();
        const created = new Date(Date.now() - Math.random() * 180 * 864e5);
        const recent = Date.now() - created.getTime() < 10 * 864e5;
        const replied = !recent && Math.random() < 0.8;
        const repliedAt = replied ? new Date(created.getTime() + Math.random() * 72 * 36e5) : null;
        const reply = replied ? (rating >= 4 ? 'Thank you so much for the kind words — we appreciate you!' : 'We\'re sorry about this experience. Please give us a call so we can make it right.') : null;
        insReview.run(lid, Math.random() < 0.85 ? 'google' : 'facebook', `demo-${lid}-${i}`, rand(NAMES), rating, rand(TEXT[rating]), created.toISOString(), reply, repliedAt?.toISOString() ?? null, replied ? 'replied' : 'new');
        n++;
      }
      for (let d = 2; d < 120; d++) {
        const date = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
        const base = 40 + Math.floor(Math.random() * 60);
        insMetric.run(lid, date, 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', base);
        insMetric.run(lid, date, 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', Math.floor(base * 0.8));
        insMetric.run(lid, date, 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', Math.floor(base * 0.4));
        insMetric.run(lid, date, 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', Math.floor(base * 0.2));
        insMetric.run(lid, date, 'CALL_CLICKS', Math.floor(Math.random() * 6));
        insMetric.run(lid, date, 'WEBSITE_CLICKS', Math.floor(Math.random() * 9));
        insMetric.run(lid, date, 'BUSINESS_DIRECTION_REQUESTS', Math.floor(Math.random() * 5));
      }
    }
  }
  return n;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb();
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM clients').get();
  if (n > 0 && !process.argv.includes('--force')) {
    console.log('Database already has clients. Re-run with --force to add demo data anyway.');
    process.exit(0);
  }
  console.log(`Seeded ${seed(db)} demo reviews. Demo mode is ON (Settings → turn off when going live).`);
}
