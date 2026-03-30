# Veriti Voice Strategic Plan

Last updated: 2026-03-28

## Bottom Line

This is a viable business, but not as currently framed.

The current concept overstates novelty, overstates the moat of native audio, and tries to go too broad too early. There is still a strong product opportunity, but the winnable product is not "an AI receptionist for all allied health." The winnable product is:

**a Cliniko-native overflow and after-hours booking assistant for simple allied health appointment flows, with safe escalation and measurable revenue capture.**

That framing is stronger because:

- it matches the real pain: missed calls, especially when the front desk is busy
- it is less threatening than "replace reception"
- it avoids the hardest call types in the first release
- it is easier to prove ROI inside 30 days
- it is more defensible than generic voice quality claims

## What Holds Up From The Original Idea

Several parts of the original plan are directionally right:

- The pain is real. Clinics do miss calls during busy periods and after hours.
- Cliniko integration is a valid wedge because booking inside the call is materially better than "leave a message" or "we'll text you a link."
- Allied health is a better starting market than broad SMB because scripts, workflows, and buyer pain are more repeatable.
- The technical stack is sensible for a POC: Twilio + a real-time voice model + Cliniko + a lightweight backend.
- The strongest early sales motion is still founder-led, with real call demos and pilot clinics.

## What Does Not Hold Up

### 1. The category is not empty

The current plan says nobody has built this specifically for allied health. That is no longer true.

Cliniko's own connected-apps directory already lists multiple AI receptionist products, including:

- [Aeva AI Receptionist](https://www.cliniko.com/connected-apps/aeva-ai-receptionist/)
- [Jubilee Voice](https://www.cliniko.com/connected-apps/jubilee-voice/)
- [Lyngo AI Receptionist](https://www.cliniko.com/connected-apps/lyngo-ai-receptionist/)
- [Solum AI](https://www.cliniko.com/connected-apps/solum-ai/)
- [Yes AI Receptionist](https://www.cliniko.com/connected-apps/yes-ai-receptionist/)

Strategic implication:

- Do not pitch this as a first-of-its-kind category creator.
- Pitch it as the safest, fastest-to-deploy, most Cliniko-native booking capture product for a narrow clinic segment.

### 2. Native audio is an edge, not a moat

Gemini 3.1 Flash Live is promising and likely better than stitched STT/LLM/TTS stacks for latency, but this is not a durable moat on its own.

Why:

- voice model quality gaps compress quickly
- competitors can switch providers
- the model is still preview in the Live API documentation

The actual moat, if this works, will come from:

- Cliniko workflow reliability
- clinic-specific guardrails
- onboarding speed
- strong QA and auditability
- proof that the system captures bookings without creating cleanup work

### 3. The target segment is still too broad

"Allied health" sounds focused, but it hides major workflow variation.

Harder subsegments for a first product:

- speech pathology
- occupational therapy
- paediatric clinics
- NDIS-heavy practices
- workers comp / DVA / Medicare-heavy flows
- multi-disciplinary clinics with complex intake logic

These are harder because new-patient qualification, funding rules, clinician matching, referral constraints, and intake questions get more complex very quickly.

Better first segment:

- physio, chiro, and osteo
- single-site
- 1 to 3 practitioners
- mostly private-pay
- mostly adult bookings
- simple appointment taxonomy: initial consult, follow-up, return visit

### 4. The booking promise needs to be narrower

Cliniko's official `available_times` behavior is a critical product constraint. Its docs say available times are tied to settings for online bookings, including days ahead, hours, and practitioner availability.

Strategic implication:

- the phone agent cannot honestly promise "full receptionist-level scheduling" on day one
- the first product should mirror the practice's online-bookable inventory plus a narrow set of approved admin actions

That is still valuable. It just needs honest scoping.

### 5. Compliance posture is understated

This product will touch health information, which OAIC treats as sensitive information under the Privacy Act. The privacy burden is not optional just because the first release is "only reception."

Implications:

- recordings should be optional by default, not assumed
- transcript retention needs a clear policy
- overseas processing and subprocessors need to be disclosed and reviewed
- legal review should happen before production rollout, not after
- the product must hard-stop on emergencies and clinical advice requests

### 6. The current build plan is too big for a learning-first POC

The original plan includes a large onboarding portal, dashboard, self-serve flows, marketplace work, multi-tier pricing, and fairly broad product surface area.

That is too much before proving:

- clinics will trust the system
- callers will complete bookings with it
- staff won't hate the cleanup burden
- the economics work

The right POC is much smaller.

## Revised Product Thesis

### Product Positioning

**Veriti Voice is a Cliniko-native overflow booking assistant for Australian physio, chiro, and osteo clinics.**

It answers missed and after-hours calls, books simple appointment types directly into Cliniko, handles basic FAQs, and hands off everything risky or complex.

### Category Position

Do not position this as:

- "AI receptionist that replaces your front desk"
- "the first AI voice product for allied health"
- "fully autonomous practice admin"

Position it as:

- "never miss a schedulable call"
- "book simple appointments while staff stay focused on patients"
- "capture revenue from overflow and after-hours calls"
- "safe AI with clear handoff rules"

### Core Promise

**If a caller wants a standard appointment that your online booking flow would allow, Veriti Voice should be able to complete it on the call.**

Everything outside that promise escalates.

That is a credible wedge.

## Recommended Wedge Product

### Product Name

Keep the brand `Veriti Voice`, but describe the product internally and externally as:

**Veriti Voice Overflow**

That wording is strategically useful because it:

- reduces replacement anxiety
- makes rollout safer
- narrows the first call types we must solve
- makes the ROI story cleaner

### POC Scope

The POC should do only six things:

1. Answer overflow and after-hours inbound calls.
2. Make the AI disclosure immediately.
3. Book approved appointment types into Cliniko for approved practitioners.
4. Reschedule or cancel existing bookings when caller intent is clear and policy allows it.
5. Answer 10 to 20 pre-configured clinic FAQs.
6. Escalate risky or unsupported calls to voicemail, SMS callback, or a human line.

### Explicit Exclusions For POC

Do not build these into the first POC:

- outbound calling
- complex new-patient intake
- payment collection
- insurance or funding qualification
- NDIS workflows
- workers comp or DVA handling
- multi-location routing logic
- self-serve onboarding portal
- advanced analytics dashboard
- omnichannel chat/SMS support

These are second-phase problems.

## What We Need To Prove In A POC

The POC is not there to prove "AI can talk on the phone." That is already market-known.

It must prove five narrower things:

1. Callers accept the AI disclosure and still continue.
2. The voice experience is good enough that drop-off stays low.
3. Simple bookings complete cleanly inside Cliniko without staff cleanup.
4. Escalation rules catch risky calls before damage happens.
5. Clinics see enough captured appointments to want to pay.

## Ideal Customer Profile

### Primary ICP

- Australian physio / chiro / osteo clinic
- 1 to 3 practitioners
- single location
- Cliniko already in place
- at least one receptionist or admin staff member
- real overflow call pain during busy times
- website online booking exists or could exist
- owner-led buyer who can make decisions quickly

### Exclusion Criteria

Avoid these for the first 5 pilots:

- multi-site groups
- paediatric-heavy clinics
- speech pathology
- OT
- highly funded or referral-heavy patient mix
- clinics with highly customized scheduling rules
- clinics that want the AI to answer clinical questions

This is important. A narrow first 5 is more valuable than a broad first 20.

## Go-To-Market Strategy

## GTM Thesis

You are not selling "AI."

You are selling:

- fewer missed bookings
- less front-desk overload
- after-hours capture
- measurable admin leverage

### Initial Offer

Offer a **30-day guided pilot** with:

- one clinic
- one phone number or overflow route
- pre-approved appointment types only
- weekly transcript review with the client
- shared success dashboard sent manually by email

Do not lead with self-serve. White-glove onboarding is a feature at this stage.

### Recommended Rollout Motion

#### Phase 1: Overflow first

Route only:

- unanswered calls after X seconds
- after-hours calls
- lunch-break overflow

This lowers perceived risk and speeds pilot approval.

#### Phase 2: Daytime primary answer

Only after a clinic sees good results should the AI answer first for approved call types.

### Distribution Channels

Prioritize in this order:

1. Warm founder network and direct referrals.
2. Practice consultants and allied health ops advisors.
3. Cliniko marketplace listing.
4. Owner communities where operational pain is discussed.

Important correction:

- The Cliniko marketplace matters, but it should not be the main dependency before proof.
- Get 2 to 3 real clinic case studies first, then make the marketplace page sell those results.

### Messaging

Use this positioning:

**"Veriti Voice captures the calls your front desk misses and books simple appointments directly into Cliniko."**

Avoid this positioning:

- "Replace your receptionist"
- "Fully autonomous clinic admin"
- "No humans needed"

### Pricing Recommendation

The current proposed pricing is probably too aggressive for a first wedge if the clinic has not seen proof yet.

Recommended structure:

- Pilot: free for 30 days or low-friction fixed pilot fee
- Launch tier: one clinic, fair use, guided onboarding
- Growth tier: one clinic, higher volume, advanced reporting
- Multi-site: only after repeatable success

Commercial recommendation:

- keep zero setup fee
- keep cancellation simple
- avoid usage-based complexity in the first sale
- revisit pricing upward only after case-study proof

## Product Strategy

### The Real Differentiator

The strongest differentiated product is not the voice model. It is the **operating system around safe booking automation**:

- booking policies per clinic
- approved appointment types
- escalation rules
- transcript and outcome review
- staff confidence tools
- rollout controls

If we do this well, the product becomes harder to replace because the clinic trusts the behavior, not just the voice.

### Product Principles

1. Never invent answers about clinical matters.
2. Never guess on unsupported booking logic.
3. Default to escalation over false confidence.
4. Make every automated action auditable.
5. Measure business outcomes, not just call handling.

### Feature Sequence

#### Phase 0: POC

- inbound overflow answering
- approved appointment booking
- FAQ responses
- escalation
- transcript and outcome logging
- SMS confirmations

#### Phase 1: Pilot Product

- lightweight clinic config console
- richer analytics
- pause/go-live controls
- transcript QA workflow
- better appointment aliasing
- clinic-specific escalation trees

#### Phase 2: Paid Product

- self-serve onboarding
- marketplace distribution
- multi-site support
- deeper reporting
- broader admin actions

## POC Build Plan

### Recommended Build Objective

Build a 4 to 6 week POC that can safely support 2 pilot clinics.

### POC Success Criteria

The POC is successful if, within 30 days of pilot traffic, it reaches:

- answer rate above 95% on routed calls
- booking completion above 60% for supported booking intents
- escalation accuracy high enough that staff report low cleanup burden
- at least one clear case study showing recovered appointments or admin time saved

### Technical Architecture

For the POC, the original architecture is broadly right:

- Twilio for telephony
- FastAPI backend
- Gemini Live API for native audio interaction
- Cliniko integration
- Postgres / Supabase for tenant config and call outcomes

But with these strategic adjustments:

#### 1. Keep the voice layer abstracted

Gemini 3.1 Flash Live is compelling, but the guide in `geminiflash.md` shows meaningful constraints:

- preview status
- synchronous function calling only
- session duration limits
- audio-only response modality with transcription needed for text

Recommendation:

- use Gemini 3.1 Flash Live for the POC
- wrap it behind a `VoiceSession` abstraction so we can swap providers if pricing, reliability, or compliance needs change

#### 2. Treat session management as first-class

Do not leave long-call handling for later. Build:

- reconnection/resumption logic
- interruption-safe playback clearing
- transcript stitching across resumed sessions

#### 3. Scope Cliniko integration tightly

Only support:

- practitioner allowlists
- appointment-type allowlists
- verbal alias mapping
- booking rules that mirror available online inventory

#### 4. Reduce data retention by default

Store by default:

- transcript
- outcome
- booking metadata

Make recordings opt-in per clinic.

### POC Feature Checklist

#### Must Have

- inbound call answer
- AI disclosure
- FAQ response
- book approved appointment types
- reschedule/cancel if supported safely
- escalation
- transcript logging
- SMS confirmation
- admin replay/review screen for internal use

#### Nice To Have

- owner dashboard
- configurable voice choices
- self-serve knowledge-base editor

#### Not Needed Yet

- billing automation
- multi-site routing
- advanced analytics
- outbound reminders
- marketplace-ready polish

## Recommended Build Sequence

### Week 1

- call routing
- Twilio media stream to backend
- Gemini session lifecycle
- barge-in and interruption handling

### Week 2

- Cliniko practitioner and appointment-type sync
- available-times checks
- create booking flow
- SMS confirmation

### Week 3

- escalation rules
- transcript storage
- call outcome schema
- internal review screen

### Week 4

- pilot clinic config
- QA harness
- prompt hardening
- failure-state handling

### Week 5-6

- pilot rollout
- transcript review
- script tuning
- sales case-study capture

## Operating Model For Pilots

Each pilot clinic should get:

- one onboarding session
- one approved booking policy
- one escalation policy
- one weekly QA review
- one shared metrics summary

Internally, review every failed or escalated call in the first 2 weeks.

That is the fastest way to improve trust and performance.

## Risks That Matter Most

### 1. Trust risk

If reception staff believe the AI creates cleanup work, the product dies even if owners like the demo.

Mitigation:

- overflow-first rollout
- conservative escalation
- visible audit trail

### 2. False autonomy risk

If the product attempts unsupported booking logic, the first double-booking or wrong-patient error will damage trust immediately.

Mitigation:

- strict allowlists
- narrow appointment scope
- mirror online-bookable inventory only

### 3. Compliance risk

Health information is sensitive information under OAIC guidance. Privacy posture needs to be built into the product, not bolted on later.

Mitigation:

- privacy review before launch
- default-minimum retention
- optional recordings
- explicit disclosures
- vendor and subprocessor review

### 4. Market sameness risk

If the product sounds like every other AI receptionist, you will be selling on novelty and demos instead of repeatable value.

Mitigation:

- tighter niche
- stronger ROI proof
- better Cliniko workflow fit
- better operational safety

## Decision Framework

Proceed if these are true after the first 3 pilots:

- clinics trust the overflow deployment model
- supported bookings complete reliably
- staff cleanup burden is low
- there is visible captured revenue or admin leverage
- at least 2 clinics are willing to convert to paid

Pause or pivot if these are true:

- callers frequently drop after disclosure
- clinics demand complex flows outside safe scope
- booking completion is weak without heavy manual intervention
- the sales cycle is dominated by privacy objections
- competitors are materially ahead on workflow and trust signals

## Recommended Final Strategy

### What To Build

Build:

- a narrow, safe, Cliniko-native overflow booking assistant

Do not build first:

- a broad AI receptionist platform for all allied health

### Who To Sell To

Sell first to:

- physio, chiro, and osteo clinics with simple booking flows

Do not sell first to:

- complex, funded, multidisciplinary, or multi-site clinics

### What To Prove

Prove:

- captured bookings
- reduced missed-call pain
- low cleanup burden

Do not try to prove:

- total receptionist replacement
- full front-desk automation
- universal fit across allied health

## Practical Next Move

The best next move is not another strategy deck. It is:

1. build the overflow-first POC
2. secure 2 to 3 narrow pilot clinics
3. review every call manually for 2 weeks
4. use that evidence to tighten the product and GTM story

If this works, the path to market is strong. If it does not, we will learn quickly without overbuilding the wrong product.

## Research Notes

Key external inputs used in this revision:

- Gemini Live API docs and launch post reviewed on 2026-03-28
- Cliniko official API and connected-app documentation reviewed on 2026-03-28
- OAIC privacy guidance reviewed on 2026-03-28
- Twilio official pricing and media streams documentation reviewed on 2026-03-28

Key links:

- [Gemini 3.1 Flash Live launch](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-live/)
- [Gemini Live API overview](https://ai.google.dev/gemini-api/docs/live-api)
- [Cliniko connected apps](https://www.cliniko.com/connected-apps/)
- [Cliniko pricing](https://www.cliniko.com/pricing/)
- [Cliniko API available times](https://docs.api.cliniko.com/openapi/available-time/getallavailabletimes-get)
- [OAIC guide to health privacy](https://www.oaic.gov.au/privacy/your-privacy-rights/health-information)
- [OAIC guidance on privacy and developing and training generative AI models](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/privacy-guidance-on-generative-ai)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams)
- [Twilio Voice pricing](https://www.twilio.com/en-us/voice/pricing/au)
