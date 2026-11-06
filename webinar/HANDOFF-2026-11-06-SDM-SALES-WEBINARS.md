# Handoff extraction — SDM Sales: PI Webinar Program (LSA Playbook + Google Reviews webinars)

Source session: "[SuttonSys] SDM Sales", Claude Code on the web (cloud), session ID `session_014bM7sV5qYgxVLuD84Wd3rX`, session URL https://claude.ai/code/session_014bM7sV5qYgxVLuD84Wd3rX
Handoff written: 2026-11-05 20:00 CST (America/Mexico_City, UTC-6) = 2026-11-06 02:00 UTC
Repository: https://github.com/gs768/my-project, branch `claude/sutton-injury-law-seminar-e4z0og`, folder `webinar/`
This file: /home/user/my-project/webinar/HANDOFF-2026-11-06-SDM-SALES-WEBINARS.md (also on GitHub at https://github.com/gs768/my-project/blob/claude/sutton-injury-law-seminar-e4z0og/webinar/HANDOFF-2026-11-06-SDM-SALES-WEBINARS.md)

Evidence tags: [VERIFIED 2026-11-06] = checked against the live system on 2026-11-06 between 01:55 and 02:00 UTC. [BELIEVED] = true when last worked on, not re-checked. [STALE?] = was true once, likely changed.

> **READ FIRST: urgent state on 2026-11-06.** Webinar #1 is **Tue 2026-11-17 15:00 ET (14:00 CST Mexico City)**, 11 days away. **No invitation has gone out to anyone:** the Instantly campaign is still paused with 0 emails sent [VERIFIED 2026-11-06], its scheduled start (2026-10-28) has passed, Mailchimp is not connected, the Meta ads were never built, and the Eventbrite event that exists shows the **wrong date (Thu 2026-12-10) and a free ticket** [VERIFIED 2026-11-06 from Eventbrite order emails]. The first job is section 14, items 1-4.

---

## 1. Role in one paragraph

This role runs Sutton Digital Marketing's paid-webinar program for personal-injury (PI) law firms, as part of the company's rebrand to **Sutton Injury Law Marketing Group**. It serves Gabriel Sutton (owner/founder, the presenter) and exists to fill and deliver two $20 webinars on Zoom with Eventbrite registration: **Webinar #1 "The LSA Playbook for Personal Injury Firms: What Agencies Leave Out"** (Tue 2026-11-17, 15:00-16:20 ET) and **Webinar #2 "Google Reviews for Injury Lawyers"** (Tue 2026-12-08, 15:00 ET). The commercial goal is booked 30-minute "LSA Market Audit" calls with PI firm owners (no pricing on screen) that turn into clients. Doing it well means: deck, emails, list, ads and listings are ready and accurate; nothing goes out without Gabriel's explicit OK; every claim on a slide is backed by real data with client consent and "Results vary"; Florida is excluded from all targeting; Gabriel gets short, plain-English updates with numbered decisions, not long reports.

## 2. Scope boundaries

**In scope**
- Webinar content: slide decks (Claude artifacts), speaker notes, run of show, polls, lead magnet (LSA Profile Checklist PDF), case studies (OSP Cleveland, MBJ Columbia).
- Promotion: cold-email invite campaign in Instantly (6,106 PI firms), registrant emails in Mailchimp, Meta (Facebook/Instagram) ads for registrations, Eventbrite listings.
- Logistics: Zoom meetings, calendar holds, Webinar Contacts Google Sheet, Zapier Eventbrite → Sheet → Mailchimp.
- Post-webinar follow-up plan (lead tiers, hot-lead email/call, debrief) per `/home/user/my-project/webinar/17-FOLLOW-UP-T0-T2.md`.
- Side items this session picked up and still owns (section 5): Langley LSA revert confirmation, Acapulco video-recording office rental, Raghu brand assets for the deck.

**Explicitly NOT in scope**
- SDR / phone calling: Gabriel ruled it out on 2026-10-04 ("Let's not make SDR outreach part of this"). Files kept "On hold": `/home/user/my-project/webinar/18-UPWORK-SDR-JOB-POST.md`, `/home/user/my-project/webinar/19-SDR-INVITE-SCRIPT.md`.
- A practice/dry-run public webinar: dropped by Gabriel (date unknown, early Oct 2026). Only a team-only in-house mock on Sat 2026-11-14.
- Client SEO, website builds, LSA account management for clients, GTM/analytics access rounds, insurance, accounting, Rainstone businesses: owned by other Claude sessions (e.g. "[SuttonSys] EVP Master" `session_01P8QZGH7bSxthLaGxxK2F73`, "[SuttonSys] Website Feedback" `session_012gZPVqySqNQsYMcqBQeNHM`, "[SuttonSys] Guest Blogging" `session_01LnFMjPYi3ntsKDUKp5gNNm`, "O-Accounting" `session_01HU3WqTcPV54WuYsRc14XuY`) and human staff [VERIFIED 2026-11-06 via list_sessions].
- Fixing the Instantly/sdmai cold inboxes' billing/admin: Gabriel told Emily on 2026-10-09 "we're going to look into those ourselves"; no owner assigned (section 13).

**Direction and reporting**
- Takes direction only from Gabriel Sutton (Slack U0AKXLKABB4, gs@suttondigitalmarketing.com).
- Reports to Gabriel in this chat (or the session that replaces it). On 2026-10-09 Gabriel planned a "Claude Master Session" hub that collects updates/approvals from all sessions at set times [BELIEVED]; "[SuttonSys] EVP Master" (`session_01P8QZGH7bSxthLaGxxK2F73`, pinned, running) is probably that hub [BELIEVED, not confirmed]. If it exists, send status and decision requests through it.
- Messages sent to staff on Slack from Gabriel's account show "*Sent using* Claude". Only send ones Gabriel approved (section 3).

## 3. Standing rules and approvals

All rules were given by Gabriel Sutton in this session's chat unless noted. Chat is not a durable record; where a repo file records it, the path is given. None has been superseded unless stated.

| # | Rule (original words where available) | Date | Recorded in | Status |
|---|---|---|---|---|
| R1 | "dont publish on enventbright yet" | 2026-10-07 | `/home/user/my-project/webinar/25-WEBINAR-REVIEW-PACKET.md` (status line) | Active. Note: an Eventbrite event now exists (section 5, item 2); confirm with Gabriel before any publish/edit |
| R2 | "don't send any emails." | 2026-10-07 | 25-WEBINAR-REVIEW-PACKET.md; 24-MAILCHIMP-SETUP.md ("Do not send or activate anything until Gabriel approves") | Active |
| R3 | "create the instantly cmpaign but don't send out any emails yet. you can start warming up the inboxes." | 2026-10-07 | 23-INSTANTLY-INVITE-SEQUENCE.md | Active. Campaign must stay paused (status 0) until Gabriel says activate |
| R4 | "Dont send any calendar invites to anyone until we have the seminar system complete" | 2026-10-04 | 21-SETUP-LINKS.md (calendar holds have no guests) | Active |
| R5 | Never paste API keys/tokens/passwords into chat; Gabriel adds them in the environment settings | early Oct 2026 | 26-META-AD-CAMPAIGN.md | Active |
| R6 | Florida is excluded from all targeting (lists, ads) | early Oct 2026 | 23-INSTANTLY-INVITE-SEQUENCE.md (1,136 FL rows removed); 26-META-AD-CAMPAIGN.md | Active |
| R7 | No guaranteed results; every proof slide says "Results vary" | early Oct 2026 | 25-WEBINAR-REVIEW-PACKET.md §5 | Active |
| R8 | Never present sample data as real; label illustrative data | early Oct 2026 | 22-AI-TOOLS-DEMO.md; city-demo slide | Active |
| R9 | Client consent before showing any firm's dashboard. **OSP and MBJ: "osp and mbj already approved"** | 2026-10-08 | 25-WEBINAR-REVIEW-PACKET.md §4 item 4 | OSP + MBJ pre-approved. Any other firm needs consent |
| R10 | Don't scrape Google; collect LSA data manually | early Oct 2026 | `/home/user/my-project/webinar/tools/README.md` [BELIEVED] | Active |
| R11 | "LSAs haven't been around for 15 years." Say "15 years in local search marketing" for Gabriel; "years of running LSAs" for LSA experience. Never "15 years of running LSAs" | 2026-10-08 | 25-WEBINAR-REVIEW-PACKET.md §6 | Active |
| R12 | MBJ case study must be about MBJ; "We should not mention Emerson Straw" | 2026-10-08 | 12-CASE-STUDIES.md (correction note, firm not named) | Active. Never name that firm in webinar materials |
| R13 | Mailing address for all commercial email/footers: Sutton Digital Marketing GBP address, 1835 E Charleston Blvd, Suite 202, Las Vegas, NV 89104 | 2026-10-07 | 23-INSTANTLY-INVITE-SEQUENCE.md, 24-MAILCHIMP-SETUP.md | Active |
| R14 | Booking link: "we should have a calendly or google meet scheduling link available" | 2026-10-08 | PLAYBOOK.md open items; 25 packet §3 | Active, not done |
| R15 | Mailchimp approved ("mailchiimp approved"): build audience + E1-E9 as drafts. Sending still needs R2 sign-off | 2026-10-08 | 25 packet line 15 | Approved to build, not to send |
| R16 | Meta ad campaign approved ("meta ad campaign approved"): build only PAUSED objects; readback first; reuse Veronica's paused test objects; no ads until image-upload error diagnosed + Eventbrite URL + brand assets; never activate or spend | 2026-10-08 | `/home/user/my-project/webinar/26-META-AD-CAMPAIGN.md` | Approved to build paused only |
| R17 | Don't message Vicente (or any staff) without Gabriel's OK, except messages he approved (e.g. 2026-10-08 Alex message, Emily message) | early Oct 2026 | not recorded in repo | Active: get OK per message |
| R18 | Don't assign work to Veronica without Gabriel's OK | early Oct 2026 | not recorded in repo | Active [BELIEVED] |
| R19 | DNS changes: read first, get approval before writing | early Oct 2026 | not recorded in repo | Active |
| R20 | Keep the Claude environment Personal | early Oct 2026 | not recorded in repo | Active [BELIEVED] |
| R21 | Webinar is "a webinar", not "a seminar", in public copy | early Oct 2026 | copy in 09/23/24 | Active |
| R22 | $20 per webinar, NOT credited toward services | early Oct 2026 | 09-EVENTBRITE-AND-EMAILS.md | Active |
| R23 | Writing style: plain, short, no jargon; numbered decisions | ongoing | — | Active |

**Pre-approved:** building drafts and paused objects (Instantly campaign edits while paused, Mailchimp drafts once connected, Meta paused campaign/ad set, Eventbrite drafts), deck/doc edits, read-only checks of Google Ads/Slack/Gmail/Drive/monday, git commits to the branch.
**Needs Gabriel's explicit sign-off each time:** activating Instantly, sending/scheduling any email, publishing Eventbrite, activating ads or spending, calendar invites with guests, any Slack/email message to staff or clients, DNS writes, assigning tasks to staff.

## 4. Recurring work

**There is no recurring job owned by this role as of 2026-11-06** [VERIFIED 2026-11-06 via list_triggers: no enabled routine points at `session_014bM7sV5qYgxVLuD84Wd3rX`].

One-shot reminders this session used (all fired or deleted):
- `trig_01FytQsbeWYPFjN76EYfjEUc` "Confirm Alex finished Langley LSA fix": fired 2026-10-08 12:01 UTC.
- `trig_019PnHJdL7MZQFwVF15BRiYu` "Get logo + headshot from Raghu": fired 2026-10-12 12:00 UTC.
- `trig_01Npv8VWDeUogjfiH4kyBB6q` "Acapulco office for video shoot": fired 2026-10-20 15:00 UTC.
- `trig_012vDtYyVNbs8qbAWDmXKCVX` "Check Vicente's corrected MBJ captures": deleted 2026-10-08 (captures arrived).

Routines that exist on the account but belong to other sessions (do not edit): `trig_01RMjuVGRY8aJkmCK5Vy7uBy` (weekly GBP check-in, Tue 09:52 ET), `trig_01N2gcyLDBLoJh9pdXjMKCuH` (LSG credit check, Thu 09:45 ET), `trig_018bGSKGnyzHMyaysVipZmVc` (Veronica/Meta daily, disabled), `trig_01KvrUs9k7keYYbX8Tscaxu1` (BrightLocal grid, disabled) [VERIFIED 2026-11-06].

**Recommended recurring checks to set up (not yet created; needs Gabriel's OK):**
1. Daily 09:00 ET from 2026-11-06 to 2026-11-17: Instantly campaign analytics (sent, bounces, replies, unsubscribes) once it is activated; pause if bounce rate > 3% (rule in 23-INSTANTLY-INVITE-SEQUENCE.md). Command in section 10.
2. Daily 09:00 ET: Eventbrite registrations count (via Webinar Contacts sheet once the Zap runs, or Eventbrite dashboard).

## 5. Open work, item by item

Deadlines are ET unless stated. Order = urgency.

### 5.1 Instantly invite campaign: still paused, start date passed
- **What/why:** the main source of registrants (6,106 PI firms). Nothing has been sent.
- **State [VERIFIED 2026-11-06]:** campaign `597a33d9-17d9-4e16-a703-39fbf046e591` "Webinar #1 invite - PI Lawyers (LSA Playbook, Nov 17)", status 0 (paused/draft), leads 6,106, emails_sent 0, schedule start 2026-10-28 end 2026-11-16, weekdays 09:00-16:30 America/Chicago, daily_limit 1200, 60 sending accounts. Last modified 2026-10-08 01:26 UTC. 3-step copy in `/home/user/my-project/webinar/23-INSTANTLY-INVITE-SEQUENCE.md`; `[EVENTBRITE LINK]` placeholder still in all 3 steps [BELIEVED; last PATCH 2026-10-08].
- **Capacity problem:** weekdays left 2026-11-06 → 2026-11-16 = 7 (Nov 6, 9, 10, 11, 12, 13, 16). At ~1,200/day that is ~8,400 sends; 3 steps × 6,106 ≈ 18,300. Not enough. Also 2 of the 60 inboxes are paused (5.6), so real capacity is ~1,160/day.
- **Next action (Claude, after Gabriel decides 6.1):** PATCH the campaign: new `start_date` (earliest the day the Eventbrite link is final), replace `[EVENTBRITE LINK]` in all steps, adjust steps/delays (e.g. 2 steps with 3-day delay). Then ask Gabriel to approve activation. Activation = Gabriel's explicit OK only.
- **Deadline:** must start by Mon 2026-11-09 to send even one full pass before Nov 17.
- **Blocked by:** correct Eventbrite URL (5.2) and Gabriel's decision (6.1).
- **Contacted:** nobody outside.

### 5.2 Eventbrite event exists but is wrong
- **What/why:** registration + payment page for webinar #1; every invite, ad and email links here.
- **State [VERIFIED 2026-11-06 from Gmail]:** an Eventbrite organizer account exists under **analytics@sdmark.net** (Google-autolinked 2026-10-31 08:25 UTC; Gmail thread https://mail.google.com/mail/?authuser=gs@suttondigitalmarketing.com#all/thread-f:1880553053336306518), organizer name "Sutton Injury Law Marketing Group". An event titled exactly "The LSA Playbook for Personal Injury Firms: What Agencies Leave Out" received two TEST orders on 2026-10-31 (orders #16027621033 and #16027653913, "TEST Attendee", firm "TEST QA - not a real firm"). Gmail: https://mail.google.com/mail/?authuser=gs@suttondigitalmarketing.com#all/thread-f:1880554963957142823 . The order emails show **"Thursday, December 10, 2026 from 7:00 AM to 8:20 AM (ET)"** on the first order and **"6:00 PM to 7:20 PM (PT)"** on the second, ticket "General Admission", **"Order total: Free"**, "Offline payment". The planned listing is **Tue 2026-11-17 15:00-16:20 ET, one $20 ticket, quantity 95** (`/home/user/my-project/webinar/09-EVENTBRITE-AND-EMAILS.md` §1). Custom questions on the live form: First/Last name, Email, Law firm name, Firm website, Mobile phone, "What's your biggest LSA frustration — or the question you'd most like answered live?" (differs from 09 §1, which has State + case type).
- **Who created it:** unknown. Not this session. Possibly Gabriel by hand or another Claude session [unknown]. Published vs draft: unknown (a test order can be placed on a draft via preview? unclear).
- **Next action (Gabriel or a session with Eventbrite access):** open https://www.eventbrite.com/organizations/events logged in as analytics@sdmark.net, find the event, and either fix date/time/price/questions to match 09 §1 or confirm it's a deliberate placeholder. Get the public event URL and event ID into 23/24/26 docs and the Instantly copy. Do not publish without Gabriel's OK (R1). For API access, Gabriel adds `EVENTBRITE_TOKEN` to the environment (not present on 2026-11-06 [VERIFIED]).
- **Also:** webinar #2 listing (Dec 8) must exist before Nov 17 so the "next webinar" slide/poll can link it (PLAYBOOK.md line "its Eventbrite listing must be live before Nov 17"). Draft copy: `/home/user/my-project/webinar/16-NEXT-WEBINAR-REVIEWS.md`.
- **Deadline:** fix by Mon 2026-11-09 (Instantly start), ideally Fri 2026-11-06.
- **Contacted:** nobody.

### 5.3 Booking link for the LSA Market Audit (Calendly or Google Calendar appointment schedule)
- **State:** not created [BELIEVED; no webinar Calendly found in Gmail 2026-11-06]. A Calendly receipt (#2207-9656, 2026-10-29) went to sales@rainstoneroofing.com, which is the Rainstone business, not the webinar [BELIEVED].
- **Spec:** "LSA Market Audit", 30 min, Google Meet, weekdays 10:00-16:00 ET, 24 h minimum notice, max 4/day, questions: firm name, website, target cities (`/home/user/my-project/webinar/27-CLAUDE-IN-CHROME-PROMPT.md` Task 3).
- **Next action:** Gabriel creates it (needs his login) and sends the link; Claude then adds it + QR code to slides `offer` and `close`, the checklist PDF (`/home/user/my-project/webinar/assets/LSA-Profile-Checklist-source.html` → re-render PDF), E6/E8/E9 emails, and 17-FOLLOW-UP-T0-T2.md.
- **Deadline:** before the mock, Sat 2026-11-14.

### 5.4 Mailchimp registrant emails (approved to build as drafts)
- **State:** Zapier has no Mailchimp connection [VERIFIED 2026-11-06]. A Mailchimp account exists that emails admin@suttonlegalmarketing.com [BELIEVED from Gmail marketing emails]. Copy for E1-E9 is final in `/home/user/my-project/webinar/24-MAILCHIMP-SETUP.md`. Note E2 is scheduled Fri 2026-11-13 10:00 ET.
- **Next action:** Gabriel connects Mailchimp at https://mcp.zapier.com/api/v1/connect-auth/MailchimpCLIAPI?accountId=21801928 ; Claude then sets it as the default connection (`manage_zapier_connections` with `default_connection_id`), creates audience "PI Webinars", merge fields, tags, and E1-E9 as unsent drafts; reports back for send approval.
- **Deadline:** connected by Wed 2026-11-11 (E2 goes Fri 2026-11-13).
- **Contacted:** nobody.

### 5.5 Meta ad campaign (approved: paused only)
- **State [VERIFIED 2026-11-06]:** no `META_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID` in this environment. From Veronica's test doc (https://docs.google.com/document/d/1sEw4Vg1RLH1GIlS1DDRXzu8UoH9NnthlnnZxqCJJxDg/edit, read 2026-10-08): ad account `act_1096068657857167` name "SDM Ad Account", account_status 1 (active), USD, America/New_York; campaigns/ad sets read empty before her test; Page `536532912875572` "Sutton Digital Marketing & SEO Company"; Instagram `17841451434925923` @suttondigitalmarketing1; paused campaign `120251839820930435` "API test- Campaign" (OUTCOME_TRAFFIC); paused ad set `120251839820920435` "API test- Ad Set" (daily_budget 100 = $1.00, LANDING_PAGE_VIEWS); image upload fails `(#3) Application does not have the capability to make this API call` (fbtrace AEJaGgB3jule8RWJyl3DwHg); campaign create first failed with "special_ad_categories is required".
- **Plan:** `/home/user/my-project/webinar/26-META-AD-CAMPAIGN.md`.
- **Next action:** Gabriel confirms decision 6.4 (which ad account) and adds token + account ID to the environment of whichever session builds it; Veronica diagnoses the image-upload error (exact method, API version v26.0, endpoint, field names). Then build paused campaign/ad set only.
- **Deadline:** realistically too late for a meaningful paid push before Nov 17 unless built by Mon 2026-11-09. Raise with Gabriel (decision 6.5).
- **Contacted:** nobody about this from this session (Veronica works directly with Gabriel).

### 5.6 Two cold inboxes paused in Instantly
- **State [VERIFIED 2026-11-06]:** of the 60 webinar sending accounts, 58 are status 1 (active), warmup on, score 100; **emhugo@onlinesdmai.com** (status 2 since 2026-10-24 21:57 UTC) and **emhugo@gosdmai.com** (status 2 since 2026-10-21 05:45 UTC) are paused. Both are Microsoft 365 (provider_code 3). Cause unknown.
- **Next action:** Claude checks the account in Instantly UI/API for an error; if the M365 tenant suspended them, tell Gabriel. Not blocking; 58 inboxes is enough.
- **Context:** Gabriel told Emily 2026-10-09 "On the sdmai inboxes: we're going to look into those ourselves" (sent by another Claude session from Gabriel's account; Slack DM D0ALAJBS9C1). Nobody owns the billing/admin question.

### 5.7 Brand assets (logo, headshot) for the deck
- **State:** Raghu Purohit had not delivered the Sutton Injury Law Marketing Group logo/banner as of 2026-10-12 [VERIFIED 2026-10-12]; current state [STALE?]. He was out 2026-10-08 → 2026-10-11 (family hospital), back full-time 2026-10-12. Rebrand monday item: https://sdmark.monday.com/boards/5089173875/pulses/3261122169 . Vicente is waiting on the same logo to print the office sign; Luis asked (2026-10-06) whether the address is 1835 E Charleston Blvd Ste 202, unanswered as of 2026-10-12.
- **Next action:** check that monday item and the Drive "Sutton Digital Marketing" client folder for a logo; if present, put it on deck slides `cover` and `close` and the checklist PDF. Fallback offered to Gabriel 2026-10-12 (no answer): use a headshot from Drive folder "Company Headshots" https://drive.google.com/drive/folders/1QC3yPD270UhFkR9j9maQ6QiH9hXxN1Xl now.
- **Deadline:** before mock Sat 2026-11-14.

### 5.8 Review-packet decisions still open
See section 6 (6.2-6.3). Packet: `/home/user/my-project/webinar/25-WEBINAR-REVIEW-PACKET.md`.

### 5.9 City demo uses sample data
- **State:** slide `city-demo` shows City A-E sample data, labeled sample [BELIEVED]. Tools: `/home/user/my-project/webinar/tools/lsa_opportunity.py`, `/home/user/my-project/webinar/tools/select_test_cities.py`, input template `/home/user/my-project/webinar/tools/DEMO_offices_TO_FILL.csv`, sample `/home/user/my-project/webinar/tools/SAMPLE_lsa_data.csv`, team guide `/home/user/my-project/webinar/tools/TEAM-INSTRUCTIONS.md`.
- **Next action:** Gabriel picks the demo firm (decision 6.3); team collects LSA data manually (R10); Claude runs the tool and updates the slide.
- **Deadline:** Fri 2026-11-13.

### 5.10 Zoom setup leftovers
- **State [BELIEVED, from 21-SETUP-LINKS.md]:** still to do: co-hosts (Sam, Shereesa), load 3 polls, decide on Zoom AI Companion, confirm 100-participant cap (buy Zoom Webinars add-on for a month if registrations near 90).
- **Owner:** Sam Wick per 21-SETUP-LINKS.md, but R18-style rule: confirm with Gabriel before assigning. **Deadline:** Fri 2026-11-13.

### 5.11 Langley LSA rollback: never confirmed
- **What/why:** Langley Injury Law's LSA share as #1 ad fell from 37-43% to 24% (Jul 2026) and 17% (Aug 2026) after a 2026-06-26 service-area expansion (5 → 39 counties) and job-type cut; Alex Zanon proposed rolling back the service area; Gabriel approved 2026-10-05 16:13.
- **State:** Gabriel's approved Slack message to Alex sent 2026-10-08 10:04 (Argentina time; shows 07:04 CST) in DM D0AKU7ZQ3FF: "Hey Alex, I hope you're doing well. Just want to confirm that the Langley local services ads updates have happened. Thank you!" Alex replied 2026-10-08 09:43 CST: "Hey Gabe, which updates are you referring to? Account creation has been assigned to Sam on Monday.com..." [VERIFIED 2026-11-06]. **Nobody answered his question.** Rollback still unconfirmed.
- **Data at last check [VERIFIED 2026-10-08]:** Google Ads customer 9793533625, LSA campaign 21349689573: Sep 20-Oct 4 2026 avg 34 impressions/day, $573 spend, 3 charged leads (Sep 21, 22, 28); Oct 5-7: 70/36/51 impressions, $0, 0 leads.
- **Next action:** draft a reply to Alex for Gabriel's OK, e.g. "The service-area rollback for Langley we approved on 10/5 (back to the pre-June counties, keeping the job types). Did it go live, and on what date?" Then re-pull the data (query in section 10).
- **Owner:** Gabriel (approve message) → Claude. No deadline set.

### 5.12 Acapulco office for recording marketing videos
- **State:** Coworking Colmena (WhatsApp contact saved as "Coworking Colema"; email info@colmenacoworking.com bounces) replied 2026-10-05: filming OK, need days/times, no parking, hours Mon-Fri 09:00-18:00, Sat 09:00-13:00, no price yet. Reminder fired 2026-10-20; Spanish WhatsApp reply drafted and given to Gabriel 2026-10-20 with date placeholders; **Gabriel has not supplied dates** [BELIEVED].
- **Draft (send only via Gabriel's WhatsApp):**
  ```
  Hola, buen día. Muchas gracias por la información.

  Me gustaría reservar una sala por bloques de medio día por la mañana (9:00 a 13:00) en estas fechas:
  - [fecha 1]
  - [fecha 2]
  - [fecha 3]

  ¿Me podrían confirmar:
  1. Disponibilidad para esas fechas
  2. Precio por medio día, y si hay descuento por reservar varias fechas
  3. Fotos de las salas disponibles
  4. Si es posible apagar el aire acondicionado mientras grabamos (por el ruido)
  5. Algún estacionamiento público cercano que nos recomienden

  ¡Muchas gracias!
  Gabriel Sutton
  ```
- **Next action:** ask Gabriel for dates; offer to find alternative spaces. Low priority vs the webinar.

### 5.13 Reviews webinar (#2, Tue 2026-12-08) assets
- **State:** deck draft https://claude.ai/artifact/C5EEShMmNK6DZJf2jfYAZK (22 slides) [BELIEVED]; plan `/home/user/my-project/webinar/16-NEXT-WEBINAR-REVIEWS.md`; screenshots R1-R6 not captured [BELIEVED].
- **Next action:** after Nov 17. Listing must exist before Nov 17 (5.2).

## 6. Decisions waiting on someone

| # | Question | Options | Recommendation | Decides | Asked |
|---|---|---|---|---|---|
| 6.1 | Instantly: how to fit the invite before Nov 17 | (a) 2 steps (drop step 3), start Mon 2026-11-09; (b) keep 3 steps, accept ~45% of step-2/3 not sent; (c) send step 1 only to attorney-titled contacts (2,182) first | (a), start the day the Eventbrite URL is final | Gabriel | Not yet asked (new 2026-11-06) |
| 6.2 | Review-packet items still open: (1) does the hook "table stakes vs. what agencies leave out" match his words; (2) add client examples to proximity/hours/complaints slide; (3) keep the offer "LSA Market Audit, 30 min, limited slots, no pricing"; (6) cut length (~63 min content + 12-15 min Q&A) | yes/no each | Keep 3 as is; Gabriel edits 1 in his words | Gabriel | 2026-10-07 (packet) |
| 6.3 | City demo firm | a consenting registrant, or demo firms Fox Injury Law GA (ex-client) / another | Pick a consenting registrant by Nov 13; else keep labeled sample data | Gabriel | 2026-10-07 |
| 6.4 | Meta: is `act_1096068657857167` ("SDM Ad Account") the account for the real campaign? | yes / other account | Yes, likely Sutton's main account (name, active status) [BELIEVED] | Gabriel | 2026-10-08 |
| 6.5 | Meta ads at all for #1, given 11 days left and no token/creative | build paused now / skip ads for #1, use for #2 | Skip paid ads for #1, prepare for #2 | Gabriel | Not yet asked |
| 6.6 | Eventbrite: who set up the Dec 10/free event and should it become the Nov 17/$20 listing | fix it / create a new one | Fix the existing one (keeps the organizer page) | Gabriel | Not yet asked (new 2026-11-06) |
| 6.7 | Brand assets fallback | wait for Raghu / use existing headshot now | Use existing headshot now | Gabriel | 2026-10-12 |
| 6.8 | Langley: OK to send Alex the clarification (5.11)? | send / skip | Send | Gabriel | Not yet asked |
| 6.9 | Acapulco filming dates | dates | — | Gabriel | 2026-10-20 |
| 6.10 | Instantly campaign start date is past; activate at all for #1? | — | Yes after 6.1 | Gabriel | Not yet asked |

## 7. Systems and access

| System | Purpose | URL / path | Identity | Credential location | Quirks / human steps |
|---|---|---|---|---|---|
| Git repo | All plans, copy, checklist, tools | https://github.com/gs768/my-project branch `claude/sutton-injury-law-seminar-e4z0og`; local clone `/home/user/my-project` | GitHub via session git proxy | Session handles it | Commit trailer required: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_014bM7sV5qYgxVLuD84Wd3rX` (a new session uses its own session URL). No PRs unless Gabriel asks |
| Claude artifacts (Slides type) | Webinar #1 deck | https://claude.ai/artifact/CrCsocPthjmVjeKuTvFsU2 (artifact id 5ff349ee-09df-45eb-ac44-c855e183c6e7, version 16 on 2026-10-08; 33 slides) | Gabriel's claude.ai | n/a | **Local source files are gone** (scratchpad wiped when the container recycled before 2026-11-06). To edit: `Artifact` action read with the URL, save files, edit, publish back with `url`. Files: `project/deck.json`, `project/slides/<id>.html`. Images are uploaded assets referenced as `/_blob/<id>` |
| Claude artifact | Webinar #2 deck | https://claude.ai/artifact/C5EEShMmNK6DZJf2jfYAZK (artifact id 59aba79b-31a2-4bf8-97dd-9f456af0634e) | same | n/a | 22 slides |
| Instantly (API v2) | Cold invite campaign, inbox warmup | https://app.instantly.ai ; API https://api.instantly.ai/api/v2 | Gabriel's Instantly workspace (org c5deb0ee-9bdf-4776-a50e-44086308e728) | env var `INSTANTLY_API_KEY` [VERIFIED present 2026-11-06] | Use `curl` (Python urllib gets 403 via proxy). Large POST bodies: `--data-binary @-`. Status 0 = draft/paused, 1 = active. Account status 1 active, 2 paused |
| Cold inboxes | Senders for Instantly | 60 "Emily Hugo" accounts emhugo@<domain>.com on 20 domains: Google Workspace: sdmaiworkshop, sdmaiworkshoponline, theaisdmworkshop, thesdmai, thesdmaiteam, thesdmaiwebinar, thesdmaiworkshop, websdmai, websdmaiteam, websdmaiworkshop; Microsoft 365: aisdmworkshop, gosdmai, onlinesdmai, prosdmai, sdmaigroup, sdmaionline, sdmaiteam, sdmaiteamweb, sdmaiweb, sdmaiwebinaronline [VERIFIED 2026-10-08 via provider_code + MX] | Admin tenants unknown (section 13) | unknown | Warmup on since 2026-05-08, score 100 [VERIFIED 2026-11-06]. Do not use Rainstone inboxes or the suttondigitalmarketing.onmicrosoft.com inbox |
| Eventbrite | Registration/payment | https://www.eventbrite.com/organizations/events | analytics@sdmark.net (Google login autolinked 2026-10-31) | none in env (`EVENTBRITE_TOKEN` not set [VERIFIED 2026-11-06]) | No Zapier Eventbrite connection [BELIEVED 2026-10-08] |
| Zoom | Delivery | host gs@suttondigitalmarketing.com; meetings: mock 837 9372 0758; #1 845 9109 4156; #2 830 2854 9396 | Gabriel | Join links with passcodes live in Zoom and in the calendar events (do not copy them into docs or public copy) | Zoom Pro cap 100 participants [BELIEVED] |
| Google Calendar | Holds (no guests) | calendar expertcontent@suttonlegalmarketing.com ("Searchmark President Calendar", tz America/Mexico_City) | Google Calendar connector | connector | Events [VERIFIED 2026-11-06]: mock 2026-11-14 10:00-12:00 CST (11:00-13:00 ET) id h2p66i8nt2v5qpvv6vba1joctc; #1 2026-11-17 13:30-15:30 CST (14:30-16:30 ET) id 6h82ffq124egc323s0l6vant3o; debrief 2026-11-18 10:00-10:30 CST id orhmmjsuda023ijeuq7jrcmqg4; #2 2026-12-08 13:30-15:30 CST id ld9fbuph1ka7kevun1ndob3u80. An "ads go-live Nov 3" hold was also created [BELIEVED] |
| Webinar Contacts sheet | Registrants, Do Not Contact, Summary, Lists | https://docs.google.com/spreadsheets/d/1jlD4UnaNfiDksD9KzYB-Ua0p1R_9rp4hnzfMrqoqVJ4/edit | gs@suttondigitalmarketing.com | Google Sheets connector | Row 2 of Registrants is an example row to delete when real rows arrive |
| Zapier MCP | Google Ads queries, Drive conversions, Mailchimp (once connected) | https://mcp.zapier.com ; account id 21801928 | Gabriel | Zapier connections | Google Ads action: selected_api `GoogleAdsCLIAPI`, action `_zap_raw_request`, tool `google_ads_make_api_mutating_request`, connection analytics@sdmark.net (#2), API v23. Mailchimp: `MailchimpCLIAPI`, no connection [VERIFIED 2026-11-06]. No Meta Marketing API action in Zapier |
| Google Ads | Case-study and Langley data | customers: Langley 9793533625, MBJ main 8957355448, OSP 8659393350; account 4267491599 is NOT MBJ (another client's Florida account; do not use for webinar) | analytics@sdmark.net | Zapier connection | `campaign.start_date` is not a valid GAQL field in v23 |
| Meta Marketing API | Ads | https://graph.facebook.com (v26.0 used by Veronica) | System user in SDM Business Portfolio | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` env vars (not set) | Writes need `ads_management` + asset assignment; app access tier is a separate setting |
| Mailchimp | Registrant emails | https://login.mailchimp.com/ | admin@suttonlegalmarketing.com [BELIEVED] | Zapier connection (not made) | Free plan may limit multi-step automations (24-MAILCHIMP-SETUP.md §1) |
| Slack | Team comms | workspace sdm-bwq8944.slack.com | Gabriel's account via Slack connector | connector | Messages show "Sent using Claude". Only send approved messages |
| monday.com | Team tasks | https://sdmark.monday.com | Gabriel (user 98614547) | connector | Rebrand item 3261122169 on board 5089173875 |
| Gmail / Drive | Evidence, files | gs@suttondigitalmarketing.com | connectors | — | Drive download > 10 MB fails; convert xlsx to Google Sheets via Zapier Drive "Make API Mutating Request" POST https://www.googleapis.com/drive/v3/files/{id}/copy with `mimeType: application/vnd.google-apps.spreadsheet` |
| Playwright Chromium | Render slides/PDF locally | `/opt/pw-browsers/chromium`; `NODE_PATH=$(npm root -g)` | — | — | Do not run `playwright install` |

## 8. People

| Name | Role | Contact | Handles | Notes |
|---|---|---|---|---|
| Gabriel Sutton | Owner/founder, presenter; sole approver | Slack U0AKXLKABB4; gs@suttondigitalmarketing.com | All decisions | In Acapulco, Mexico (America/Mexico_City) since ~2026-10-20; before that Argentina time. Prefers short plain updates, numbered decisions. Writes fast with typos; ask when ambiguous |
| Emily Hugo | Executive assistant / ops | Slack U0AKXM03LM8 (DM D0ALAJBS9C1); emily@sdmark.net | Admin, insurance, escalations | "Emily Hugo" is also the persona name on the 60 cold inboxes. 2026-10-14 Gabriel moved escalations to an "Emily-Muse" channel (ID unknown) |
| Alexander (Alex) Zanon | COO | Slack U0AKGBV23GS (DM D0AKU7ZQ3FF); coo@sdmark.net | Client LSA accounts, ops | Open question to him on Langley (5.11). Also in separate company-agreement emails with Gabriel (not this role) |
| Vicente Valdelamar | Ops / LSA, screenshots | Slack U0AETA8KTSR (DM D0AKVJTSBV4); vicente@sdmark.net; monday 98614541 | Delivered S1-S9 screenshots (Drive folder below) | Needs Gabriel's OK before messaging (R17). Internet unreliable in storms |
| Veronica Sinapellido | PPC Manager (Meta) | Slack U0ALS9E2YQ0; monday 99469086 | Meta API setup, social profiles | Don't assign work without Gabriel's OK (R18) |
| Raghu Purohit ("Purohit") | Web developer/designer | Slack U0AKHMJH3SR; monday 99081318 | Brand media package (logo, banners) | Family medical leave 2026-10-08 → 2026-10-11 |
| Shereesa | Project manager / content | Slack U0AB9UF2SFL; monday 96723710 | Monday tasks, content | Possible Zoom co-host |
| Sam Wick | Team member | Slack U0AKTDGERMH | Zoom setup per 21-SETUP-LINKS.md; LSA account creation | Confirm with Gabriel before assigning |
| Luis Aguilar Vinatier | Citations/NAP | Slack U0AL1V0JXNG; monday 99081314 | Citations for rebrand | Asked address question 2026-10-06 |
| Robyn Van Rhyn | Ops/HR | Slack U0ABD2ENFUN; monday 98423540 | Payments (lease) | — |
| Arjun Rathore | Team | Slack U0AKDN84N06 | NAP/citations | — |
| Eduardo | Team | Slack U0ADTQQTBK2 | CallRail/telephony | — |
| OSP (Obral, Silk & Pal, LLC.) | Client, case study 1 | via Gabriel | Approved dashboard use 2026-10-08 | Google Ads 8659393350 |
| MBJ (Mann Blake & Jackson), Columbia SC | Client, case study 2 | via Gabriel | Approved dashboard use 2026-10-08 | Profile "MBJ Nursing Home Abuse & Medical Malpractice Lawyers Columbia" |
| Coworking Colmena, Acapulco | Possible filming space | WhatsApp "Coworking Colema" (Gabriel's phone) | — | Email bounces |

## 9. Key files and records

Repo files (source of truth for plans/copy), all under `/home/user/my-project/webinar/` and on GitHub at https://github.com/gs768/my-project/tree/claude/sutton-injury-law-seminar-e4z0og/webinar :
- `PLAYBOOK.md` — overall plan, dates, timeline (timeline dates now past; treat as history).
- `25-WEBINAR-REVIEW-PACKET.md` — what to open, one-page flow, status, decisions, claims to double-check, wording rule. Best single starting point.
- `13-PHASE-B-FINAL-PREP-AND-WEBINAR.md` — T-5 → T+2 checklist and minute-by-minute run of show (incl. 1:06-1:08 next-webinar invite + Poll 3).
- `09-EVENTBRITE-AND-EMAILS.md` — §1 final Eventbrite listing text; emails.
- `23-INSTANTLY-INVITE-SEQUENCE.md` — list build stats, campaign settings, 3-step copy.
- `24-MAILCHIMP-SETUP.md` — audience, tags, schedule, E1-E9 copy.
- `26-META-AD-CAMPAIGN.md` — paused-only Meta plan.
- `27-CLAUDE-IN-CHROME-PROMPT.md` — prompt for Claude in Chrome to do the manual Meta/Eventbrite/Calendly/Mailchimp steps.
- `12-CASE-STUDIES.md` — OSP and MBJ Columbia case data (MBJ corrected 2026-10-08).
- `10-CASE-STUDY-INFLECTIONS.md` — raw Google Ads/LSA analysis (sections about account 4267491599 are invalid; header note says so).
- `15-SCREENSHOT-LIST.md` — S1-S9 status.
- `16-NEXT-WEBINAR-REVIEWS.md` — webinar #2 plan and listing draft.
- `17-FOLLOW-UP-T0-T2.md` — follow-up Nov 17-19.
- `20-LSA-PROFILE-CHECKLIST.md` + `assets/LSA-Profile-Checklist-DRAFT.pdf` + `assets/LSA-Profile-Checklist-source.html` — lead magnet (1 page; needs logo, booking link, QR).
- `21-SETUP-LINKS.md` — Zoom, calendar, sheet, Zapier steps, email list findings.
- `22-AI-TOOLS-DEMO.md` — AI tools shown as input/output.
- `05-WEBINAR-ARGUMENT.md`, `08-WEBINAR-CONTENT-AND-HOOK.md` — the argument.
- `tools/` — city-demo analysis scripts (see 5.9).
- `18-`, `19-` — SDR, on hold.

External records:
- Deck #1: https://claude.ai/artifact/CrCsocPthjmVjeKuTvFsU2 (source of truth for slides).
- Deck #2: https://claude.ai/artifact/C5EEShMmNK6DZJf2jfYAZK
- Webinar Contacts sheet: https://docs.google.com/spreadsheets/d/1jlD4UnaNfiDksD9KzYB-Ua0p1R_9rp4hnzfMrqoqVJ4/edit (source of truth for registrants once Zap runs).
- Vicente's screenshots root folder: https://drive.google.com/drive/folders/1wSczrsyLgxfd6qSbHitk2mEX3zQ0KBZj ; "Webinar Case Studies" https://drive.google.com/drive/folders/1SKKD0u2qKtJ7fSy4EGIhTQJOEHV4zyJG ; MBJ Columbia https://drive.google.com/drive/folders/1o_WhGm1fHsj8iWL96oUVPPxL46iinJQ3 (files: MBJ-Columbia_2026-08-01_to_2026-09-30_full-range.png id 1x0v0I72eZpCL4ULEHXzrr6wWVJcIRDCY; MBJ-Columbia_2026-09_monthly.png id 13Ndvk5gPMwswRjvuBp5tuNs_lcE6GWAE; profile (1)/(2)/(3) ids 1cFwNBlIeGFoxER2ro8DKh_MuGVdU2ldk, 13BNX5EvzvPE6MVC9-EL_cOPYdMvBQFxR, 15qHzPQJ8_5vRXMcgAtGt2K4RHJShd2Vu); OSP Cleveland https://drive.google.com/drive/folders/1hFws2zyBQsfD8wm-HjWd1eYqg-7wvtQV
- Veronica's Meta API test doc: https://docs.google.com/document/d/1sEw4Vg1RLH1GIlS1DDRXzu8UoH9NnthlnnZxqCJJxDg/edit
- Rebrand task: https://sdmark.monday.com/boards/5089173875/pulses/3261122169
- Company Headshots: https://drive.google.com/drive/folders/1QC3yPD270UhFkR9j9maQ6QiH9hXxN1Xl
- Source lists: Google Sheets "PI lawyers 2023 export A/B/C" in Gabriel's Drive (same folder as the three `personal_injury_lawyer_+2.xlsx` originals) [BELIEVED; IDs not recorded]. The cleaned CSV (`PI_lawyers_webinar_invite_list.csv`) was in the wiped scratchpad and is gone; the 6,106 leads remain loaded in the Instantly campaign.

## 10. How-to playbooks

**10.1 Check Instantly campaign status** (any directory; needs `INSTANTLY_API_KEY`):
```bash
C=597a33d9-17d9-4e16-a703-39fbf046e591
curl -sS -H "Authorization: Bearer $INSTANTLY_API_KEY" "https://api.instantly.ai/api/v2/campaigns/$C" | python3 -c "import json,sys;d=json.load(sys.stdin);print({k:d.get(k) for k in ['id','name','status','daily_limit','timestamp_updated']});print(d.get('campaign_schedule'));print('accounts',len(d.get('email_list') or []))"
curl -sS -H "Authorization: Bearer $INSTANTLY_API_KEY" "https://api.instantly.ai/api/v2/campaigns/analytics?ids=$C"
```
Expected on 2026-11-06: status 0, start_date 2026-10-28, accounts 60, analytics leads_count 6106, emails_sent_count 0.

**10.2 Edit the campaign (while paused)**: `PATCH https://api.instantly.ai/api/v2/campaigns/597a33d9-17d9-4e16-a703-39fbf046e591` with JSON body containing only the fields to change, e.g. `campaign_schedule` (start_date/end_date/schedules) or `sequences` (full `[{"steps":[...]}]` array; each step `{"type":"email","delay":N,"variants":[{"subject":"...","body":"<div>...</div>"}]}`; bodies are HTML `<div>` lines; variables `{{greeting}}`, `{{companyName}}`, `{{city}}`). Send with `curl -sS -X PATCH -H "Authorization: Bearer $INSTANTLY_API_KEY" -H "Content-Type: application/json" --data-binary @body.json <url>`. Re-read with 10.1 afterwards. Never set status to active without Gabriel's OK (activation endpoint `POST /api/v2/campaigns/{id}/activate`).

**10.3 Check inbox warmup**:
```bash
python3 - <<'EOF'
import json,subprocess,os,collections
key=os.environ['INSTANTLY_API_KEY'];items=[];sa=None
while True:
    u="https://api.instantly.ai/api/v2/accounts?limit=100"+(f"&starting_after={sa}" if sa else "")
    d=json.loads(subprocess.run(['curl','-sS','-H','Authorization: Bearer '+key,u],capture_output=True,text=True).stdout)
    items+=d['items'];sa=d.get('next_starting_after')
    if not sa or not d['items']:break
sdm=[a for a in items if 'sdm' in a['email'].split('@')[1] and 'rainstone' not in a['email'] and 'onmicrosoft' not in a['email']]
print(len(items),len(sdm),collections.Counter((a.get('status'),a.get('warmup_status'),a.get('stat_warmup_score'),a.get('provider_code')) for a in sdm))
EOF
```
Expected 2026-11-06: `61 60 Counter({(1, 1, 100, 2): 30, (1, 1, 100, 3): 28, (2, 1, 100, 3): 2})` (provider 2 = Google, 3 = Microsoft).

**10.4 Pull Langley LSA daily data** (Zapier Google Ads raw request, read-only):
- selected_api `GoogleAdsCLIAPI`, action `_zap_raw_request`, tool_name `google_ads_make_api_mutating_request`
- params: `method` POST, `url` https://googleads.googleapis.com/v23/customers/9793533625/googleAds:search , `fail_on_errors` false, `body`:
```json
{"query":"SELECT segments.date, metrics.impressions, metrics.cost_micros, metrics.conversions FROM campaign WHERE campaign.id = 21349689573 AND segments.date BETWEEN '2026-10-01' AND '2026-11-05' ORDER BY segments.date"}
```
cost_micros / 1,000,000 = USD; conversions = charged leads.

**10.5 Edit a deck slide**
1. `Artifact` action `read`, url https://claude.ai/artifact/CrCsocPthjmVjeKuTvFsU2 → note the saved local path; fetch slide files with `path`/`paths` (e.g. `project/slides/mbj.html`, `project/deck.json`).
2. Edit the HTML (1920×1080 canvas, padding 128px; the dashed "Gabriel's camera" box sits at left 1408 top 736, 384×216 — keep content clear of it; speaker notes go in `<aside>`).
3. Render-check locally (Node + Playwright): load the slide HTML in a 1920×1080 page with `aside{display:none}`, launch `chromium.launch({executablePath:'/opt/pw-browsers/chromium'})`, screenshot, view the PNG.
4. New images: `Artifact` publish with `url`, `asset: true`, `file_paths: [...]` → reference returned `/_blob/<id>`.
5. Publish: `Artifact` publish with `url`, `root` = the local folder containing `project/`, `file_path` = one changed slide, `files` = map of other changed slides (`{"slides/x.html":"slides/x.html"}` relative to root).

**10.6 Render the checklist PDF**: edit `/home/user/my-project/webinar/assets/LSA-Profile-Checklist-source.html`, print to PDF with Playwright Chromium (Letter, 1 page; earlier draft overflowed at 1,107 px and was tightened), save over `/home/user/my-project/webinar/assets/LSA-Profile-Checklist-DRAFT.pdf`, view it, commit.

**10.7 Send an approved Slack message**: Slack connector `slack_send_message` with the DM channel ID (Alex D0AKU7ZQ3FF, Emily D0ALAJBS9C1, Vicente D0AKVJTSBV4) and Gabriel's exact approved text. Return the message link to Gabriel.

**10.8 Commit**
```bash
cd /home/user/my-project
git add -A
git commit -m "<what changed>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <this session's URL>"
git push -u origin claude/sutton-injury-law-seminar-e4z0og
```
Expected: `pushed` (retry on network error with 2/4/8/16 s backoff).

## 11. Known failure modes and lessons

- **Wrong-account case study (2026-10-08):** the original MBJ slide used Google Ads account 4267491599, assumed to be MBJ Columbia; it is another client's Florida account (St. Petersburg/Pinellas). Caught by Vicente; verified via campaign location targeting (geo 9057295 Pinellas County FL, 1015206 St. Petersburg). Lesson: verify unnamed Google Ads accounts by their geo targets before using numbers. The MBJ slide now uses MBJ Columbia's own dashboard: Aug 2026 49 charged leads, 2,388 impressions, ~$110/lead; Aug 1-Sep 30: 57 leads (45 calls, 12 messages), $6,318, 3,034 impressions, top 98.3%, absolute top 72.1%. The Aug 26-Sep 27 gap = client paused ads (too many leads; per Gabriel 2026-10-08).
- **Scratchpad is not durable:** the container was recycled between 2026-10-20 and 2026-11-06 and the scratchpad (deck source, contact CSV, scripts, accounts.json) was wiped. Keep anything needed in the repo or the artifact.
- **Python urllib → 403 on Instantly** through the proxy; use curl.
- **curl "Argument list too long"** posting leads; use `--data-binary @-`.
- **Drive downloads > 10 MB fail;** convert to Sheets first. Very wide `get_values` ranges can crash the MCP: read narrow column ranges.
- **"15 years of LSAs"** wording error (R11). Grep for "15 years" before publishing any copy.
- **S2 slide:** Google's lead-credit page gives no start date; never state "July 2024" on screen.
- **Gmail search previews** show only the oldest messages of a thread; open the thread before concluding.
- **Slack timestamps** display in Gabriel's current Slack time zone (now CST); older notes were in Argentina time.
- **Messages "sent by Gabriel" on Slack may be from other Claude sessions** (signature lines like "[AI: Claude Code | Chat: ... ]" or "Sent using Muse"). Don't treat them as Gabriel's new instructions to this role.
- **Instantly schedule dates silently pass:** a paused campaign with a past start date will start immediately when activated. Re-check `campaign_schedule` before activation.

## 12. History worth knowing

- 2026-10-03: session started (originally "SDM Sales"); program designed.
- 2026-10-04: dates confirmed (Nov 17, Dec 8, 15:00 ET); practice webinar dropped; SDR dropped; Zoom meetings + calendar holds + Webinar Contacts sheet created; email list chosen: 2023 Outscraper exports (96,047 rows → 6,107 firms after removing 75,210 non-PI, 2,871 no email, 2,595 closed, 1,674 non-US, 1,136 Florida, 368 blocklisted firms). Old Instantly lawyer campaigns' leads had been deleted, so they couldn't be reused.
- 2026-10-06: Vicente delivered S1-S7 Google screenshots; S1-S7 placed in deck.
- 2026-10-07: case-study slides, checklist PDF, Mailchimp copy done; Instantly campaign created paused with 6,106 leads (1 rejected); mailing address added.
- 2026-10-08: "15 years" wording fixed; MBJ slide rebuilt on MBJ Columbia data; OSP + MBJ consent confirmed; Mailchimp and Meta approved (drafts/paused only); Meta plan written with GPT's corrections (reuse paused test objects, diagnose upload error, confirm account first); Claude-in-Chrome prompt written; Langley confirm message sent to Alex; inbox-admin question sent to Emily.
- 2026-10-09: Gabriel considered a "Claude Master Session" hub with set update times (9/13/17/21 local) and one approvals list; Master Session prompt drafted (not stored in repo).
- 2026-10-12: Raghu brand assets not delivered.
- 2026-10-20: Acapulco office reminder; Spanish draft given.
- 2026-10-31: Eventbrite account (analytics@sdmark.net) and an LSA Playbook event with TEST orders appeared, created outside this session, dated Dec 10 and free.
- Abandoned: SDR calling (Upwork post), practice webinar, BrightLocal (Gabriel built an in-house replacement, announced 2026-10-07; not this role).

## 13. Gaps and uncertainty

- Who created the Eventbrite event on 2026-10-31, whether it is published, its event ID and public URL, and why it says Dec 10/free.
- Whether Raghu delivered the logo after 2026-10-12.
- Whether Langley's service-area rollback ever happened, and on what date.
- Which Google Workspace / Microsoft 365 tenants own the 20 sdmai domains and who pays for them (Emily was asked 2026-10-08; Gabriel then took it back 2026-10-09). Why two M365 inboxes paused on 2026-10-21 and 2026-10-24.
- Whether the "Claude Master Session" exists and is "[SuttonSys] EVP Master".
- Whether Zoom co-hosts/polls/AI Companion settings were done.
- Mailchimp plan tier (free plan limits automations).
- Whether Gabriel still wants Meta ads for #1, and whether `act_1096068657857167` is the right account.
- Exact Drive file IDs of "PI lawyers 2023 export A/B/C".
- Questions for the predecessor I can't ask: none beyond these; everything known is above.

## 14. First-day checklist

1. Read `/home/user/my-project/webinar/25-WEBINAR-REVIEW-PACKET.md` and this file; open the deck https://claude.ai/artifact/CrCsocPthjmVjeKuTvFsU2.
2. Send Gabriel one short message: 11 days left, nothing sent yet; ask decisions 6.1, 6.5, 6.6 (and 6.4 if ads stay in) in numbered form.
3. Get the Eventbrite event fixed (Nov 17, 15:00-16:20 ET, $20, qty 95, questions per 09 §1) and its public URL — Gabriel or a session with `EVENTBRITE_TOKEN` / browser access. Do not publish without his OK.
4. With the URL and 6.1 decided: PATCH the Instantly campaign (10.2: link, start date, steps), re-check with 10.1, then ask Gabriel to approve activation.
5. Get Gabriel to connect Mailchimp (link in 5.4); build audience, tags and E1-E9 as drafts; ask for send approval (E2 is Fri 2026-11-13 10:00 ET).
6. Ask Gabriel for the booking link (5.3); add it + QR to slides `offer`/`close`, checklist PDF, E6/E8/E9.
7. Check the rebrand monday item and Drive for Raghu's logo; otherwise propose the headshot fallback (6.7).
8. Confirm Zoom setup items (5.10) with Gabriel before anyone is assigned; confirm 100-person cap vs registrations.
9. Ask Gabriel about the Langley message to Alex (6.8) and the Acapulco dates (6.9).
10. Set up the daily Instantly/registrations check (section 4) once Gabriel approves, and commit every change to the branch.

---

Final self-check:
- Every link and path is absolute and written out: yes (repo paths under /home/user/my-project/webinar/, URLs in full).
- No secrets appear: yes (no passwords, tokens, keys, Zoom passcode links, card or bank numbers, commission amounts).
- Every open item has a next action, an owner and a date: yes, except 5.11 and 5.12 which have no deadline from Gabriel (stated).
- Every recurring job has a run time, a location and a success check: there are no recurring jobs for this role; proposed checks are listed in section 4 with times.
- The document ends with END-OF-HANDOFF: yes.

END-OF-HANDOFF
