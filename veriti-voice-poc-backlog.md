# Veriti Voice Overflow POC Backlog

Last updated: 2026-03-29
Planning horizon: 6 weeks
Goal: pilot-ready POC for 2 clinics

## 1. Delivery Objective

By the end of this backlog, we should have a narrow, safe POC that can:

- answer overflow or after-hours calls
- disclose AI usage
- book supported appointments in Cliniko or simulate them through a stubbed Cliniko adapter
- reschedule or cancel within safe policy limits
- answer approved FAQs
- capture late-arrival and callback requests
- recommend who to see using clinic-approved non-clinical routing rules
- escalate risky or unsupported calls
- prioritize handled calls by action urgency
- let a happy-path Cliniko user self-configure and reach a live test call
- let Ian or a prospect call a number and experience a compelling demo
- log transcripts and outcomes for review

## 2. Delivery Rules

1. Safety beats coverage.
2. Reliability beats polish.
3. Setup simplicity and demo quality matter where they directly affect buying intent.
4. Every supported workflow must have an obvious failure path.
5. Nothing ships to pilots without a manual QA review path.

## 3. Workstreams

- telephony and realtime voice
- Cliniko integration
- self-serve onboarding and demo mode
- policy engine and prompts
- data model and logging
- internal ops tooling
- QA and pilot rollout

## 4. Week-by-Week Plan

## Week 1: Voice Skeleton

### Outcome

Live inbound calls can be routed through Twilio into the backend and handled by a Gemini Live session with stable audio playback, interruption handling, and a credible first-impression voice experience.

### Tickets

#### VV-001: Project skeleton

- create service structure for backend, integrations, and ops UI
- define environment config strategy
- define local development startup flow

Exit criteria:

- repo can run locally with stubbed configuration

#### VV-002: Twilio inbound route

- create Twilio webhook endpoint
- return TwiML to connect media stream
- support test route for a single pilot phone number

Exit criteria:

- inbound test call connects to backend reliably

#### VV-003: Gemini voice session abstraction

- implement `VoiceSession` interface
- create Gemini 3.1 Flash Live adapter
- support connect, send audio, receive audio, close

Exit criteria:

- backend can establish and close a live Gemini session

#### VV-004: Audio conversion pipeline

- receive Twilio mulaw audio
- convert to PCM for Gemini
- convert Gemini audio back to telephony-friendly output
- test stream quality under basic call load

Exit criteria:

- two-way audio is intelligible in a live test call

#### VV-005: Barge-in and interruption handling

- detect interruption signals from live session
- stop playback immediately
- clear queued output

Exit criteria:

- caller can interrupt the assistant without audio overlap artifacts

#### VV-005A: Natural voice baseline

- tune base voice persona and response style
- create internal naturalness score rubric
- test first-impression quality on sample calls

Exit criteria:

- the assistant feels natural enough in test calls to continue to Week 2 buildout

### Risks to watch

- audio artifacts
- delayed first response
- playback queue bugs
- robotic or obviously artificial delivery

## Week 2: Cliniko Booking Loop

### Outcome

Supported booking flows can complete inside a call for approved practitioners and appointment types, with a stubbed Cliniko mode available when live integration is not ready.

### Tickets

#### VV-006: Cliniko auth and clinic config

- store clinic Cliniko credentials securely
- create per-clinic config object
- support connection validation flow for internal ops use

Exit criteria:

- a clinic config can be saved and Cliniko connectivity can be verified

#### VV-006A: Stub Cliniko adapter

- create a stubbed Cliniko data source
- simulate practitioners, appointment types, availability, and booking mutations
- support seeded demo clinic data

Exit criteria:

- the system can run realistic booking flows without live Cliniko access

#### VV-007: Practitioner and appointment-type sync

- fetch practitioners
- fetch appointment types
- store allowlists
- store spoken alias mapping

Exit criteria:

- internal config shows approved practitioners and appointment types for a clinic

#### VV-008: Available times tool

- wrap Cliniko available-times API
- enforce allowlists
- normalize time presentation for callers

Exit criteria:

- assistant can offer valid times for supported bookings

#### VV-009: Create booking tool

- create appointment in Cliniko
- capture booking metadata
- handle booking failure paths

Exit criteria:

- supported booking can be completed and logged

#### VV-009A: Stub payload export and review

