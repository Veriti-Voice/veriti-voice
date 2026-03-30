# Veriti Voice Overflow PRD

Last updated: 2026-03-29
Status: Draft for build kickoff
Product: Veriti Voice Overflow

## 1. Product Summary

Veriti Voice Overflow is a Cliniko-friendly AI overflow and after-hours booking assistant for Australian physio, chiro, and osteo clinics.

It answers routed inbound calls, discloses that the caller is speaking with an AI assistant, handles simple booking-related intents, answers a clinic's approved FAQs, supports a narrow set of allied-health administrative requests, and escalates anything risky, unsupported, or clinically sensitive.

The product is intentionally narrow. It is not a full receptionist replacement and it is not a general-purpose allied health voice agent. The POC must still feel impressive enough that a prospect can call the number, test it, and come away wanting to sign up.

## 2. Why This Exists

Target clinics miss calls during peak periods and after hours. The business problem is not "phone automation" in the abstract. It is:

- missed bookings
- delayed callbacks
- front-desk overload
- inconsistent caller experience

The product should recover schedulable calls without creating cleanup work for staff.

## 3. Goals

### Business Goals

- Prove 2 to 3 pilot clinics will trust the system enough to route real overflow traffic.
- Demonstrate measurable captured bookings or admin leverage within 30 days.
- Create a product narrow enough to onboard quickly and improve fast.
- Make the product easy enough to self-set up on a happy path that a Cliniko practice owner can reach a live test call without founder hand-holding.
- Create a demo experience strong enough that Ian or a prospect wants to move immediately to pilot or signup.

### Product Goals

- Answer routed calls reliably.
- Complete simple supported booking actions directly in Cliniko.
- Support a narrow self-guided setup flow for Cliniko practices.
- Escalate unsupported or risky calls safely.
- Generate a clear audit trail for every call.
- Sound natural, warm, and human-like enough to pass an initial prospect test.
- Prioritize handled calls into a clear post-call action queue for the clinic.
- Support a Cliniko stub mode that shows exactly what data would be written when a live integration is unavailable.

### User Goals

For clinic owners:

- stop missing schedulable calls
- reduce front-desk interruptions
- get confidence that the system is not creating risk
- self-configure and test the assistant quickly
- see what actions the assistant took and what needs follow-up

For front-desk staff:

- receive fewer interruptions during busy periods
- avoid cleanup caused by incorrect automation
- quickly review what happened on each call
- see high-priority callbacks, late arrivals, and failed bookings first

For callers:

- get an immediate answer
- book a standard appointment on the call when possible
- reach a human or fallback path when the request is complex
- tell the clinic if they are running late
- get non-clinical guidance on who to book with based on clinic-approved rules

## 4. Non-Goals

The POC and pilot product will not include:

- broad receptionist replacement messaging
- outbound calling
- payment collection
- complex new-patient intake
- NDIS, workers comp, DVA, or referral-heavy logic
- clinical advice
- multi-site routing logic
- fully generic self-serve onboarding for every clinic shape
- marketplace-grade polish

## 5. Target Customer

### Ideal Customer Profile

- Australian physio, chiro, or osteo clinic
- single site
- 1 to 3 practitioners
- currently using Cliniko
- has overflow call pain during busy periods or after hours
- mostly private-pay and relatively simple booking logic

### Excluded Early Segments

- speech pathology
- occupational therapy
- paediatrics-heavy clinics
- NDIS-heavy clinics
- multi-disciplinary clinics
- multi-site groups

## 6. Core Product Promise

If a caller asks for a standard appointment that the clinic has explicitly approved for automation, Veriti Voice should be able to complete it inside the call and write it into Cliniko.

Everything outside that scope should escalate safely.

If live Cliniko integration is not enabled yet, the product should still simulate the booking action and show exactly what would have been written through a stubbed adapter.

## 7. Primary Use Cases

### UC-01: Overflow inbound booking

