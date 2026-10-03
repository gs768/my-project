# Sutton Injury Law Marketing Group — Paid Seminar Playbook (v2)

**Based on:** "Law Firm Webinar Acquisition System — Setup Manual (Instantly.ai Edition)" by Sam, Miguel and Álvaro (Google Doc `1d7IwTgEyylr…`, shared by Sam on Slack 2026-09-07), plus the Webinar-Project-Facts doc and the Webinar expense sheet.
**What changed from v1:** paid seminar instead of free, PI only, nationwide except Florida, new brand, LSA topic, social retargeting added, two-meeting close, long-term nurture.

> Heads-up: on 2026-09-08 you told Sam in Slack "Let's not do the seminars… other plays are more scalable." Let Sam know the project is back on so he doesn't think it's still on hold.

---

## 0. Brand decision

**My recommendation: Sutton Injury Law Marketing Group**

| | Injury **Law** Marketing Group | Injury **Lawyer** Marketing Group |
|---|---|---|
| Reads like | A firm that knows the practice area | A vendor that sells to lawyers |
| Length / logo fit | Shorter, flows better | One more syllable, slightly clunky ("Lawyer Marketing") |
| SEO | "injury law marketing" is a real phrase | "injury lawyer marketing" gets a bit more search volume |
| Fit with the premium price | Better | Fine |

The name is for trust, not for ranking. The SEO gap is small, and you can still target "personal injury lawyer marketing" in page copy and schema `description`/`knowsAbout`. Short form: **Sutton Injury Law** (or "SILMG" internally only). Check the domain and social handles before you commit.

**Website changes (WordPress, small set only):**
1. Logo in the top-left header: new name.
2. Body copy: change "Sutton Digital Marketing" to the new name everywhere it appears.
3. Structured data: `Organization`/`ProfessionalService` `name`, `alternateName: "Sutton Digital Marketing"` (keeps continuity), `logo`, `description`, `areaServed` (US minus FL).
4. Footer: name and © line.
5. Homepage videos (3): **Man, Blake & Jackson** (new PI video, to be requested), **Brown, Bass & Jeter**, **Langley Law Firm**.
6. Leave URLs, Google Business Profile and email domains alone for now. Changing the GBP name needs to match real-world signage and documents, so do that as a separate step.

---

## 1. Foundation & Decisions (Facts Sheet updates)

| Item | v1 | **v2** |
|---|---|---|
| Niche | PI or Family | **Personal Injury only** |
| Region | FL, GA, AL | **All US states except Florida** (FL excluded "for now") |
| Price | Free | **Paid.** Suggested $297 (early) / $497 (regular), fully credited toward the first month if they sign within 30 days |
| Title | "Capture More Consultations…" | **"The LSA Playbook: What Actually Moves Personal Injury Firms to the Top of Google Local Services Ads"** |
| Promise | 3 intake leaks | Why most PI firms overpay for LSA leads, and the 3-layer system top-ranked firms use |
| Host | — | Gabriel Sutton |
| Firm size target | 1–10 attorneys | 3–25 attorneys, already spending on LSA or Google Ads (they can afford premium rates) |
| Kill number | 3 months' fee | 3 months of the **new, higher** retainer. Patient nurture is fine, so measure on a 12-month window |

**Qualifying questions on the registration form:**
1. Are you currently running Google Local Services Ads? (Yes, happy / Yes, unhappy / Paused / Never)
2. Monthly marketing spend? (<$5k / $5–15k / $15–50k / $50k+). Treat <$5k as low priority.
3. Which case type do you value most? (Auto / Trucking / Premises / Med-mal / Wrongful death / Other). **Save this field; the quarterly nurture uses it.**

---

## 2. Seminar content: "give a lot, hold back the how"

The goal: they leave knowing exactly *what* to do, convinced it's real, and seeing that doing it themselves takes too much time and skill.

**What we give away (real value):**
- How LSA ranking actually works: proximity, review count and recency, responsiveness, business hours, verification, and complaint history. Google confirms these factors.
- Why "citations and photos" is the wrong answer. It's what most agencies call their secret sauce, and it's minor.
- The lead-dispute process: how many PI firms pay for unbillable leads (wrong case type, out of area, spam) and never get credited back.

**The headline "secret sauce": The Hub-and-Spoke Local Authority System**
- Hub: one strong PI practice page per metro. Spokes: city/neighborhood × case-type pages, each with real local proof (courthouses, crash corridors, local results) and internal links back to the hub.
- How to pitch it: it strengthens the local relevance and prominence signals behind the firm's map and LSA presence, and it raises **Quality Score** on the Google Search Ads campaigns most PI firms run alongside LSA. That means a lower CPC on the same clicks.
- ⚠️ **Wording guardrail:** LSA has no "Quality Score". That term belongs to Google Search Ads. In the room, say *"LSA ranking signals + Search Ads Quality Score."* Sophisticated PI firms will notice the mix-up, and it would hurt credibility at a premium price.

