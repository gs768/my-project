# Client nurture system (Mailchimp + Google Sheet)

The rule: **never stop being useful, rarely ask.** One value email a month, one personal "new idea" ask a quarter.

## 1. Pipeline & tags
Google Sheet stages: Registered → Paid → Attended / No-show → M1 Booked → M1 Held → M2 Booked → M2 Held → **Won** / **Nurture**
Mailchimp tags: `seminar-paid`, `attended`, `no-show`, `m1-held`, `m2-held`, `client-won`, `nurture-longterm`, `next-webinar-yes`, `case-auto|trucking|premises|medmal|wd|other`, `state-XX`

## 2. Post-seminar sequence (workflow "Seminar – After")
| When | Who | Email |
|---|---|---|
| +2h | Attended | *Replay + your 3 action items*: replay, recap, {BOOK_LINK} for the LSA Market Audit |
| +2h | No-show | *Replay (48h)* + same booking link |
| +2 days | Not booked | *The responsiveness number nobody checks*: one insight plus the link |
| +5 days | Not booked | *Last audit slots this week*, P.S. next webinar (Google reviews) |
| +8 days | Not booked | Move to `nurture-longterm` |

## 3. The two meetings
**Meeting 1: LSA Market Audit (30 min)**
- Before: BrightLocal Local Search Grid on 2 core keywords, an LSA ranking check, a CallRail test call to their intake, a look at their site's hub/spoke coverage.
- On the call: show 3 findings, ask about goals and the case type they value, and **book Meeting 2 before you hang up** (the calendar link goes in the chat).
- After: auto email "Recap + what I'll bring on {M2_DATE}".

**Meeting 2: The Plan (45 min)**
- Spoke map for their metros, Responsiveness Engine plan, business hours and complaint review, premium pricing (the $20 webinar fee is not credited).
- If no decision in 7 days: one follow-up, then `nurture-longterm`. **No pressure.**

## 4. Long-term nurture (workflow "Nurture – Long Term", never ends)
**Monthly value email: 1st Tuesday, 9am recipient time, plain text, from Gabriel, no pitch.**
Theme: *Google's spam filters and what they're quietly doing to PI firms.* 12-month calendar:
1. Google's review filter is deleting your best reviews. Here's why.
2. Fake "law firm" listings stealing your map calls (and how to report them)
3. What Google credits automatically on LSA leads (and what to check)
4. Why your Google Ads leads look like spam to your intake team
5. The spam update that hit PI sites with thin city pages
6. Is your contact form landing in your own spam folder? (5-min test)
7. Lead-gen "referral" listings: how Google treats them now
8. Review gating: the shortcut that can get your profile suspended
9. What Google's Helpful Content signals mean for "car accident lawyer + city" pages
10. Spam calls inflating your LSA bill: the check
11. Duplicate profiles from old office moves
12. The year in Google spam updates: what changed for PI

**Draft: Month 1**
> Subject: Google may be hiding your best reviews
> {first}, quick heads-up. Google's review filter removes reviews it thinks look unnatural, and PI firms get hit hard: clients review from the office Wi-Fi, several reviews arrive in one week after a settlement, people use first-name-only accounts. Fix: send review requests by text one at a time, never from your office network, and spread them out. Check your count against what you've requested; the gap is your filtered reviews. No pitch, just something we keep seeing. Gabriel, Sutton Injury Law Marketing Group

**Quarterly "new idea" email: Jan/Apr/Jul/Oct, 2nd Wednesday, personal tone**
> Subject: new idea for {case_type} cases in {state}
> Hi {first}, we've been testing something new for getting more **{case_type}** cases in {state} and it's working better than I expected. I'd rather show you than write it up. Do you have 15 minutes? {BOOK_LINK}. Gabriel

Map the case-type tag to a friendly phrase (`case-trucking` → "trucking accident"). If there's no tag, use "high-value injury cases". Only send it if there's a real idea that quarter; keep a running "ideas" note.

**Rules**
- Replies or bookings remove them from the automated sends and alert Gabriel (Google Sheet activity).
- Unsubscribe, bounce, or `client-won` exits the workflow.
- Retargeting audience: everyone in nurture, 180 days, soft creative (videos, blog posts).
- Florida contacts are tagged and held, not mailed, until FL opens.
- Every email is plain text from a warmed main-domain inbox (not the cold domains), with a physical address and opt-out.

## 5. Reporting (monthly)
Registrations → paid → attended → M1 → M2 → won · cost per signed client vs. kill number · nurture replies and bookings per quarter.
