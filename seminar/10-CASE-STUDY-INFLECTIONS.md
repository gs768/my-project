# Case-study inflections from Google Ads / LSA data (2026-10-03)

**Source of truth:** the LSA campaigns in the Google Ads accounts reached through the analytics@sdmark.net connection (CallRail is not used). KPIs: **impressions, spend, charged phone calls** (plus **absolute top impression rate**, see below).
Accounts found: **Langley Injury Law** (9793533625), **Mann Blake & Jackson** (8957355448), **Obral, Silk & Pal, LLC.** (8659393350). Each has one LOCAL_SERVICES campaign, ENABLED.

## Data limits (be honest on the slides)
- **Absolute top impression rate:** the API returns no value for these LSA campaigns. It must come from the LSA dashboard in the browser (screenshot).
- **Charged phone calls:** pulled lead by lead (`local_services_lead`, type PHONE_CALL, `lead_charged`). The Langley monthly counts below were **tallied by hand from the rows and are approximate**; recompute before any number goes on a slide. MBJ and OSP lead counts are **not pulled yet**.
- **MBJ is one account for the firm.** Whether the lift came from Anderson or Columbia needs the location/lead detail. Not yet checked.
- Spend is all LSA lead charges (phone **and** message leads), so don't divide by phone calls alone.
- These are *signals* that something changed. The cause comes from the change log (what we did, when).

## OSP Cleveland (Obral, Silk & Pal): strongest story so far
Spend sat near a **budget ceiling of about $6.3-6.9k a month** from Dec 2024 to Oct 2025, so impressions are the clean signal.
| Month | Impressions | Spend |
|---|---|---|
| Jul 2024 | 78 | $41 |
| Nov 2024 | 1,908 | $3,932 |
| Dec 2024 | 3,492 | $5,045 |
| Jun-Aug 2025 | 1,857 / 1,861 / 1,891 | about $6.5k |
| **Sep 2025** | **4,190** | $6,896 |
| **Oct 2025** | **4,773** | $6,692 |
| Dec 2025 | 1,673 | $6,514 |
| Apr-May 2026 | 3,317 / 3,412 | $7.6k / $8.2k |
| Jul-Aug 2026 | 2,950 / 2,823 | $9.7k / $9.7k |
- **Inflection 1: Nov 2024.** LSA relaunched after a gap (no data Aug-Oct 2024). Impressions went from under 100 to about 1,900-3,500.
- **Inflection 2 (best candidate): Sep-Oct 2025.** Impressions **more than doubled (about 1,890 to 4,190 and 4,773) at flat spend.** That is "more exposure for the same money," the kind of change a ranking improvement produces. Find what we changed in Aug-Sep 2025.
- Then a fall to 1,673 in Dec and a climb through spring 2026, with spend raised to $9.7k.

## Langley (Langley Injury Law)
- **Inflection 1: Oct 2024.** Impressions went from 11-42 a month (Jun-Sep 2024, no spend) to **1,530 in Oct 2024** as LSA went live.
- **Spring 2026 peak.** Impressions climbed from 954 (Feb) to 1,742 (Apr), 1,877 (May), 2,143 (Jun), 2,249 (Jul). Spend rose from $2.0k to a high of $6.8k (May). **Approximate charged phone calls: Mar 15, Apr 21, May 34, Jun 26, Jul 18, Aug 13, Sep 8.**
- **Decline since July:** impressions fall to 976 in September, spend to $1.9k, charged calls to about 8. Something to explain (budget cut, ranking loss, reviews?) before presenting this as a success.
- The earlier flat-spend months (e.g., Dec 2025: $2.2k, 1,009 impressions) give a before/after for spring 2026, but the rise coincides with a spend increase, so impressions per dollar is the fair comparison.

## MBJ (Mann Blake & Jackson)
- LSA spend starts **May 2025** ($499, 116 impressions). **Jul 2025 spike: 1,099 impressions** for $1,264 (Jun was 257), then back to 214 in Aug.
- Steady 2026: Mar $2,035 / 539, Apr $419 / 479, May $1,077 / 546. Impressions fall to 269-373 from Jun to Sep 2026, and spend to about $0.3k a month.
- Weakest case-study candidate: volume is small and declining. Needs lead data to see if charged calls rose despite the lower impressions.

## What this means for the case study
Build the story around **OSP Sep-Oct 2025** (impressions doubled at a flat budget) and **Langley Oct 2024 (go-live) plus the spring 2026 climb**, if the change log supports them. MBJ is the weakest.

## To do next
1. Get the **change log** for OSP (Aug-Sep 2025) and Langley (Feb-Apr 2026).
2. Pull **charged phone-call counts by month** for OSP and MBJ, and re-tally Langley with a script instead of by hand.
3. Screenshot **absolute top impression rate** and review counts/ratings from each LSA dashboard (browser).
4. Confirm the ad-copy blanks: {FIRM} = OSP, {A} = about 1,890 monthly impressions, {B} = about 4,190-4,773, {C} = about 30-60 days (from change log to peak). Verify before use.