A caller reaches the clinic while staff are unavailable. The call is routed to Veriti Voice Overflow. The assistant discloses itself, determines intent, offers approved appointment options from Cliniko availability, confirms the choice, writes the booking, and sends a confirmation SMS.

### UC-02: After-hours booking

A caller contacts the clinic after hours. The assistant answers, discloses itself, books a supported appointment if possible, and otherwise captures the request for follow-up.

### UC-03: FAQ handling

A caller asks a simple question such as hours, parking, fees, location, practitioner availability, or telehealth availability. The assistant answers from the clinic's approved FAQ set.

### UC-04: Reschedule or cancel

A caller asks to move or cancel an appointment. The assistant verifies enough context to find the appointment, offers supported changes if policy allows it, and writes the update.

### UC-05: Escalation

A caller asks for clinical advice, expresses distress, requests a human, or falls outside supported workflows. The assistant immediately follows the clinic's escalation policy.

### UC-06: Late arrival notice

A caller tells the clinic they are running late. The assistant captures the caller details, appointment context if available, and logs a prioritized late-arrival notice for staff review.

### UC-07: Practitioner or service routing guidance

A caller asks who they should book with or what type of appointment they need. The assistant uses clinic-approved, non-clinical routing rules to recommend the right practitioner or appointment type, or escalates if the question crosses into clinical advice.

### UC-08: Cancel and invite reschedule

A caller cancels an appointment. The assistant asks whether they would like to reschedule now, and if so, attempts a supported reschedule flow or creates a prioritized callback request.

### UC-09: Demo or test-call experience

A prospect or clinic owner calls a test number. The assistant demonstrates a realistic, natural conversation using either live Cliniko data or stubbed clinic data, and the owner can review the resulting booking/action payload afterward.

## 8. Users

### Primary Users

- clinic owner or practice manager
- receptionist or admin staff
- end caller / patient

### Internal Users

- Veriti operations or founder
- QA reviewer

## 9. Product Principles

1. Default to safe escalation over risky autonomy.
2. Mirror clinic-approved booking rules only.
3. Make every automated action reviewable.
4. Optimize for trust and operational reliability before breadth.
5. Measure business outcomes, not just conversation quality.

## 10. Functional Scope

### 10.1 Call Answering

Requirements:

- Answer routed inbound calls from Twilio.
- Play AI disclosure at the start of the interaction.
- Start a live voice session and process caller input in real time.
- Support interruption and barge-in cleanly.

Acceptance criteria:

- The system answers routed calls consistently in pilot conditions.
- The caller hears the disclosure before booking or FAQ handling begins.
- The assistant can be interrupted mid-response without broken playback behavior.

### 10.2 Booking

Requirements:

- Support a clinic-specific allowlist of practitioners.
- Support a clinic-specific allowlist of appointment types.
- Map spoken aliases to official Cliniko appointment types.
- Read availability from Cliniko and present clear options.
- Create the booking in Cliniko and log the outcome.

Acceptance criteria:

- Supported bookings can be completed end-to-end without staff intervention.
- Bookings use only approved practitioners and appointment types.
- Booking details are confirmed back to the caller before call completion.

### 10.3 Reschedule / Cancel

Requirements:

- Identify the relevant appointment using supported matching logic.
- Confirm enough context before changing or canceling.
- Log the before-and-after appointment state.

Acceptance criteria:

- Supported reschedules and cancels are reflected correctly in Cliniko.
- Unsupported or ambiguous requests escalate instead of guessing.

### 10.4 FAQ Handling

Requirements:

- Use a clinic-specific FAQ set managed through a narrow setup flow.
- Respond only from approved content.
- Escalate when the answer is missing or ambiguous.

Acceptance criteria:

- FAQs are answered correctly for supported topics.
- Unsupported questions do not trigger hallucinated answers.

### 10.5 Escalation

Requirements:

