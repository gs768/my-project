# Sutton Injury Law Marketing Group: PI Webinar Playbook (v4, 2026-10-03)

**Goal:** sign personal injury firms (all US states **except Florida**) at premium rates, using a low-cost paid webinar, a two-meeting close, and patient long-term nurture.
**Origin:** v1 Setup Manual by Sam, Miguel & Álvaro (Instantly edition, shared 2026-09-07). This version replaces it and files 01–06.
**Principles:** use tools we already own, build free where possible, run two webinars (the first one is practice), be patient.

---

## 1. Brand & website
- **Name:** Sutton Injury Law Marketing Group (Gabriel is handling the legal name change and GBP).
- **WordPress updates (small set only):** top-left logo · body copy · structured data (`name`, `alternateName: "Sutton Digital Marketing"`, `logo`, `areaServed` = US minus FL) · footer.
- **Homepage videos (3):** Mann Blake & Jackson (requested via draft email 2026-10-03) · Brown, Bass & Jeter (Katrina Brown) · Langley Law Firm.

## 2. The offer
| Item | Decision |
|---|---|
| Format | Pre-scheduled **webinar** on Zoom (online, not in person), ~60 min + Q&A |
| Price | **$20**, not credited toward services |
| Title | *The LSA Playbook: What Actually Moves PI Firms to the Top of Google Local Services Ads* |
| Date | **November 15, 2026 (placeholder, time TBD)** |
| Runs | **Webinar #1** (practice, smaller audience) → fix → **Webinar #2** (~3 weeks later, full push) |
| Audience | PI firm owners/partners, all states except FL; best fit is 3+ attorneys already spending on Google |
| Registration questions | Name, firm, email, phone, state, LSA status, monthly marketing spend, **case type they value most** (used in nurture) |

## 3. Team (active per HR sheet)
| Person | Role |
|---|---|
| Gabriel | Host, final edits, AI avatar, client relationships |
| Sam | Project lead, Instantly, build checklist |
| Veronica (Google Ads & social ads manager) | Facebook/social ads. **Not assigned yet** |
| Shereesa | Slides, emails, Mailchimp, event listings, nurture |
| Arjun | Google screenshots, WordPress page/schema |
| LLM connectors (Claude) | Case-study data (LSA, CallRail, BrightLocal), Instantly, Google Tag Manager, G Suite |
| Robyn | Review screenshots (client permissions are already in hand) |
| Alexander Zanon (COO) | Client video coordination |
| Upwork SDR contractor | Outreach / calls (to be hired) |
| Raghu | Web/forms/tracking, if available |

Mihle and Romina are gone; the LLM connectors now manage Instantly, Google Tag Manager and G Suite. The tech stack sheet still lists them as owners; update it.

## 4. Tool stack ($0 new except ads)
| Need | Tool (already owned / free) |
|---|---|
| Registration + $20 payment + Zoom link + reminders | **Eventbrite** (free listing; ~$1–2 ticket fee passed to the buyer), embedded on the WordPress page. Backup: Gravity Forms + PayPal |
| Webinar room | **Zoom** meeting with registration (muted entry, waiting room, cloud recording). Add Zoom Webinars for one month only if over the participant cap |
| Contacts / pipeline | **Google Sheet** "Webinar Contacts" (replaces Pipedrive and GoHighLevel) |
| Automations | Zapier: Eventbrite/Gravity Forms → Sheet + Mailchimp |
| Registrant + nurture email | **Mailchimp** (check that the contact limit covers ~5k; free fallback: Apps Script + Gmail off the Sheet) |
| Cold email invites | **Instantly** (warmed cold domains only; dedicated Outlook + Gmail inboxes; the inbox domains forward to a separate website, so cold-email links never point at the main site). API access: see 11 |
| Booking | **Google Calendar appointment schedule** "LSA Market Audit" (30 min, ≤10/week) |
| Calls | Aircall / Google Voice; numbers cleaned with Twilio |
| Video | ElevenLabs (avatar/voice), TurboScribe (transcripts), Canva/Adobe |
| Tracking | GA4 + Meta Pixel via GTM, `Purchase` event on the thank-you page |
| Case-study data | LSA dashboards, BrightLocal, CallRail |

**Not used:** Pipedrive, GoHighLevel (candidate to cancel).

