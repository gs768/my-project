# BrightLocal grid check — 2nd & 4th Monday of the month

## 0. Day-of-month guard (run this first, always)

This job is meant to fire only on the second and fourth Monday of the month.
The scheduler that wakes this job fires every Monday at 14:00 America/New_York
(cron can't express "2nd and 4th Monday" directly), so the guard below must
run before anything else, every single time:

```bash
DOM=$(TZ=America/New_York date +%-d)
TODAY=$(TZ=America/New_York date +%F)
LOG=~/jobs/logs/brightlocal-$TODAY.log
mkdir -p ~/jobs/logs
if ! { [ "$DOM" -ge 8 ] && [ "$DOM" -le 14 ]; } && ! { [ "$DOM" -ge 22 ] && [ "$DOM" -le 28 ]; }; then
  echo "$(TZ=America/New_York date -Iseconds) SKIP: today ($TODAY, day-of-month=$DOM) is not the 2nd or 4th Monday of the month." >> "$LOG"
  exit 0
fi
echo "$(TZ=America/New_York date -Iseconds) START: day-of-month=$DOM qualifies (2nd or 4th Monday). Proceeding." >> "$LOG"
```

If the guard says SKIP, stop here — do not do any BrightLocal or Google
Sheets work this firing. Every run (skip or not) must append to
`~/jobs/logs/brightlocal-YYYY-MM-DD.log`, and the transcript/tool output
from the rest of this job should also be captured into that same file.

## 1. Find the active-SEO client list

Read the Google Sheet **"All Clients Core info"**
(fileId `1gDXN45Xxww4nCr8FzYb3yDJmLMDQ3zmgjwMaxkXffCE`, tab `Sheet1`) via the
Google Drive connector. Filter to rows where the **SEO** column is `TRUE`.
For each matching row, note: `Client`, `Location`, `Business Name`, `Phone`,
`Website`, `BrightLocal project profile URL`, `BrightLocal project IDs`.

## 2. Resolve each client to a BrightLocal Local Search Grid (LSG) report

For each active-SEO client from step 1:

- Try to pull a numeric LSG `report_id` out of the sheet's
  "BrightLocal project profile URL" / "BrightLocal project IDs" columns
  first (these sometimes contain the report id directly, or an admin URL
  with `/id/<report_id>/` in it).
- If that doesn't yield a usable report_id, fall back to
  `mcp__BrightLocal__find_locations` (search by business name / phone /
  website) to get a `location_id`, then `mcp__BrightLocal__find_lsg_reports`
  with that `location_id` to get its LSG `report_id`.
- If you still can't confidently resolve a report, log it as
  `UNRESOLVED: <client> — <why>` and move on. Do not guess an ID — a wrong
  report_id would trigger a paid crawl for the wrong client.

## 3. Trigger the grid check

For each successfully resolved client, call
`mcp__BrightLocal__run_lsg_report` with that `report_id` to kick off a fresh
Local Search Grid crawl (these reports are on BrightLocal's "adhoc" schedule
— nothing else runs them automatically, which is the whole reason this job
exists: it's the twice-a-month manual trigger).

Log one line per client to the day's log file:
`TRIGGERED <client> (<location>) report_id=<id>` or
`ERROR <client> — <what BrightLocal returned>`.

## 4. Summary

At the end, append a one-line summary to the log:
`DONE: N triggered, M unresolved, K errors (total active-SEO clients: T)`.

Do not attempt to fetch grid results in this same run — grid crawls take
time to complete across all points; checking results is a separate,
later concern.
