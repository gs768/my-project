# Mailchimp setup: webinar #1 registrant emails (ready to load, nothing sent)

**Status (Oct 7):** final copy below. Mailchimp is not connected to Claude (no Zapier connection), so this is loaded by hand by Shereesa or Gabriel, or Claude loads it after a Mailchimp connection is added in Zapier. **Do not send or activate anything until Gabriel approves.**
**Sender:** Gabriel Sutton, from the warmed main-domain inbox (never the cold-outreach domains). **Every email:** plain-text style, physical mailing address `1835 E Charleston Blvd, Suite 202, Las Vegas, NV 89104`, unsubscribe link (Mailchimp adds it).

## 1. Audience setup (one audience for all webinars)
- **Audience:** "PI Webinars" (create once).
- **Merge fields:** FNAME, LNAME, FIRM, STATE, CASETYPE, LSASTATUS, SPEND, WEBINAR.
- **Tags:** `webinar1-paid`, `webinar1-attended`, `webinar1-noshow`, `webinar1-hot`, `webinar2-yes` (Poll 3), `booked-m1`, `nurture-longterm`, `state-FL` (excluded from every send).
- **How contacts get in:** the Zapier step from Eventbrite (21-SETUP-LINKS.md, step 5) adds each paid registrant with tag `webinar1-paid`. Until Zapier is live: export from Eventbrite and import.
- **Plan check:** Mailchimp's free plan limits contacts, monthly sends and multi-step automations. If the account is on the free plan, send E2-E4 as scheduled one-off emails to the tag instead of a multi-step journey.

## 2. Schedule (webinar Tue Nov 17, 3:00 pm ET)
| # | To | When | Type |
|---|---|---|---|
| E1 | Tag `webinar1-paid` | On tag added | Automation (single step) |
| E2 | `webinar1-paid` | **Fri Nov 13**, 10:00 am ET | Scheduled email |
| E3 | `webinar1-paid` | Mon Nov 16, 3:00 pm ET | Scheduled email |
| E4 | `webinar1-paid` | Tue Nov 17, 2:00 pm ET | Scheduled email |
| E6 | `webinar1-attended` | Tue Nov 17, ~5:30 pm ET | Regular email (sent after tags are set) |
| E7 | `webinar1-noshow` | Tue Nov 17, ~5:30 pm ET | Regular email |
| E7b | `webinar2-yes` | Tue Nov 17, evening | Regular email |
| E8 | attended or no-show, not `booked-m1` | Fri Nov 20, 10:00 am ET | Regular email |
| E9 | same | Tue Nov 24, 10:00 am ET | Regular email, then tag `nurture-longterm` |

Hot leads (`webinar1-hot`) get Gabriel's personal email instead (17-FOLLOW-UP-T0-T2.md, H1), not E6.

## 3. The emails

**E1: Confirmation**
> Subject: You're in for Tuesday, Nov 17
>
> Hi \*|FNAME|\*,
>
> Thanks for grabbing a seat. The LSA Playbook webinar is **Tuesday, November 17 at 3:00 pm ET** (12:00 pm PT). Your Zoom link is on your Eventbrite ticket.
>
> One request: reply with the one LSA question you most want answered, and I'll work it into the session.
>
> Gabriel Sutton
> Sutton Injury Law Marketing Group

**E2: Three days before (Fri Nov 13)**
> Subject: Two numbers to pull before Tuesday
>
> Hi \*|FNAME|\*,
>
> If you run Local Services Ads, bring two numbers from your LSA dashboard on Tuesday: your cost per lead and your answer rate. We'll use them in the Q&A. If you don't have them handy, no problem.
>
> I'll also share a 15-point LSA Profile Checklist in the chat.
>
> Tuesday, November 17, 3:00 pm ET. Your Zoom link is on your Eventbrite ticket.
>
> Gabriel

**E3: 24 hours before (Mon Nov 16)**
> Subject: Tomorrow at 3 pm ET
>
> Hi \*|FNAME|\*, quick reminder: The LSA Playbook is tomorrow, Tuesday, at 3:00 pm ET. Doors open at 2:55. Your Zoom link is on your Eventbrite ticket. See you there.
> Gabriel

**E4: 1 hour before (Tue Nov 17)**
> Subject: Starting in an hour
>
> We start at 3:00 pm ET. Join here: [ZOOM LINK]
> Gabriel

**E6: Attendees, same evening**
> Subject: Your replay and the checklist
>
> Hi \*|FNAME|\*,
>
> Thanks for joining today. Here's the replay (available for 7 days): [REPLAY LINK]
> And the LSA Profile Checklist: [CHECKLIST LINK]
>
> If you'd like us to run the city analysis for your firm, book a 30-minute LSA Market Audit here: [BOOKING LINK]
>
> Gabriel
>
> P.S. Next webinar: Google reviews and your local search and LSA results, Tuesday, December 8 at 3:00 pm ET. Seat: [WEBINAR 2 EVENTBRITE LINK]

**E7: No-shows, same evening**
> Subject: Sorry we missed you today
>
> Hi \*|FNAME|\*,
>
> We missed you at today's LSA webinar. Here's the replay (available for 7 days): [REPLAY LINK], and the checklist we shared: [CHECKLIST LINK]
>
> If you'd like us to run the city analysis for your firm, book a 30-minute LSA Market Audit: [BOOKING LINK]
>
> Gabriel
>
> P.S. Next webinar: Google reviews, Tuesday, December 8 at 3:00 pm ET: [WEBINAR 2 EVENTBRITE LINK]

**E7b: Poll 3 "yes", same evening**
> Subject: Your seat for the reviews webinar
>
> Hi \*|FNAME|\*, here's the link for the Google reviews webinar on Tuesday, December 8 at 3:00 pm ET: [WEBINAR 2 EVENTBRITE LINK]
> Gabriel

**E8: Non-bookers, Fri Nov 20**
> Subject: One thing worth doing this week
>
> Hi \*|FNAME|\*,
>
> If you do one thing from Tuesday's webinar, open your LSA dashboard and look at last month's charged leads: which ones Google credited automatically, and which still look invalid. It takes ten minutes, and it tells you whether your case types and service area are set right.
>
> If you'd rather we look at it with you: [BOOKING LINK]
> And the reviews webinar on Dec 8: [WEBINAR 2 EVENTBRITE LINK]
>
> Gabriel

**E9: Non-bookers, Tue Nov 24**
> Subject: Last note from me on this
>
> Hi \*|FNAME|\*,
>
> Last note about the audit. If now isn't the right time, no problem; I'll send a short, useful email once a month about Google and injury firms, and you can unsubscribe anytime.
>
> If it is the right time: [BOOKING LINK]
>
> Gabriel

## 4. Placeholders to fill before anything goes live
`1835 E Charleston Blvd, Suite 202, Las Vegas, NV 89104` · `[ZOOM LINK]` (webinar #1 join link) · `[REPLAY LINK]` · `[CHECKLIST LINK]` (the final PDF in Drive) · `[BOOKING LINK]` (Meeting 1 calendar) · `[WEBINAR 2 EVENTBRITE LINK]`
