# GBP review replies

Every Monday this system checks each SEO-active client's Google Business Profile,
finds every review that is **more than 10 days old with no owner reply**, drafts a
reply with Claude, and posts a proposal to **#gabriel-and-gabriel** in Slack. The
team approves in the Slack thread. Each approved reply is posted to Google as
analytics@sdmark.net. Reviews that need the client's input get a ready-to-send
email to the client's General Inquiries contacts. Nothing is posted to Google
until someone approves it.

## How it works

```
Mon 8:47am ET   weekly  ─► client master sheet (SEO = TRUE rows)
                          ─► exclusions + rules (system sheet)
                          ─► GBP API as analytics@sdmark.net: unreplied reviews > 10 days
                          ─► Claude drafts a reply + "auto reply" vs "follow up with client"
                          ─► Slack: summary post, one thread reply per profile, access gaps, Notes
Hourly          poll    ─► reads new replies in each open weekly thread
                          ─► commands (approve / client / edit / skip) or plain-English notes
                          ─► posts approved replies to Google, drafts client emails,
                             updates rules / exclusions, answers in the thread
```

### What gets checked

* **Source of truth:** the `Clients Master` tab of *Sutton Digital Clients – Master*.
  Only rows where the first **SEO** column (under *Subscriptions*) is TRUE are checked.
* **Which profile:** `GBP Location ID`, falling back to the ID inside `GBP Resource Name`.
* **Client contacts:** `General Inquiries - Emails`. Every address in the cell is used.
* **Access:** the system finds every location analytics@sdmark.net can manage. SEO-active
  rows it can't reach are listed under **⚠️ Profiles that couldn't be checked** in each weekly
  thread. To add a new profile: add analytics@sdmark.net as a manager on the GBP, fill in
  `GBP Location ID` on the client's row, and set SEO to TRUE. The next weekly run picks it up.

### Slack thread commands

| Reply in the weekly thread | Effect |
|---|---|
| `approve all` | Post every proposal marked ✅ *Reply automatically* |
| `approve R1 R4-R7` | Post those specific proposals (including 📨 ones) |
| `client R3` | Route to the client: posts an email draft to their General Inquiries contacts |
| `edit R5: your text` | Post your wording instead (can span multiple lines) |
| `skip R6` | Never reply to that review; it won't be proposed again |
| anything else | A **note**. Claude turns it into rule or exclusion changes (and decisions), applies them, and replies with what changed |

Example notes:

* *For Smith Law - Springfield, sign replies "— The Smith Law Team"*
* *Always send 3-star reviews for Smith Law - Springfield to the client*
* *Agency-wide: never mention free consultations*
* *Exclude Acme Roofing - Dayton from this audit, they reply themselves*
* *Include Acme Roofing - Dayton again* / *Remove the sign-off rule for Smith Law*
* *Approve all the Smith Law ones except R12*

Undecided proposals roll into the next week's batch, which says they were proposed
before. Before posting, the poller checks the review again. If someone already
replied on Google, it leaves that review alone.

### System sheet (private)

Everything client-specific is stored in a private Google Sheet, never in this repo:

| Tab | Contents |
|---|---|
| **Rules** | `Client Location` (exact name from the master sheet, or `ALL`), `Rule`, `Active` |
| **Exclusions** | Profiles left out of the audit, with a reason |
| **Queue** | Every proposed review: status, proposed/final reply, who decided, when posted |
| **Batches** | One row per weekly Slack thread |
| **Notes Log** | Every note and the changes it made |

You can edit Rules and Exclusions directly in the sheet. Set `Active` to FALSE to turn one off.

## Setup

1. **Google OAuth client.** In the GCP project that has GBP API approval, enable the
   *My Business Account Management*, *My Business Business Information*, *Google My Business*
   and *Google Sheets* APIs. Create an OAuth client of type **Desktop app**.
2. **Refresh token for analytics@sdmark.net.** On your machine:
   `pip install -r requirements.txt && python -m gbp_reviews auth`, then sign in as
   analytics@sdmark.net. Requested scopes: `business.manage` and `spreadsheets`.
3. **Sheets.** Share *Sutton Digital Clients – Master* with analytics@sdmark.net (Viewer).
   Create a blank spreadsheet (e.g. *GBP Review System*) and share it with
   analytics@sdmark.net (Editor).
4. **Slack app.** Create the app from `slack/manifest.yml`, install it to the workspace,
   copy the Bot token (`xoxb-…`), then `/invite @GBP Review Replies` in #gabriel-and-gabriel.
5. **GitHub secrets** (Settings → Secrets and variables → Actions):

   | Secret | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from step 1 |
   | `GOOGLE_REFRESH_TOKEN` | from step 2 |
   | `CLIENTS_SHEET_ID` | ID of *Sutton Digital Clients – Master* |
   | `SYSTEM_SHEET_ID` | ID of the system spreadsheet from step 3 |
   | `SLACK_BOT_TOKEN` | from step 4 |
   | `SLACK_CHANNEL_ID` | ID of #gabriel-and-gabriel |
   | `ANTHROPIC_API_KEY` | Claude API key |

   Optional repository **variables**: `ANTHROPIC_MODEL` (default `claude-opus-5`),
   `MIN_REVIEW_AGE_DAYS` (default `10`).
6. **Initialise and test.** Actions → *GBP review replies* → Run workflow → `init-store`, then
   `weekly`. Locally, `python -m gbp_reviews weekly --dry-run out.txt` writes the Slack text
   to a file without posting anything. `python -m gbp_reviews access-report out.tsv` lists
   which SEO-active profiles analytics@sdmark.net can reach.

### Notes on running from a public repo

* Workflow logs only contain counts; review text and client names go to Slack and the
  private sheet only. Making the repo private is still recommended.
* GitHub turns off scheduled workflows after 60 days with no repository activity. If that
  happens, re-enable the workflow from the Actions tab.

## Development

```
pip install -r requirements-dev.txt
python -m pytest -q
```

Tests run the weekly and poll jobs end to end against in-memory fakes of Sheets,
GBP, Slack and the Claude drafter (`tests/fakes.py`).
