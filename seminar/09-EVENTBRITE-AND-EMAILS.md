# Eventbrite listing + registrant emails (draft, $20 webinar)

Fill before publishing: `{DATE}` `{TIME ET}` `{ZOOM LINK}` `{CREDIT}` (decide: is the $20 credited toward services, yes/no) `{FIRM}/{A}/{B}/{C}` (case-study numbers, only from connector data and a screenshot).
No guaranteed results anywhere. Exclude Florida from all targeting.

## 1. Eventbrite listing
**Title:** The LSA Playbook for Personal Injury Firms: What Agencies Leave Out
**Summary (under 140 characters):** A live 60-minute webinar for PI firms on Google Local Services Ads, with real before-and-after case studies. $20.
**Category:** Business & Professional > Marketing. **Format:** Online. **Date/time:** {DATE}, {TIME ET} (show the time zone).
**Image:** HeyGen avatar frame with the date badge (1:1 and 16:9 versions).
**Ticket:** "Webinar seat", $20, fees passed to the buyer, capacity set to the Zoom limit. Sales end 30 minutes before start.

**Description**
> Most agencies say photos, citations and response time are the key to Local Services Ads. Those are table stakes.
>
> In this live webinar for personal injury firms, Gabriel Sutton shows what agencies leave out: the manual work Google doesn't publish and out-of-the-box tools don't do at the level a PI firm needs to compete.
>
> **What you'll see**
> - What Google publishes about how LSAs are ranked, and where agencies stop
> - How we helped {FIRM} go from {A} to {B} in {C} days (real dashboards)
> - Our three-phase rollout: setup with authentic photos and citation work, implementation with AI-assisted lead rating and monitoring, then scaling
> - A live look at how we find the nearby cities where a firm can win LSAs with the fewest stronger competitors
> - Live Q&A. Replay included for ticket holders.
>
> **Who it's for:** personal injury firms already investing in Google. **Not for:** anyone shopping for a low-cost package.
> {CREDIT}
> Results vary. This is marketing education for law firms, not legal advice.

**Eventbrite settings:** online event page with the Zoom link in the "online event" details, order message ("Your Zoom link is below. Bring your LSA cost per lead and answer rate if you have them"), custom question: *"Which case type matters most to your firm?"* (auto / trucking / premises / med-mal / wrongful death / other) plus state and firm name, reminder 24 hours before, refund policy stated.
**Refund policy (suggested):** full refund until 24 hours before; after that, no refund, replay still sent.

## 2. Emails (Mailchimp; recipients are exported from Eventbrite after each sales day)
**E1: Confirmation** (Eventbrite sends its own receipt; this is the personal one)
> Subject: You're in for {DATE}
> Hi {first}, thanks for grabbing a seat. The webinar is {DATE} at {TIME ET}. Your Zoom link: {ZOOM LINK}. Reply with the one LSA question you most want answered and I'll work it into the session. Gabriel

**E2: Three days before**
> Subject: Two numbers to pull before {DATE}
> If you run LSAs, bring your cost per lead and your answer rate from the LSA dashboard. We'll use them in the Q&A. If you don't have them handy, no problem. Link again: {ZOOM LINK}

**E3: 24 hours before:** *Tomorrow at {TIME ET}*: one line, link. **E4: 1 hour before:** *Starting in an hour*, link. **E5 (SMS if consented):** "Starting now: {ZOOM LINK}".

**E6: Attendees, +2 hours**
> Subject: Your replay and next step
> Thanks for joining. Replay: {REPLAY LINK} (available for 7 days). If you'd like us to run the same city analysis for your firm, here's the link to book a 30-minute LSA Market Audit: {BOOK LINK}. Gabriel

**E7: No-shows, +2 hours:** *Sorry we missed you*: replay link plus the same booking link.
**E8: Non-bookers, +3 days:** *One thing from the webinar worth doing this week* (one specific action from the session) + booking link.
**E9: Non-bookers, +7 days:** a last short note, then they move to monthly nurture (spam-filter tips, quarterly "new idea for your {case type}" email; see 03-NURTURE-SYSTEM.md).

Every email: plain text, physical address, unsubscribe. Marketing emails from the warmed main-domain inbox, never the cold-outreach domains.

## 3. The city-analysis offer
For attendees who book Meeting 1, we run `tools/lsa_opportunity.py` for their firm using the manual data collection process (TEAM-INSTRUCTIONS.md). It takes a few hours per firm, so cap Meeting 1 bookings at the number we can prepare per week.

## 4. To decide
- [ ] Is the $20 credited toward services? ({CREDIT} line, FAQ, E6)
- [ ] Date/time, and Zoom capacity
- [ ] Case-study numbers (one firm, verified with a screenshot)
- [ ] How many Meeting 1 audits per week can we prepare
