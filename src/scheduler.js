// Runs every project once a day at the configured hour (server local time).
import { all, get } from './db.js';
import { config } from './config.js';
import { runProject, isRunning } from './runner.js';

export function startScheduler() {
  if (config.dailyRunHour == null || Number.isNaN(config.dailyRunHour)) {
    console.log('[scheduler] daily runs disabled');
    return () => {};
  }
  const tick = async () => {
    const now = new Date();
    if (now.getHours() < config.dailyRunHour) return;
    const day = now.toISOString().slice(0, 10);
    for (const { id } of all('SELECT id FROM projects')) {
      const done = get(`SELECT 1 FROM runs WHERE project_id = ? AND trigger = 'schedule' AND date(started_at) = ?`, id, day);
      if (done || isRunning(id)) continue;
      console.log(`[scheduler] daily run for project ${id}`);
      runProject(id, { trigger: 'schedule' }).catch((e) => console.error(`[scheduler] project ${id}: ${e.message}`));
    }
  };
  const timer = setInterval(tick, 60_000);
  tick();
  console.log(`[scheduler] daily runs at ${config.dailyRunHour}:00`);
  return () => clearInterval(timer);
}
