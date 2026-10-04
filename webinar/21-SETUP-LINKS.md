# Setup: Zoom, calendar, contacts sheet, Zapier (created Oct 4, 2026)

## Zoom meetings (host: gs@suttondigitalmarketing.com)
| Event | When (ET) | Zoom meeting ID |
|---|---|---|
| In-house mock (team only) | Sat Nov 14, 11:00 am-1:00 pm | 837 9372 0758 |
| Webinar #1: The LSA Playbook | Tue Nov 17, 3:00-4:30 pm | 845 9109 4156 |
| Webinar #2: Google Reviews for Injury Lawyers | Tue Dec 8, 3:00-4:30 pm | 830 2854 9396 |

Join links (with passcode) are in Gabriel's Zoom account and calendar events; they are not stored here. Paste the webinar join link into each Eventbrite listing's "online event" details, not in public ad copy.

**Settings applied:** waiting room on, attendees muted on entry, cloud recording on, host video on, participant video off, Q&A on.
**Still to do in Zoom (Sam):**
- [ ] Make Sam and Shereesa co-hosts (they must be in the Zoom account to be alternative hosts; otherwise Gabriel promotes them to co-host when the meeting starts)
- [ ] Load the 3 polls (run of show, 13-PHASE-B-FINAL-PREP-AND-WEBINAR.md)
- [ ] Decide on Zoom AI Companion: the account auto-starts meeting summaries and AI questions. For a public webinar, consider turning these off for these meetings
- [ ] Confirm the participant cap (Zoom Pro = 100). If webinar #1 registrations approach 90, buy the Zoom Webinars add-on for one month

## Calendar holds
Added to the Google Calendar connected to Claude (expertcontent@suttonlegalmarketing.com), with no guests invited yet: ads go-live (Nov 3, all day), mock (Nov 14), webinar #1 (Nov 17, team joins 2:30), debrief (Nov 18, 11:00), webinar #2 (Dec 8, team joins 2:30).

## Webinar Contacts sheet
Google Sheet "Webinar Contacts (PI webinars 2026)" in the Sutton Digital Marketing client folder:
https://docs.google.com/spreadsheets/d/1jlD4UnaNfiDksD9KzYB-Ua0p1R_9rp4hnzfMrqoqVJ4/edit

| Tab | What it holds |
|---|---|
| Registrants | Everyone who registers for either webinar: details, paid/attended, tier, poll answers, stage, Meeting 1 date, consent. Florida rows turn red; hot leads turn amber |
| Do Not Contact | Anyone who asks not to be contacted. Checked before every email |
| Summary | Funnel per webinar (formulas; the Example row is excluded) |
| Lists | Dropdown values. Edit here to change the choices |

Row 2 on Registrants is an example of the expected format. Delete it once real rows arrive.

## Zapier: Eventbrite → sheet (about 10 minutes; do once both Eventbrite listings are live)
1. In Zapier, create a Zap. Trigger: **Eventbrite → New Attendee Registered** (connect the Eventbrite account; choose the organizer, and leave Event blank so it covers both webinars, or make one Zap per event).
2. Action: **Google Sheets → Create Spreadsheet Row**. Account: gs@suttondigitalmarketing.com. Spreadsheet: *Webinar Contacts (PI webinars 2026)*. Worksheet: *Registrants*.
3. Map fields: Registered on = order created date · Webinar = event name (or type the exact Lists value per Zap: `#1 LSA Playbook (Nov 17)` / `#2 Google reviews (Dec 8)`) · First/Last name · Email · Phone · Firm, State, Case type (custom questions) · Source = `Eventbrite` · Paid = `Yes` · Stage = `Paid`.
4. Test with a real $20 registration (refund it afterwards), check the row appears, then turn the Zap on.
5. Optional second step: **Mailchimp → Add/Update Subscriber** with tag `seminar-paid` so the confirmation email (E1) starts.

## Email list (checked Oct 4, 2026)
**Instantly:** the digital-marketing campaigns are still there with their copy and stats, but their leads have been removed, so the contact list can't be exported from Instantly.

| Campaign | Contacted | Replies | Opportunities |
|---|---|---|---|
| May 2025 - Personal Injury Lawyers | 9,503 | 41 | 6 |
| Gabriel Copy (copy) - Lawyers (Oct 2024) | 13,550 | 29 | 3 |
| Gabriel Copy (copy) - Lawyers (Nov 2024) | 8,936 | 7 | 2 |
| Kamran's Copy Test - Lawyers | 1,981 | 7 | 1 |
| May 2025 - Other Lawyers | 40 | 0 | 0 |
| Bad Review Removal | 2,978 | 10 | 4 |
| May 2025 - Other Industries | 27,049 | 45 | 4 |

Other campaigns in the account (RR/Rainstone roofing, CENAPs, ESG) are other businesses. The one remaining list, "suttondigitalmarketing.com - AI Sales Agent - AI SDR Master Lead List", has 7 leads.

**Chosen list (Oct 4):** the three 2023 `personal_injury_lawyer_+2.xlsx` exports, converted to Google Sheets ("PI lawyers 2023 export A/B/C", same folder) and cleaned to 6,107 firms. Details: 23-INSTANTLY-INVITE-SEQUENCE.md.

**Other lists found in Google Drive** (not used):
- `Filt_score_PI_lawyer.xlsx` (4 MB, owner coo@suttonlegalmarketing.com, Jul 2026): looks like a filtered, scored PI lawyer list
- `combined_personal_injury_leads.csv` (215 MB, owner coo@suttonlegalmarketing.com, Jul 2026): the large combined source
- Three `personal_injury_lawyer_+2.xlsx` exports (2023 scrapes, 14-29 MB, owner gs@)
- `Attorney Outreach List — May 23 2026` (small Google Sheet)

Before loading: remove Florida, remove anyone on Do Not Contact and past unsubscribes/bounces, and emails are not verified (no credits): watch bounces in the first two days and pause above 3%.
