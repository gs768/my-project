# Scheduled jobs

## BrightLocal Grid Check

- Prompt: `brightlocal-grids.md` (a copy lives at `~/jobs/brightlocal-grids.md` in the cloud environment)
- Runs as a Claude Code Routine: `trig_01KvrUs9k7keYYbX8Tscaxu1`
- Cron: `CRON_TZ=America/New_York 54 13 * * 1` (every Monday, 1:54 PM ET)
- Guard: only proceeds when day-of-month is 8–14 or 22–28 (2nd and 4th Monday); other Mondays log a SKIP and exit
- Logs: `~/jobs/logs/brightlocal-YYYY-MM-DD.log`
- Known limitation: the Routine has no MCP connectors attached, so BrightLocal and Google Drive tools are unavailable in fired sessions until connectors are added (e.g. via the claude.ai Routines UI)