## 5. The argument (the core of the webinar)
**Chain:** what Google *says* ranks LSA → what Google *punishes* → the strategy that satisfies both → proof from clients.
**Hook:** "Every agency says the LSA secret is citations and photos. Google never says that. Here's what Google does say."

**Act 1: Google's own words (~10 min).** Screenshots with URL and date visible:
- LSA ranking factors: proximity, review score/count, **responsiveness**, hours, complaints
- Lead crediting (automated since July 2024; manual disputes are outdated)
- Reviews feeding LSA
- Google Ads Quality Score (landing page experience) for the Search Ads PI firms run alongside LSA

**Act 2: What Google punishes (~10 min).**
- Doorway pages (city-swap pages)
- Scaled content abuse (2024 spam update)
- Site reputation / expired domain abuse
- Fake or batched reviews
- GBP name keyword stuffing

**Turn:** "Google rewards local relevance, responsiveness and real reviews, and it punishes fake scale. Very few firms do both."

**Act 3: The strategy (~15 min). Show the what and why, hold back the how.**
1. **Hub-and-Spoke Local Authority, the spam-proof version:** fewer, better spoke pages, each with real local proof. Helps local relevance and Search Ads Quality Score.
2. **Responsiveness Engine:** answer rate, speed to lead, after-hours coverage, missed-call text-back.
3. **Filter-safe review velocity:** one-by-one requests, never batched.
4. **What Google doesn't publish:** from 15 years running LSAs, **proximity, business hours and complaints** also affect ranking (Gabriel's field experience; present it as that, next to Google's own list).
⚠️ Say "LSA ranking signals + Search Ads Quality Score". LSA itself has no Quality Score.

**Act 4: Proof (~15 min).** Final picks: **OSP Cleveland** and **MBJ Columbia (medical malpractice)**; see 12-CASE-STUDIES.md. Same before → what we did → after format for each firm:
- **Obral Silk & Pal (OSP)** (Cleveland; strongest case-study candidate, see 10)
- **Langley Law Firm**
- **Maier Gutierrez & Associates** (spelled "Maier" in their email signature)
Show LSA dashboard (leads, cost/lead, credited leads, reviews) + BrightLocal grid / CallRail answer rate. One headline number per firm, plus a quote/clip.
Requirements: written permission, redact caller data, "results vary" footnote, no guarantees.

**Close (~5 min):** recap the chain · 3 things to do this week (review last month's charged leads and check which ones Google credited, check answer rate, stop batch review requests) · CTA: book the **LSA Market Audit**.

## 6. Promotion
**Phase A: Warm-up ads (start now, 3–4 weeks before webinar ads)**, run by Veronica
- Video-view + engagement campaigns to the **~4,000-lawyer Facebook custom audience** (exclude FL), ~$10–20/day, no webinar mention.
- Content: 5 AI-avatar clips. (1) Citations aren't the LSA secret. (2) Google ranks how fast you answer. (3) You can get credit for bad LSA leads. (4) Why cheap city pages hurt PI firms now. (5) The review mistake after a big settlement.
- Builds retargeting pools (video viewers, site visitors, engagers) and pixel history.

**Phase B: Webinar promotion (~14 days before each webinar)**
- **Facebook:** retarget warm pools first, then the cold 4,000 list + lookalike. Optimize for `Purchase`. Retarget non-buyers at 7 and 3 days out, and the day before.
- **Avatar promo videos:** invitation · "Google screenshot" teaser · client-result teaser · last call. Turn on Meta's **AI info label**. Record the final invite as a real selfie video.
- **Email:** Instantly 3-step cold invite (FL removed, conservative send limits) + personal Gmail to warm contacts.
- **SDR sprint (Alexander, 2–3 days):** "Gabriel's running a $20 PI-only session on LSA rankings, can I text you the link?" Log in the Sheet.
- **Free listings:** Eventbrite · Facebook Event · LinkedIn Event (Gabriel + company page) · AllEvents/Luma · PI attorney groups (value post, follow group rules) · email signature + website banner.

## 7. Registrant emails (Mailchimp, or Eventbrite reminders for #1)
Confirmation + checklist PDF → 3 days before ("bring your LSA cost-per-lead and answer rate") → 24h → 1h → starting now → replay (attendees) / replay 48h (no-shows).
Lead magnet: **LSA Profile Checklist** (bid, reviews, response time, plus proximity, business hours and complaints) (1 page).

## 7b. Choosing which firms to target (analysis consent)
Before a firm is added to the target list, **confirm we may run its city-opportunity analysis and present it in the meeting** (the analysis uses its public LSA and review data, plus screenshots). Record the confirmation (email or call note) in the Sheet. No confirmation, no analysis. **Capacity: 2 analyses per meeting.**

## 7c. Three days before the webinar: prepare examples for registered firms
- **T-3 days:** review the registrant list in the Sheet. For firms that signed up (cap: **2 analyses per meeting**), check public signs we can fix: **stock photos on the LSA profile**, **slow response time**, **negative reviews that appear to violate Google's review policies** (we can request removal through Google's process; removal is never guaranteed).
- **Consent first:** before showing any firm's profile live, **email them privately**: "we've prepared an analysis for your firm, OK to show it?" Record the answer in the Sheet. No confirmation, no live critique.
- **At the start of the webinar:** ask whether anyone from the prepared firms is here (only firms that said yes).
- **Fallback if only 1-2 people show up:** invite people from Gabriel's network to attend. Mark them in the Sheet as `network`, tell them to expect a real working session, and don't count them as organic registrations or present them as customers or testimonials.