- persist the payload that would be sent to Cliniko
- support JSON, CSV, or database-backed review output
- connect simulated actions to call outcome records

Exit criteria:

- every non-live booking action can be inspected clearly after the call

#### VV-010: Confirmation SMS

- send booking SMS via Twilio
- create copy template
- log delivery result

Exit criteria:

- successful bookings trigger a confirmation SMS when enabled

### Risks to watch

- Cliniko availability mismatch
- alias confusion between spoken intent and real appointment types
- duplicate booking attempts
- stub mode drifting from real integration behavior

## Week 3: Safety, Escalation, and Logging

### Outcome

Calls are auditable, risky requests are escalated, unsupported requests fail safely, and high-priority action items are surfaced clearly.

### Tickets

#### VV-011: Prompt contract

- define assistant persona
- define supported actions
- define escalation triggers
- define forbidden behaviors

Exit criteria:

- prompt spec exists and is versioned in the codebase

#### VV-012: Escalation policy engine

- define human request triggers
- define clinical advice trigger
- define emergency/distress trigger
- define unsupported-intent trigger

Exit criteria:

- assistant can route unsupported or risky calls to the fallback path

#### VV-012A: Allied-health admin intents

- support late-arrival capture
- support callback request capture
- support non-clinical practitioner/service routing guidance
- support cancel-and-offer-reschedule flow

Exit criteria:

- these supported admin intents work consistently without crossing into clinical advice

#### VV-013: Transcript and event logging

- store transcript turns
- store tool calls and results
- store call outcomes
- store escalation reason

Exit criteria:

- every call produces a reviewable event trail

#### VV-013A: Action queue prioritization

- classify calls by action urgency
- mark late arrivals and urgent callbacks as high priority
- separate completed bookings from action-required outcomes

Exit criteria:

- review screens can sort handled calls by next-action priority

#### VV-014: Recording toggle

- support per-clinic recording enablement
- record only when the clinic has opted in
- store recording metadata securely

Exit criteria:

- recording behavior follows clinic configuration

### Risks to watch

- missing logs for failed calls
- overconfident prompt behavior
- escalation rules that are too weak
- staff still cannot tell what needs attention first

## Week 4: Internal Ops Console and Pilot Config

### Outcome

Internal ops and a happy-path clinic user can configure a pilot clinic, run a test experience, and review what happened without relying on raw logs.

### Tickets

#### VV-015: Internal clinic config screen

- create internal-only UI
- edit clinic basics
- configure allowlists
- configure FAQ content
- configure fallback number and escalation policy

Exit criteria:

- an internal operator can configure a pilot clinic end-to-end

#### VV-015A: Self-serve setup flow

- create a narrow customer-facing onboarding path
- collect business details, fallback number, FAQs, and booking policy
- support live Cliniko connect or stub/demo mode
- finish with a test-number or call-now step

Exit criteria:

- a happy-path user can finish setup and reach a live test call without manual help

#### VV-016: Internal call review screen

- list calls
- filter failed and escalated calls
- view transcript
- view booking result
- access recording when available

Exit criteria:

- internal ops can review pilot calls from one screen
- action-required calls are clearly prioritized

#### VV-017: FAQ management

- add and edit approved FAQ items
- order items for prompt assembly
- validate empty state and missing-answer behavior

Exit criteria:

- clinic FAQ set can be managed without code changes

#### VV-017A: Demo clinic experience

- create one polished demo clinic dataset
- create one memorable demo call path
- make resulting booking or action output visible immediately after test

Exit criteria:

- Ian or a prospect can call the number and have a convincing first experience

#### VV-018: Pilot environment hardening

- validate env config
- rate-limit risky endpoints
- add alerting for critical failures

Exit criteria:

- pilot environment is stable enough for real calls

### Risks to watch

- internal tool brittleness
- missing pilot config fields
- weak observability
- self-serve flow getting stuck or feeling too technical

## Week 5: QA and Pilot Readiness

### Outcome

The product is stable enough to onboard the first pilot clinic, support self-serve test setup, and begin limited live traffic.

### Tickets

#### VV-019: Test harness

- create scripted test-call scenarios
- create supported-intent scenarios
- create unsupported-intent scenarios
- create interruption scenarios
- create demo-mode scenarios
- create late-arrival and callback scenarios

Exit criteria:

- repeatable test runs exist for the main call paths

#### VV-020: Call review rubric

