# Meta ad campaign: webinar #1 registrations (plan, nothing built)

**Approved by Gabriel Oct 8.** Build only paused objects. Never activate, never spend, never publish.

## Whose account
This campaign promotes Sutton Injury Law Marketing Group's own webinar, so it runs in **SDM's own ad account** under the SDM Page/Instagram. It does not touch OSP or MBJ ad accounts (those tokens and assets are unrelated; MBJ also shows an advertising restriction in Business Settings).
- Ad account `1096068657857167`: Veronica's SDM test account. **To confirm with Gabriel:** is this the account the real campaign should run in, or only a test account?
- Page `536532912875572`, Instagram `17841451434925923` (assigned to the system user by Veronica, Oct 7).

## Access (stored only in the building session's private environment)
- `META_ACCESS_TOKEN`: system-user token with `ads_management` and the ad account + Page + Instagram assigned to that system user.
- `META_AD_ACCOUNT_ID`: the confirmed account above.
- The app's Marketing API access tier is a separate app setting from the token's permissions; check it before blaming the token.
- Before building, verify the session can read the variables (names only, never print values).

## Build order
1. **Read back what exists:** `GET /act_<id>/campaigns`, `/adsets`, `/ads`, `/adimages`. Veronica's paused test campaign `120251839820930435` and ad set `120251839820920435` already exist. If they are in the confirmed account, **reuse/rename them** instead of creating a second pair.
2. **Diagnose image upload** before any fix: reproduce one `POST /act_<id>/adimages` and record the Graph API version, endpoint, field names (no token, no image bytes) and the full error (code 3, "Application does not have the capability to make this API call"). The cause is not confirmed yet; check the app's access tier and features, the token's app, and whether the endpoint/version is right.
3. **Campaign:** objective Traffic or Leads-to-site, status PAUSED, no special ad category (legal marketing isn't credit, employment, housing or politics; confirm in Ads Manager).
4. **Ad set:** status PAUSED. US, **excluding Florida**. Audience: personal injury lawyers / law firm owners (job titles, interests). Schedule Oct 28 to Nov 16. Budget left at the minimum until Gabriel sets it.
5. **Ads:** only after the **Eventbrite URL** exists (the destination). Copy from 09-EVENTBRITE-AND-EMAILS.md; images from the deck/branding (Raghu's logo due Oct 12). No promised results; proof claims carry "Results vary."
6. Report back every object id, its status (all PAUSED) and anything not built and why.