## 8. Conversion: two meetings
1. **Meeting 1, LSA Market Audit (30 min).** Before: BrightLocal grid, LSA rank check, a test call to their intake, hub/spoke coverage check. On the call: 3 findings, their goals, the case type they value. **Book Meeting 2 before hanging up.**
2. **Meeting 2, The Plan (45 min).** Spoke map, responsiveness plan, hours and complaint review, premium pricing. One follow-up within 7 days, then nurture. No pressure.

Sheet statuses: Invited → Paid → Attended / No-show → M1 Booked → M1 Held → M2 Held → Won / Nurture.

## 9. Long-term nurture (never ends)
- **Monthly (1st Tuesday):** one genuinely useful plain-text email from Gabriel on *Google's spam filters and PI firms*. 12 topics: review filter · fake listings · LSA lead crediting · spam-looking Ads leads · thin city pages · contact forms in spam · lead-gen listings · review gating · helpful content · spam calls on the LSA bill · duplicate profiles · year in review.
- **Quarterly:** "Hi {first}, we have a new idea for getting more **{case type}** cases in {state}. Do you have 15 minutes?" + booking link. Only send it when there's a real idea.
- Replies/bookings pull them out of automation and alert Gabriel. Unsubscribe/won ends it. FL contacts are held, not mailed.
- Retargeting stays on nurture contacts for 180 days.

## 9b. Program phases
A = now to T-5 · **B = T-5 to T+2 (final prep, webinar, immediate follow-up; see 13-PHASE-B-FINAL-PREP-AND-WEBINAR.md)** · C = T+2 to 5 days before webinar #2 · D = 5 days before webinar #2 to 2 days after it · E = everything else.

## 10. Timeline (Webinar #1 ≈ 5 weeks out)
| Week | Actions |
|---|---|
| 0 | Fix account ownership · avatar clips · warm-up ads live · confirm Zoom cap and Mailchimp limit · request client permissions + MBJ video |
| 1 | Google screenshots · case-study data · Eventbrite + WordPress page · Sheet + Zapier · Calendar booking |
| 2 | Slides v1 · emails in Mailchimp · Instantly campaign loaded (paused) · checklist PDF |
| 3 | Webinar ads + Instantly + listings live (~14 days out) · rehearsal with timer |
| 4 | SDR sprint · reminders · final dry run |
| 5 | **Webinar #1** → transcript + debrief → fix slides, emails, ads → schedule #2 |
| 8 | **Webinar #2** (full 4,000 audience + full email list + SDR) → cut replay into clips |
| Ongoing | Meetings 1 & 2 · monthly + quarterly nurture · monthly report |

## 11. Measure (monthly)
Ad reach / warm pool size → registrations → paid → attended → M1 → M2 → won · cost per registration · cost per signed client · nurture replies and bookings per quarter.

## 12. Open items
- [ ] Confirm the spelling "Obral Silk & Pal (OSP)"
- [ ] Video links for the MBJ email (draft in Gmail, not sent)
- [ ] Zoom participant cap and Mailchimp plan limit
- [ ] Webinar #1 date