- define scorecard for voice quality, correctness, escalation, and cleanup burden
- use scorecard for internal review

Exit criteria:

- every reviewed call can be scored consistently

#### VV-021: Pilot onboarding checklist

- define steps for Twilio routing
- define Cliniko credential collection
- define stub-mode setup path
- define FAQ intake
- define fallback policy intake

Exit criteria:

- a pilot clinic can be onboarded through a repeatable checklist

#### VV-022: Security and privacy pass

- verify minimum retention defaults
- verify secrets handling
- verify subprocessor disclosure pack
- verify recording defaults

Exit criteria:

- privacy-sensitive defaults are aligned with the product stance

#### VV-022A: First-impression acceptance test

- run founder and prospect-style test calls
- score naturalness, clarity, and signup intent
- fix obvious friction before live pilot traffic

Exit criteria:

- the demo path is strong enough that a reasonable prospect would want a pilot

### Risks to watch

- onboarding friction
- unclear pilot ownership
- privacy review gaps
- demo quality not matching the sales promise

## Week 6: Pilot Launch and Learning Loop

### Outcome

One clinic is live on overflow or after-hours routing, the demo number is prospect-ready, and the team is reviewing calls and tightening the system based on evidence.

### Tickets

#### VV-023: Pilot 1 go-live

- route overflow or after-hours traffic
- monitor first live calls
- review all calls daily in week 1

Exit criteria:

- pilot clinic is live and real calls are flowing

#### VV-024: Script and policy tuning

- review failed bookings
- review escalations
- tighten prompts and policies

Exit criteria:

- clear improvements are made from real call evidence

#### VV-025: Pilot metrics pack

- produce weekly summary
- count supported calls, bookings, escalations, failures
- estimate captured value
- track setup completion time and naturalness scoring

Exit criteria:

- the clinic receives a simple proof-of-value report

#### VV-026: Case study capture

- identify representative success calls
- capture before/after pain narrative
- draft case-study evidence for future sales

Exit criteria:

- at least one credible pilot proof point exists

### Risks to watch

- low call volume
- staff distrust
- weak proof of value
- strong demo but weak live operations, or the reverse

## 5. Backlog Priorities

### P0: Must Build Before Pilot

- VV-001 to VV-019
- VV-021
- VV-022
- VV-023

### P1: Should Build During Pilot Window

- VV-020
- VV-024
- VV-025

### P2: Nice To Have

- VV-026

## 6. Acceptance Gates

## Gate A: End of Week 1

- call routing works
- live session works
- two-way audio is stable
- interruption handling works

## Gate B: End of Week 2

- supported bookings can complete in Cliniko or stub mode
- booking failures do not silently fail
- SMS confirmation works
- stub payloads are inspectable

## Gate C: End of Week 4

- internal ops can configure a clinic
- a happy-path user can self-configure a demo clinic
- all calls are logged for review
- escalation policy is testable

## Gate D: Pilot Readiness

- test harness covers supported and unsupported flows
- privacy defaults are reviewed
- one clinic config is fully prepared
- demo path is strong enough for prospect testing

## Gate E: Post-Pilot Week 1

- real calls have been reviewed
- obvious failures have been fixed
- one value narrative is emerging

## 7. Dependencies

- Twilio account and pilot routing setup
- Gemini API access for live sessions
- Cliniko pilot credentials or stub dataset
- data store and secrets infrastructure
- one internal operator for daily QA

## 8. Team Roles

Minimum roles for the POC:

- product / founder: ICP, pilot onboarding, QA review, GTM feedback, demo scoring
- backend engineer: realtime orchestration, integrations, logging
- frontend engineer or full-stack support: internal ops console and self-serve setup
- QA / ops: daily call review during pilot

If the team is smaller, founder must absorb product QA and pilot operations.

## 9. Kill Criteria

Stop or narrow further if any of these happen during pilot:

- booking completion remains low despite conservative scope
- staff cleanup burden is high
- callers object heavily to the AI disclosure
- escalation quality is poor
- live voice reliability is unstable under normal call volume
- happy-path setup still requires too much manual intervention
- prospects are underwhelmed by the demo experience

## 10. What Not To Do

Do not spend the POC window on:

- fancy branding
- a broad customer portal beyond setup and demo
- multi-site support
- complex analytics
- broad vertical expansion
- marketplace optimization before pilot proof
