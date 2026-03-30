# Veriti Voice Overflow Architecture Decisions

Last updated: 2026-03-29
Status: Proposed baseline architecture for POC

## 1. Architecture Goals

The architecture should optimize for:

- fast POC delivery
- safe booking automation
- clean provider boundaries
- strong observability
- easy policy iteration during pilots
- simple self-serve setup for happy-path clinics
- a compelling demo experience for prospects

It should not optimize for:

- broad multi-tenant enterprise scale on day one
- customer-facing self-serve complexity
- hard-to-reverse platform bets

## 2. System Shape

Recommended shape:

- one backend service for realtime orchestration and integrations
- one internal ops UI for configuration and review
- one relational database for tenant config and audit data
- Twilio for telephony and SMS
- Gemini 3.1 Flash Live behind a provider abstraction

Recommended deployment split:

- `apps/api`: FastAPI backend
- `apps/ops`: internal React ops console
- `packages/shared`: shared types, schemas, and constants

## 3. ADR-001: Use A Monorepo

Decision:

- Use a monorepo with separate app folders for backend and ops UI.

Why:

- shared types and schemas reduce drift
- single repo is easier for a small team
- future scaffolding is simpler

Consequence:

- repo tooling needs clear boundaries to avoid accidental coupling

## 4. ADR-002: Use FastAPI For The Realtime Orchestrator

Decision:

- Use FastAPI as the primary backend runtime for WebSocket handling and orchestration.

Why:

- good fit for async IO
- clean Python ecosystem for telephony and AI integration work
- fast enough for the POC

Consequence:

- audio performance must be profiled under pilot-style concurrency

## 5. ADR-003: Wrap The Voice Provider Behind `VoiceSession`

Decision:

- The application will not speak directly to Gemini-specific events outside the provider adapter.

Why:

- Gemini Live is attractive, but the POC should not hard-wire itself to one provider
- Gemini Live has model-specific constraints, including synchronous tool calling and session duration limits
- provider swapping becomes easier if pricing, compliance, or reliability changes

Internal interface should expose:

- `connect()`
- `send_audio()`
- `send_text()`
- `handle_event()`
- `close()`

Normalized event types should include:

- `audio_chunk`
- `input_transcript`
- `output_transcript`
- `tool_call`
- `interruption`
- `turn_complete`
- `error`

## 6. ADR-004: Use A Call Session State Machine

Decision:

- Every live call session will move through explicit states.

Recommended states:

- `ringing`
- `connecting`
- `active`
- `awaiting_tool`
- `escalating`
- `completed`
- `failed`

Why:

- realtime voice systems fail in subtle ways without explicit state handling
- state transitions make debugging and testing easier

Consequence:

- orchestration code should reject invalid transitions loudly

## 7. ADR-005: Keep Tool Execution Synchronous In-Session

Decision:

- Tool execution should be designed around synchronous in-session responses.

Why:

- Gemini 3.1 Flash Live supports synchronous function calling, not asynchronous function calling
- the booking loop needs immediate tool response behavior anyway

Consequence:

- long-running operations should be kept out of the live loop
- the live booking flow must remain narrow and fast

## 8. ADR-006: Scope Booking To Policy-Approved Inventory

Decision:

- The product will only offer slots and actions that are permitted by local clinic policy and backed by Cliniko-supported inventory.

Policy model should include:

- practitioner allowlist
- appointment-type allowlist
- spoken alias mapping
- reschedule/cancel enablement
- escalation triggers

Why:

- this is the core safety boundary
- it keeps the product aligned with the narrow commercial promise

Consequence:

- many calls will legitimately escalate in early pilots

## 8A. ADR-006A: Support A Cliniko Stub Adapter Alongside Live Cliniko

Decision:

- The Cliniko integration boundary will support both a live adapter and a stub adapter with the same interface.

Why:

- self-serve demos should not be blocked on live Cliniko credentials
- product and sales need a realistic test mode early
- stub mode makes local development and QA faster

Stub responsibilities:

