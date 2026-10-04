# Webinar hook, phased system, and AI tools (draft from Gabriel's notes, 2026-10-03)

## 1. Hook / ad copy (your wording, tightened)
> Most agencies say photos, citations and response time are the key to Local Services Ads.
> We'll show you how we helped **{firm}** go from **{A}** to **{B}** in **{C}** days.
> What we share isn't obvious, but it works for personal injury LSAs, and the case studies prove it.
> Join us {DATE}, {TIME ET}. $20, replay included.

- **{firm}/{A}/{B}/{C}:** fill only from the LLM connectors (LSA dashboard, CallRail, Google Ads) once the case study is final. Candidates: Langley, Brown Bass & Jeter, Obral Silk & Pal (OSP), Maier Gutierrez. If a number can't be tied to a screenshot, drop it. Add "Results vary."
- **A wording problem to settle:** Google's own LSA help page lists responsiveness among its ranking factors. If the ad says response time *isn't* the key, someone can screenshot Google to disprove it. Safer: **"Most agencies stop at photos, citations and response time. Those are table stakes. Here's what moved {firm} from {A} to {B}."** It keeps your hook and stays defensible. (Verify the current factor list on Google's page before publishing.)
- Use this as the opener for HeyGen V1 and the primary text for ad 1 in file 07.

**Hook, refined:** response time isn't the point. What agencies leave out is the work Google doesn't publish and no out-of-the-box tool does well enough for a PI firm to compete, such as contacting citation sites by hand to get real costs. Suggested line: *"Agencies stop at what Google publishes and what a tool can automate. The manual work they skip is where PI firms win."*

## 1b. Live demo: city opportunity map (for two attending firms)
We run `tools/lsa_opportunity.py` for two firms expected to attend. It ranks nearby cities by fewest LSA competitors with a higher rating, or the same rating and more reviews. See `tools/README.md`. Real data has to be captured manually from public LSA results, because Google offers no API for it.

## 2. The three-phase rollout (what we show, how it fits the webinar)
**Phase 1: Research and foundation (no AI in the images)**
- Authentic team photos with **EXIF data kept**. Never AI-generated for client LSA profiles
- Local citation research; make the name/address/phone **consistent** across them
- Goals set with the firm (case types, cities, budget, target cost per signed case)
- **Autoresponder and call-overflow system** set up
- LSA profile set up and tuned to those goals; test calls and test leads
- Reputation: remove only reviews that **violate Google's policies** (flag and report through the proper channels), and improve review **acquisition** (one-by-one requests, no batching)

**Phase 2: Implementation**
- LSA launches
- **AI monitors** the autoresponder, **rates leads**, books appointments, outputs **action points**, and publishes the images
- **AI reports twice a month** on algorithm changes, drawing on (1) what Google says, (2) what forums report, and (3) our internal database of unpublished changes

**Phase 3: Scale and maintain**
- Action-point and budget balancing
- Playbook for "what happens if X / what happens if Y" (budget cap hit, answer rate drops, a competitor enters, a review is removed, a dispute is rejected, etc.). Some of these are easy and some need a call

## 3. AI tools we'll demo (screens, not code)
1. **Citation planner:** which citations a firm needs, in what order, and where the NAP is inconsistent
2. **LSA lead-rating system:** scores each lead against the firm's own rules (case type, location, severity, intake status), flags disputable leads, and sends the action list
3. **Autoresponder + image publisher:** instant reply, after-hours handling, overflow, and the authentic photos going up on schedule

## 4. Our own autoresponder ("built specifically for attorneys")
Selling point: a customizable system the firm can use **instead of** a generic tool, so the move can pay for part of itself.
- Case-type-aware replies (auto, trucking, premises, med-mal, wrongful death)
- After-hours script, overflow to a second number, missed-call text-back
- Hands off cleanly to the firm's CRM (see list below)
- Guardrails: **no legal advice** in replies; a disclosure that no attorney-client relationship exists yet; **texting only with consent** (TCPA); follow state-bar rules on solicitation and call recording
- Decide before the webinar: is this built, a prototype, or "in rollout"? The slides must say which. Don't demo what isn't working.

## 5. Common PI CRMs / intake and case-management systems (so we can answer "does it connect?")
Intake/CRM: **Lawmatics, Clio Grow, Law Ruler, Captorra, Lead Docket, Intaker**, HubSpot, Salesforce
Case management with intake: **Filevine, Litify, CASEpeer, SmartAdvocate, Neos, Needles, MyCase, Clio Manage, PracticePanther**
This is from memory. Before the webinar, confirm which ones the connectors/Zapier can actually reach, and which are webhook-only.

## 6. Checks before any case study goes on screen
- [ ] Photos on the example LSA accounts are **real team images** with EXIF intact
- [ ] The example firm **actually paid for and received** the citations we describe
- [ ] Before/after screenshots cover the same date range and come from the connectors
- [ ] "A to B in C days": the three numbers are on a screenshot we can show
- [ ] Client permissions (already in hand), caller data blurred, "Results vary" footnote