- Detect requests for a human.
- Detect clinical questions or emergencies.
- Detect unsupported intents.
- Route according to a clinic-specific fallback policy.

Fallback options:

- voicemail
- SMS callback workflow
- transfer to a fallback number

Acceptance criteria:

- Risky and unsupported calls escalate consistently.
- Escalation reason is logged for every escalated call.

### 10.6 Late Arrival and Callback Notices

Requirements:

- Capture late-arrival notices from callers.
- Capture callback requests when the assistant cannot complete a task.
- Classify urgency and action type for staff follow-up.

Acceptance criteria:

- Late-arrival notices are stored with a high-priority flag.
- Callback requests are logged with enough context for staff follow-up.

### 10.7 Call Prioritization Queue

Requirements:

- Prioritize handled calls into action categories.
- Surface urgent and time-sensitive items first.
- Distinguish completed automation from calls needing human action.

Priority examples:

- late arrival
- urgent callback requested
- failed booking attempt
- cancellation needing manual follow-up
- completed booking with no action needed

Acceptance criteria:

- clinic staff or internal ops can quickly see which handled calls need action first
- completed calls and action-required calls are clearly separated

### 10.8 Notifications

Requirements:

- Send SMS confirmations for supported completed bookings.
- Support clinic-branded copy templates.

Acceptance criteria:

- Confirmation SMS is sent for completed bookings when enabled.
- Failures are logged and visible for review.

### 10.9 Self-Serve Setup and Demo Mode

Requirements:

- Support a narrow self-guided setup path for happy-path Cliniko clinics.
- Allow the user to choose live Cliniko connection or stub/demo mode.
- Collect business details, fallback number, FAQs, practitioner preferences, and booking policies.
- Validate Cliniko connection when live mode is selected.
- Show test-number or test-call instructions at the end of setup.

Acceptance criteria:

- a happy-path Cliniko user can reach a live test call without founder assistance
- a non-integrated prospect can still complete setup in demo mode and inspect simulated payloads
- the setup flow creates enough config to run a realistic test call

### 10.10 Internal Review Console

Requirements:

- Internal-only screen for Veriti ops or founder.
- View call outcomes, transcripts, duration, and booking result.
- View call priority and required next action.
- Access recording if the clinic has enabled recordings.
- Filter failed and escalated calls for QA review.

Acceptance criteria:

- All pilot calls can be reviewed by internal ops.
- Failed and escalated calls are easy to identify and inspect.

## 11. Out Of Scope For POC

- customer-facing dashboard
- billing
- advanced analytics
- marketing automations
- multi-site management
- custom reporting portal
- fully autonomous clinical triage

## 12. Safety and Compliance Requirements

The product handles sensitive health-related data and must adopt a conservative posture.

Requirements:

- AI disclosure at the start of every AI-handled call
- no clinical advice
- emergency and distress escalation rules
- minimum necessary data retention
- recordings disabled by default unless the clinic explicitly opts in
- clear subprocessor and privacy review before production pilots

Operational rule:

- if the system is uncertain whether a request is safe or supported, escalate

## 13. Technical Requirements

### Voice Layer

- Use Gemini 3.1 Flash Live for the POC
- Treat the voice provider as swappable behind a `VoiceSession` abstraction
- Support transcript capture and interruption-safe playback
- Handle session renewal or resumption cleanly
- Enable voice tuning and prompt controls that improve naturalness and conversational warmth

### Telephony

- Use Twilio for routing, media streams, and SMS
- Support overflow-first routing for pilots
- Support after-hours route as an alternative pilot setup

### Backend

- FastAPI service for WebSocket handling and orchestration
- Tool layer for Cliniko operations, stubbed Cliniko simulation, and policy checks
- Logging for every call event and tool action

### Data

Minimum entities:

- clinic
- clinic_config
- practitioner_allowlist
- appointment_type_allowlist
- faq_item
- call_session
- call_event
- transcript_turn
- escalation_event
- booking_action
- callback_action
- setup_session

