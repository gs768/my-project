# Prompt for Claude in Chrome: webinar setup (manual touches)

Paste everything below the line into Claude in Chrome, on your own computer, while logged in to Meta, Eventbrite, Calendly and Zapier.

---

You're helping me, Gabriel Sutton, set up my paid webinar "The LSA Playbook for Personal Injury Firms: What Agencies Leave Out" (Tue Nov 17, 2026, 3:00-4:20 pm ET, $20, Zoom). Work through the tasks below in order, in new tabs.

**Rules (all tasks):**
- Never publish, launch, activate, send, schedule or pay for anything. Save as draft and stop.
- Never type, copy or show passwords, 2FA codes, API keys or tokens. When a login, 2FA, payment or API-key screen appears, stop and tell me what to do on that page.
- If something doesn't match what I describe, stop and tell me instead of guessing.
- At the end, give me a short list: done / stopped (and where) / needs me.

**Task 1: Meta ad account history (read only).**
1. Open https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1096068657857167
2. Set the date range to **Maximum** and the filter to show all campaigns, including deleted/archived if the option exists.
3. Tell me: any campaigns besides "API test- Campaign"? Any lifetime spend or impressions? The date of the first and last delivery?
4. Open https://business.facebook.com/billing_hub/payment_activity?asset_id=1096068657857167 and tell me whether there's any past payment activity and the earliest date. Don't change billing.

**Task 2: Eventbrite draft (do not publish).**
1. Open the listing text: https://github.com/gs768/my-project/blob/claude/sutton-injury-law-seminar-e4z0og/webinar/09-EVENTBRITE-AND-EMAILS.md (section 1).
2. Open https://www.eventbrite.com/organizations/events/create and create the event as an **online event** with that title, date/time (Tue Nov 17, 2026, 3:00-4:20 pm Eastern), description, one paid ticket at $20 (quantity 95), the checkout questions, order confirmation message and refund policy from section 1.
3. Save as a draft. Do not click Publish. Give me the draft's URL.
4. Open https://www.eventbrite.com/platform/api-keys and tell me whether a private token already exists. Don't copy or show it. I'll add it to my Claude environment myself as `EVENTBRITE_TOKEN`.

**Task 3: Booking link for the "LSA Market Audit".**
1. Open https://calendly.com/event_types/user/me (if I have no Calendly account, stop and tell me).
2. Create a one-on-one event type: name "LSA Market Audit", 30 minutes, location Google Meet, weekdays 10 am-4 pm Eastern, minimum 24 hours notice, max 4 per day. Questions: firm name, website, the cities you want more cases from.
3. Save it, but don't share it with anyone. Give me the booking link.

**Task 4: Connect Mailchimp to Zapier.**
1. Open https://mcp.zapier.com/api/v1/connect-auth/MailchimpCLIAPI?accountId=21801928
2. Walk me to the authorize screen and stop there for me to approve.
