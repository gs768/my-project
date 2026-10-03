# Webinar build steps (v3: $20 webinar, free/owned tools, no Pipedrive, no GoHighLevel)

Stack (all already in the Tech Stack sheet): WordPress/WP Engine + Gravity Forms · PayPal · Zoom · Mailchimp · Instantly · Facebook Ads · Aircall/Google Voice · Google Workspace (Sheets, Calendar, Apps Script) · Zapier · CallRail · ElevenLabs/TurboScribe · Canva/Adobe

## Phase 1: Decide (Day 1)
- Pick two dates ~2–3 weeks apart: **Webinar #1** (smaller, practice run) and **Webinar #2** (the main push)
- Price $20, pay with PayPal, fully credited if they become a client
- Title: *The LSA Playbook: What Actually Moves PI Firms to the Top of Google Local Services Ads*
- Exclude Florida from every list and audience

## Phase 2: Webinar platform (Day 1–2)
- Use **Zoom Meeting with registration turned on** (your existing plan, $0 extra): attendees muted on entry, waiting room on, cloud recording on, Q&A in chat
- Check your Zoom plan's participant cap (Pro = 100). Only buy the Webinars add-on (~$79+/mo for 1 month) if Webinar #2 registrations exceed it
- Turn on the Zoom registration confirmation email as a backup to Mailchimp

## Phase 3: Registration + payment on the website (Day 2–4)
- WordPress page `/lsa-webinar` (headline, bullets, 3 client videos, host bio, date)
- Gravity Forms form: name, firm, email, phone, state, LSA status, monthly spend, **case type valued most**
- Payment: Gravity Forms PayPal add-on (or a PayPal payment link on the thank-you step), $20
- Thank-you page: Zoom registration link + LSA Lead Dispute Checklist PDF
- GA4 + Meta Pixel "Purchase" event on the thank-you page (GTM, already set up)

## Phase 4: The "CRM" = a Google Sheet (Day 3–4, free)
- Sheet `Webinar Contacts`: one row per lawyer with columns: source, paid, attended, M1 date, M2 date, status, case type, state, last emailed, notes
- Zapier (owned): Gravity Forms entry → new row + Mailchimp contact with tags
- Pipeline statuses: Invited → Paid → Attended / No-show → M1 Booked → M1 Held → M2 Held → Won / Nurture
- Booking: **Google Calendar appointment schedule** "LSA Market Audit" (free, 30 min, max ~10/week)

## Phase 5: Emails (Day 4–6)
- **Mailchimp** (owned): Customer Journey triggered by the "registered" tag: confirmation → 3 days before → 24h → 1h → replay/no-show → book-a-call follow-ups
  - Check the plan's contact limit. If it can't hold ~4–5k contacts, the free fallback is Google Apps Script sending from Gmail off the Sheet (Workspace allows ~1,500/day)
- **Instantly** (owned): 3-step cold invite to the PI email list, minus FL, sent from the warmed cold domains only

## Phase 6: Promotion (start ~10–14 days before each webinar)
- **Facebook:** Mihle runs ads to the 4,000-lawyer custom audience + a lookalike; retarget page visitors who didn't pay
- **Email:** Instantly invites, plus a personal Gmail send to warm contacts/past prospects
- **SDR calls (short sprint):** Aircall / Google Voice, 2–3 days. Script: "Gabriel's doing a $20 PI-only session on LSA rankings, can I text you the link?" Log results in the Sheet. Use CallRail/Twilio to clean numbers first

## Phase 7: Content (Day 5–10)
- Slides in Canva (outline in 02-SEMINAR-BUILD.md §6), 60 min + Q&A
- Ask Man, Blake & Jackson for their video; cut 3 client clips
- LSA Lead Dispute Checklist PDF
- Rehearse once out loud with a timer

## Phase 8: Webinar #1 (practice run)
- Smaller list (e.g., 1,000 FB audience + 500 emails) so mistakes stay cheap
- Afterward: TurboScribe the recording, note what dragged, which questions came up, and where people dropped off; fix slides, emails and the form

## Phase 9: Webinar #2 (main push)
- Full 4,000 FB audience + full email list + SDR sprint
- Replay cut into short clips (Rumble/YouTube/FB) for retargeting

## Phase 10: After each webinar
- Book Meeting 1 from the replay emails and the live call-to-action. **Book Meeting 2 before Meeting 1 ends**
- Non-signers move to Nurture in Mailchimp:
  - Monthly: one Google-spam-filter tip (12 topics in 03-NURTURE-SYSTEM.md)
  - Quarterly: "new idea for {case type} cases in {state}, 15 minutes?" (merge fields from the form)

## Cost
| Item | Cost |
|---|---|
| Everything above (owned tools) | $0 new |
| Zoom Webinars add-on | Only if over the participant cap |
| Facebook ad spend | Your budget |
| Gravity Forms PayPal add-on | Included in Gravity Forms Elite/Pro license; otherwise use a PayPal link |