**The second clever layer I recommend: "The Responsiveness Engine"**
LSA rewards firms that answer fast and reliably, and most PI intake loses here. Show the *outcome* (answer-rate and response-time metrics, a missed-call text-back, a 24/7 routing tree, and a weekly dispute routine). Don't show the build. This idea is concrete and checkable, and you can show it with CallRail data. Nobody else is talking about it.

**What we hold back:** the page templates, the internal-link map, the spoke selection model, the call-routing build, and the dispute scripts. Show screenshots, not files.

**Slide outline (60–75 min):**
1. Title / Gabriel / no fluff promise
2. Proof: Man, Blake & Jackson, Brown, Bass & Jeter, and Langley (short clips)
3. What PI firms are paying per signed case on LSA (benchmarks)
4. How LSA ranking really works
5. The myth: citations and images
6. Layer 1: Responsiveness Engine (outcomes only)
7. Layer 2: Hub-and-Spoke Local Authority (diagram, one anonymized before/after)
8. Layer 3: Lead disputes and credits recovered
9. "Why this is hard to do in-house" (time, skills, ongoing weekly work)
10. 3 things to do this week
11. Invitation: Strategy Meeting 1 (limited slots)
12. Q&A

Compliance: these are marketing claims made to lawyers, so no guaranteed rankings or results, and no client numbers without permission. CAN-SPAM opt-out on every email.

---

## 3. Traffic

| Channel | Owner | Notes |
|---|---|---|
| Cold email (Instantly) | Sam | v1 Sections 2.3 and 5.6–5.8 still apply: separate domains, 2–3 weeks of warmup, 20–30 sends/inbox/day. Remove FL from the list. Rewrite the copy for a **paid** event ("$297, credited if you work with us") |
| Social retargeting | Veronica | **Already set up.** Point the PI custom audience and site visitors to the registration page; retarget registrants who haven't paid, and attendees who didn't book |
| Existing list / referrals | Gabriel | Personal invites to warm PI contacts |

Landing page and checkout: GoHighLevel funnel with a payment step (Stripe), then the thank-you page with the lead magnet ("LSA Lead Dispute Checklist").

---

## 4. Client conversion: two-meeting close

1. **Seminar** (paid), then the replay and an invitation to Meeting 1 (GHL "Webinar After" emails, v1 Step 5.3, with new copy).
2. **Meeting 1: LSA & Local Audit (30 min).** Run BrightLocal/Ahrefs on their market beforehand and show 2–3 findings. **Book Meeting 2 before you hang up.**
3. **Meeting 2: Proposal (45 min).** Spoke map for their metros plus a responsiveness plan, at premium pricing. Seminar fee credited.
4. Pipedrive stages: Registered → Paid → Attended → M1 booked → M1 held → M2 held → Won / Nurture.

---

## 5. Long-term nurture (anyone who doesn't sign)

| Cadence | Content | Tool |
|---|---|---|
| **Monthly** | One genuinely useful email, e.g. "How Google's spam filters are quietly hiding PI firms' reviews / LSA leads" (spam updates, review filtering, fake-competitor listings, lead disputes). No pitch. Embed the FAQ videos and blog posts. | GoHighLevel newsletter |
| **Quarterly** | "Hi {first}, we have a new idea for getting more **{case type they value}** cases in {state}. Do you have 15 minutes?" + calendar link | GHL workflow using the case-type field from the form |
| On trigger | Retargeting stays on for 180 days | Meta |

No end date. Being patient is the strategy.

---

## 6. Owners & next actions

| # | Action | Owner |
|---|---|---|
| 1 | Approve the name and check the domain | Gabriel |
| 2 | Tell Sam the project is back on and share this v2 | Gabriel |
| 3 | Ask Man, Blake & Jackson for the PI video | Gabriel |
| 4 | WordPress: logo, copy, schema, footer, videos | Web team |
| 5 | Re-check inbox warmup in Instantly; rebuild the list without FL | Sam |
| 6 | Paid GHL funnel + checkout + emails | Sam / Shereesa |
| 7 | Slide deck draft from Section 2 | Sam → Gabriel edits |
| 8 | Point retargeting at the funnel | Veronica |
| 9 | Pick a date ≥ 3 weeks after warmup is confirmed | Sam |

v1 Sections 2 (accounts and warmup), 4 (landing page), and 6 (testing and dry run) carry over unchanged except for the paid checkout and the new copy.