- serve demo practitioners and appointment types
- serve demo availability
- simulate booking create, update, and cancel flows
- persist the payload that would have been sent to Cliniko

Consequence:

- the adapter contract must be defined carefully so stub and live behavior do not drift too far apart

## 9. ADR-007: Prompt Assembly Must Be Structured And Versioned

Decision:

- Prompt inputs will be assembled from structured components rather than one large hardcoded prompt string.

Prompt components:

- base persona
- supported action rules
- forbidden action rules
- clinic FAQ content
- clinic policy block
- escalation rules
- voice style constraints

Why:

- prompts will change often during pilots
- versioning makes debugging easier

Consequence:

- every call session should record the prompt version used

## 10. ADR-008: Default To Minimum Data Retention

Decision:

- Recordings are off by default.
- Transcript and outcome data are retained because they are required for QA and product learning.

Default stored artifacts:

- call metadata
- transcript
- tool events
- booking outcome
- escalation outcome

Why:

- aligns with conservative privacy posture
- enough data remains for debugging and product iteration

Consequence:

- audio replay will not always be available for review

## 10A. ADR-008A: Persist Actionable Outcome Artifacts

Decision:

- The system will persist not only transcripts and booking outcomes, but also action-required artifacts such as late-arrival notices, callback requests, and stub payload previews.

Why:

- clinics need to know what to act on first
- demo mode needs visible proof of what the system would have done

Consequence:

- the data model must include action status and priority semantics early

## 11. ADR-009: Build An Internal Ops Console Before A Customer Portal

Decision:

- The first UI will be internal-only.

It should support:

- clinic configuration
- FAQ management
- call review
- failed/escalated call filtering

Why:

- internal ops velocity matters more than customer polish in the POC
- founder-led onboarding is expected anyway

Consequence:

- pilot clinics will not self-configure initially

Revision:

- For this POC, we will still build a narrow customer-facing setup path for happy-path clinics and demo users.
- The broader operational surface remains internal-first.

Practical rule:

- internal ops handles full configuration power
- customer-facing setup handles the happy path only

## 12. ADR-010: Use A Relational Audit Model

Decision:

- Store call and booking activity in relational tables, not only in unstructured logs.

Core entities:

- `clinics`
- `clinic_configs`
- `practitioner_policies`
- `appointment_type_policies`
- `faq_items`
- `call_sessions`
- `call_events`
- `transcript_turns`
- `booking_actions`
- `escalation_events`
- `action_queue_items`
- `stub_payloads`
- `setup_sessions`

Why:

- internal review screens need queryable data
- pilot metrics need structured reporting

Consequence:

- schema design must happen early, not as cleanup later

## 13. ADR-011: Separate External Provider Adapters From Business Policy

Decision:

- Provider integrations live behind adapters.
- Clinic logic and policy live in domain services.

Recommended boundaries:

- `integrations/twilio`
- `integrations/gemini`
- `integrations/cliniko`
- `domain/policies`
- `domain/calls`
- `domain/bookings`

Why:

- reduces vendor lock-in
- makes tests simpler
- keeps business rules independent of transport details

## 14. ADR-012: Use Overflow-First Routing

Decision:

- The default pilot deployment mode is overflow and after-hours routing, not AI-first for every inbound call.

Why:

- lower commercial risk
- lower trust barrier for clinics
- safer for early product quality

Consequence:

- routing flexibility is part of the deployment model, not an afterthought

## 14A. ADR-012A: Optimize The First Experience For Demo And Trial

Decision:

- The system must support a polished demo path in parallel with overflow-first live deployment.

Why:

- a prospect should be able to call a number and understand the value immediately
- founder-led selling depends on a strong first experience

Consequence:

- demo data, demo prompts, and a test-call completion path are part of the product, not just GTM collateral

## 15. ADR-013: Favor Deterministic Escalation Over Model Judgement Alone

Decision:

- Critical escalation behavior should not rely only on prompt wording.

Approach:

- prompt asks the model to identify risky intents
- application policy layer confirms escalation decision where possible
- explicit fallback paths exist for human request, clinical advice, distress, and unsupported actions

Why:

- safety-critical logic should be inspectable and testable

Consequence:

- orchestration layer needs rule evaluation, not just prompt engineering

## 15A. ADR-013A: Keep Practitioner Guidance Non-Clinical

Decision:

- The assistant may recommend who to see or what appointment type to book only through clinic-approved administrative routing rules.

Why:

- callers will ask this often
- this is commercially valuable
- it must not drift into clinical advice

Consequence:

- service-routing logic belongs in policy configuration, not freeform model reasoning

## 16. ADR-014: Use Internal Review As A Product Learning Loop

Decision:

- Every failed or escalated pilot call will be reviewed internally during early rollout.

Why:

- the first moat is operational reliability
- rapid feedback on failures will improve prompts, policies, and tooling

Consequence:

- call review workflows are part of the core product, not an internal side task

## 17. ADR-015: Start With A Single Region And Simple Deployment

Decision:

- Use one backend deployment region and one primary data region for the POC.

Why:

- simpler deployment and debugging
- reduces operational overhead

Consequence:

- region choice should align with target clinics and privacy posture

## 18. Recommended Service Layout

Suggested backend folders:

- `app/api/http`
- `app/api/websocket`
- `app/core/config`
- `app/core/logging`
- `app/domain/calls`
- `app/domain/policies`
- `app/domain/bookings`
- `app/domain/escalations`
- `app/integrations/twilio`
- `app/integrations/gemini`
- `app/integrations/cliniko`
- `app/repositories`
- `app/schemas`
- `app/services`

Suggested ops UI folders:

- `src/routes`
- `src/features/clinics`
- `src/features/faqs`
- `src/features/calls`
- `src/components`
- `src/lib`

## 19. Data Flow

1. Twilio sends inbound call to webhook.
2. Backend returns TwiML that opens media stream.
3. Backend creates `call_session`.
4. Backend opens `VoiceSession` using Gemini adapter.
5. Audio is transcoded and streamed bidirectionally.
6. Gemini emits transcripts, audio, and tool calls.
7. Orchestrator routes tool calls to policy-aware handlers.
8. Cliniko wrapper executes approved booking actions.
9. Backend logs transcript turns, events, and outcomes.
10. Ops UI reads structured data for review.

## 20. Failure Handling Rules

If provider or integration behavior is uncertain:

- fail closed
- escalate
- log the reason

Specific rules:

- no availability result: offer fallback, do not invent slots
- Cliniko error: apologize and escalate
- unsupported intent: escalate
- transcript ambiguity on booking-critical data: confirm again or escalate

## 21. Testing Strategy

Priority test layers:

- unit tests for policy and state machine
- integration tests for Cliniko wrapper
- end-to-end scripted call scenarios

Important manual tests:

- interruption handling
- low-availability conversations
- ambiguous caller phrasing
- escalation triggers
- long-call session renewal

## 22. Observability Strategy

Minimum observability:

- per-call correlation ID
- provider error logging
- tool call timing
- booking action success/failure
- escalation reason counts
- action-queue counts by priority
- setup funnel completion
- demo call naturalness scoring

Dashboards can wait. Structured logs and a review UI cannot.

## 23. Open Architecture Questions

- Should patient lookup be part of the first orchestration slice or added after booking works?
- Should recordings be stored through Twilio only or copied into app-managed storage when enabled?
- Should the ops UI live in the same deployment as the backend for the POC?
- What concurrency limit is safe for audio transcoding in the chosen runtime?

## 24. Recommended Next Engineering Move

The first implementation sequence should be:

1. establish monorepo skeleton
2. define config and secrets contract
3. implement `VoiceSession`
4. implement Twilio webhook and media bootstrap
5. implement Gemini adapter
6. implement audio pipeline
7. implement call state machine

That gets the riskiest technical path proven early, before deeper Cliniko or UI work begins.
