# Eventbrite listing + registrant emails (draft, $20 webinar)

Dates and times are final: webinar #1 Tue Nov 17, 3:00 pm ET. `{ZOOM LINK}` in the emails below = the webinar #1 join link.
No guaranteed results anywhere. Exclude Florida from all targeting.

## 1. Eventbrite listing (final, ready to paste; Oct 4)
**Title:** The LSA Playbook for Personal Injury Firms: What Agencies Leave Out
**Summary (under 140 characters):** A live webinar for PI firms on Google Local Services Ads, with real injury-firm dashboards. $20, replay included.
**Category:** Business & Professional > Marketing. **Format:** Online event.
**Date/time:** Tuesday, November 17, 2026, 3:00-4:20 pm Eastern Time (Eventbrite shows each buyer their own time zone).
**Image:** HeyGen avatar frame with a "Tue Nov 17 · 3 pm ET" badge (2160×1080 for Eventbrite; 1:1 for social).
**Ticket:** "Webinar seat", $20, fees passed on to the buyer, quantity 95 (Zoom Pro holds 100 including the team). Sales end 30 minutes before start.

**Description**
> Most agencies say photos, citations and response time are the key to Google Local Services Ads. Those are table stakes.
>
> In this live webinar for personal injury firms, Gabriel Sutton, who has spent 15 years in local search marketing and runs LSAs for injury firms, shows what agencies leave out: the manual work Google doesn't publish, and what actually moves a firm up in LSAs.
>
> **What you'll see**
> - What Google publishes about how LSAs are ranked, and where agencies stop
> - What years of running LSAs for injury firms show about proximity, business hours and complaints
> - Two real injury-firm profiles: an existing profile whose impressions rose about 2.5x at the same budget, and a new profile that produced 17 charged leads in its first full month
> - Our three-phase rollout, and the AI tools behind it
> - A live look at how we find the nearby cities where a firm can win LSAs with the fewest stronger competitors
> - Live Q&A. The replay is included for ticket holders.
>
> **Who it's for:** owners and partners of personal injury firms already investing in Google.
> Results vary. This is marketing education for law firms, not legal advice.

**Online event page (only ticket holders see it):** the Zoom join link for webinar #1 (Zoom meeting 845 9109 4156; the full link with passcode is in Gabriel's Zoom account and calendar event), plus: "Doors open at 2:55 pm ET. Bring your LSA cost per lead and answer rate if you have them."
**Order confirmation message:** "You're in. Your Zoom link is on your ticket and in the 'online event' page. The replay goes to every ticket holder within 24 hours. Gabriel"
**Checkout questions:** Firm name (required) · State (required, dropdown) · Which case type matters most to your firm? (Auto / Trucking / Premises / Med-mal / Wrongful death / Other) · Are you running Google LSAs today? (Yes, happy / Yes, unhappy / Paused / Never) · Monthly marketing spend (optional: under $5k / $5-15k / $15-30k / $30k+)
**Reminders:** Eventbrite's automatic 24-hour reminder on; Mailchimp sends the rest (section 2).
**Refund policy:** full refund until 24 hours before the event; after that no refund, and the replay is still sent.
**Organizer profile:** Sutton Injury Law Marketing Group, new logo (Oct 12), one-line bio for Gabriel, website link.
**After publishing:** send Claude the event URL. Claude makes the QR codes, fills `[EVENTBRITE LINK]` in the Instantly sequence and the ads, and sets up the Zapier step.

## 2. Emails (Mailchimp; recipients are exported from Eventbrite after each sales day)
**E1: Confirmation** (Eventbrite sends its own receipt; this is the personal one)
> Subject: You're in for Nov 17
> Hi {first}, thanks for grabbing a seat. The webinar is Tuesday, November 17 at 3:00 pm ET. Your Zoom link: {ZOOM LINK}. Reply with the one LSA question you most want answered and I'll work it into the session. Gabriel

**E2: Three days before**
> Subject: Two numbers to pull before Nov 17
> If you run LSAs, bring your cost per lead and your answer rate from the LSA dashboard. We'll use them in the Q&A. If you don't have them handy, no problem. Link again: {ZOOM LINK}

**E3: 24 hours before:** *Tomorrow at 3 pm ET*: one line, link. **E4: 1 hour before:** *Starting in an hour*, link. **E5 (SMS if consented):** "Starting now: {ZOOM LINK}".

**E6: Attendees, +2 hours**
> Subject: Your replay and next step
> Thanks for joining. Replay: {REPLAY LINK} (available for 7 days). If you'd like us to run the same city analysis for your firm, here's the link to book a 30-minute LSA Market Audit: {BOOK LINK}. Gabriel
> P.S. Next webinar: Google reviews and your local search and LSA results, {NEXT DATE}. Seat: {NEXT EVENTBRITE LINK}

**E7: No-shows, +2 hours:** *Sorry we missed you*: replay link plus the same booking link, with the same P.S. about the next webinar.
**E7b: Poll 3 "yes", same night:** *Your seat for the reviews webinar*: the Eventbrite link only, no audit pitch.
**E8: Non-bookers, +3 days:** *One thing from the webinar worth doing this week* (one specific action from the session) + booking link + next-webinar link.
**E9: Non-bookers, +7 days:** a last short note, then they move to monthly nurture (spam-filter tips, quarterly "new idea for your {case type}" email; see 03-NURTURE-SYSTEM.md).

Every email: plain text, physical address, unsubscribe. Marketing emails from the warmed main-domain inbox, never the cold-outreach domains.

## 3. The city-analysis offer
For attendees who book Meeting 1, we run `tools/lsa_opportunity.py` for their firm using the manual data collection process (TEAM-INSTRUCTIONS.md). It takes a few hours per firm, so cap Meeting 1 bookings at the number we can prepare per week.

## 4. To decide
- [ ] Date/time, and Zoom capacity
- [ ] Case-study numbers (one firm, verified with a screenshot)
- [x] Two analyses per meeting. Firms confirm beforehand that we may run and present their analysis (see PLAYBOOK 7b)