### Security

- tenant isolation for clinic data
- encrypted secrets for Cliniko credentials
- signed access to any recordings

## 14. Integration Requirements

### Cliniko

Required actions:

- fetch practitioners
- fetch appointment types
- fetch available times
- create appointment
- update appointment
- cancel appointment if supported
- optional patient lookup

Design rule:

- only expose Cliniko actions that are approved in the clinic policy

### Cliniko Stub Mode

Required actions:

- simulate available times
- simulate booking create/update/cancel actions
- persist the payload that would be sent to Cliniko
- expose JSON, CSV, or database-backed review for demo and testing

### Twilio

Required actions:

- inbound routing
- media stream
- recording support when enabled
- confirmation SMS

## 15. UX Requirements

### Voice UX

- polite, calm, clearly Australian English
- natural, humanised, and low-friction in tone
- concise turn length
- do not over-explain
- always restate critical booking details before confirmation
- keep phrasing simple and staff-safe

Target outcome:

- a prospect should describe the experience as natural enough that they would trust it with overflow calls

### Internal Ops UX

- internal review console must load quickly
- failed and escalated calls should be visible without digging
- transcript and booking status should be readable on one screen

## 16. Prompting Requirements

The live prompt must explicitly define:

- assistant persona
- allowed actions
- disallowed actions
- escalation triggers
- booking policy
- FAQ usage boundaries
- late-arrival and callback handling
- non-clinical practitioner recommendation boundaries
- how to confirm actions verbally

Prompt rule:

- the assistant must never imply clinical authority

## 17. Success Metrics

### Product Metrics

- routed call answer rate
- supported booking completion rate
- escalation rate
- failed-call rate
- SMS confirmation success rate
- self-serve setup completion rate
- median time to first successful test call
- naturalness score from internal/prospect test calls
- prioritization accuracy for action-required calls
- stub payload review success rate

### Business Metrics

- pilot-to-paid conversion
- weekly captured bookings
- client-reported admin time saved
- staff cleanup burden
- demo-to-pilot intent rate

### Pilot Targets

- answer rate: > 95%
- supported booking completion: > 60% initially
- low cleanup burden based on qualitative staff feedback
- at least one strong pilot case study
- happy-path self-serve setup to test call in under 20 minutes
- naturalness score averaging at least 8/10 in founder and prospect scoring
- 100% of non-live booking actions visible through stubbed JSON, CSV, or database review
- action-required calls correctly prioritized in review screens

## 18. Launch Plan

### Stage 1: Internal readiness

- complete narrow workflow support
- dry-run internal test calls
- verify transcripts, booking actions, and escalation logging
- verify demo-mode setup and stub payload review

### Stage 2: Pilot 1

- one clinic
- overflow or after-hours only
- daily QA review in week 1
- founder or prospect self-test path validated

### Stage 3: Pilot 2-3

- repeat with similar clinics
- tighten scripts and policies based on real calls

### Stage 4: Paid readiness

- only after 2 clinics show clear value and low operational risk

## 19. Open Questions

- What minimum caller context is required before rescheduling or canceling?
- Should patient lookup be mandatory or optional for POC?
- Which fallback is safest for emergencies: transfer, voicemail, or hard emergency message plus hang-up?
- Should recordings ever be on by default for pilots? Current recommendation: no.
- Do we launch with AI-first answering for any clinic before proving overflow mode? Current recommendation: no.

## 20. Release Decision

Ship the POC only when:

- supported booking flows work reliably
- escalation is conservative and consistent
- internal ops can review all pilot calls easily
- one pilot clinic is ready to route real overflow traffic
- a happy-path user can complete self-setup and reach a test call
- demo mode is realistic enough to create strong prospect intent

Do not ship if:

- booking errors require regular staff cleanup
- voice quality is inconsistent under expected pilot load
- escalation is under-triggering on risky calls
- setup requires repeated manual intervention for simple Cliniko clinics
