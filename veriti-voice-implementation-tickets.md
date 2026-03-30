# Veriti Voice Overflow Implementation Tickets

Last updated: 2026-03-29
Status: Ready for engineering kickoff

## How To Use This

This document converts the PRD and POC backlog into issue-ready implementation tickets. Each ticket is intentionally narrow, dependency-aware, and sized to support fast iteration.

Suggested labels:

- `epic:foundation`
- `epic:voice`
- `epic:cliniko`
- `epic:safety`
- `epic:ops`
- `epic:onboarding`
- `epic:pilot`
- `prio:p0`
- `prio:p1`
- `prio:p2`

Suggested statuses:

- `todo`
- `in-progress`
- `blocked`
- `ready-for-review`
- `done`

## Epic A: Foundation

### VV-001: Create monorepo skeleton

Priority: P0
Depends on: none

Scope:

- create repo root structure
- create backend app package
- create ops UI package
- create shared docs folder
- create env example files

Acceptance criteria:

- repo boots locally with documented commands
- backend and ops UI have separate entry points
- environment variables are documented in `.env.example`

### VV-002: Define environment and secrets contract

Priority: P0
Depends on: VV-001

Scope:

- define required env vars for Twilio, Gemini, Cliniko, database, and auth
- define secret names for production
- define local-development fallback behavior

Acceptance criteria:

- a new developer can identify all required secrets from docs
- backend fails fast on missing required env vars

### VV-003: Add CI basics

Priority: P1
Depends on: VV-001

Scope:

- lint backend
- type-check backend
- lint ops UI
- run unit tests

Acceptance criteria:

- pull requests run automated checks
- failing checks block merge

## Epic B: Telephony and Realtime Voice

### VV-010: Implement Twilio inbound webhook

Priority: P0
Depends on: VV-001, VV-002

Scope:

- create inbound webhook endpoint
- return TwiML for overflow call handling
- support pilot-specific routing config

Acceptance criteria:

- Twilio can reach the webhook in test mode
- a test call receives valid TwiML

### VV-011: Implement media stream session bootstrap

Priority: P0
Depends on: VV-010

Scope:

- accept Twilio media stream connection
- create call session record
- initialize session state

Acceptance criteria:

- inbound media stream attaches to a created call session
- failed session bootstrap is logged cleanly

### VV-012: Implement `VoiceSession` abstraction

Priority: P0
Depends on: VV-001

Scope:

- define interface for connect, send audio, receive events, and close
- define normalized event types for audio, transcripts, interruptions, and tool calls
- isolate provider-specific behavior behind adapter boundary

Acceptance criteria:

- application code depends on `VoiceSession`, not Gemini-specific classes
- a mock implementation can be used in tests

### VV-013: Implement Gemini Live adapter

Priority: P0
Depends on: VV-012, VV-002

Scope:

- connect to `gemini-3.1-flash-live-preview`
- support audio input and output
- enable output transcription
- normalize Gemini events into internal event types

Acceptance criteria:

- adapter can create a live session and emit normalized events
- multi-part server events are handled correctly
- tool calls are surfaced to the orchestration layer

### VV-014: Implement audio transcoding pipeline

Priority: P0
Depends on: VV-011, VV-013

Scope:

- decode Twilio mulaw input
- encode/decode PCM for Gemini
- encode assistant output for telephony playback

Acceptance criteria:

- caller and assistant audio are intelligible in live tests
- output latency stays acceptable in pilot-style test calls

### VV-015: Implement interruption handling

Priority: P0
Depends on: VV-013, VV-014

Scope:

- listen for interruption signals
- stop queued playback immediately
- reset session output buffer state

Acceptance criteria:

- caller can barge in without overlapping audio
- interrupted turns do not continue playing stale audio

### VV-016: Implement session renewal / recovery

Priority: P1
Depends on: VV-013

Scope:

- handle session duration guardrails
- support session renewal or reconnection path
- stitch transcripts across renewed sessions

Acceptance criteria:

- long test calls do not fail silently at the session limit
- renewed sessions retain a continuous audit trail

### VV-017: Tune natural voice experience

Priority: P0
Depends on: VV-013, VV-015

Scope:

- tune voice persona and response style
- add naturalness test rubric
- refine turn length and confirmation phrasing for human-like delivery

Acceptance criteria:

- internal reviewers score the experience as natural enough for prospect demos
- voice output remains concise and clear during booking flows

## Epic C: Orchestration and Policy

### VV-020: Define call-session state machine

Priority: P0
Depends on: VV-011, VV-012

Scope:

- define states for ringing, active, awaiting-tool, escalated, completed, failed
- define allowed transitions
- define terminal states

Acceptance criteria:

- orchestration code uses explicit state transitions
- invalid transitions are logged as errors

### VV-021: Build prompt assembly pipeline

Priority: P0
Depends on: VV-020

Scope:

- build prompt from persona, clinic policy, FAQs, escalation rules, and tool contract
- version prompt templates
- separate base prompt from clinic-specific data

Acceptance criteria:

- each call session can reproduce the exact prompt version used
- clinic-specific content is injected through structured inputs

### VV-022: Implement tool routing layer

Priority: P0
Depends on: VV-012, VV-020

Scope:

- receive tool calls from `VoiceSession`
- route to internal handler registry
- return synchronous tool responses to Gemini

Acceptance criteria:

- supported tool calls complete in-session
- unsupported tool names fail safely and trigger escalation

### VV-023: Implement escalation policy engine

Priority: P0
Depends on: VV-021

Scope:

- encode escalation triggers
- support clinic fallback strategy
- return deterministic escalation decisions

Acceptance criteria:

- escalation logic is testable without a live call
- emergency, clinical, and unsupported intents trigger escalation

### VV-024: Implement allied-health admin intents

Priority: P1
Depends on: VV-021, VV-023

Scope:

- late-arrival notice capture
- callback request capture
- cancel-and-offer-reschedule flow
- non-clinical practitioner or service routing guidance

Acceptance criteria:

- supported admin intents work through deterministic policy rules
- practitioner guidance stays inside clinic-approved, non-clinical boundaries

## Epic D: Cliniko Integration

### VV-030: Implement Cliniko client wrapper

Priority: P0
Depends on: VV-002

Scope:

- create authenticated Cliniko client
- centralize API request logic
- map Cliniko errors into app-specific errors

Acceptance criteria:

- all Cliniko API access goes through one wrapper
- rate-limit and auth failures are logged clearly

### VV-031: Implement clinic connectivity validation

Priority: P0
Depends on: VV-030

Scope:

- validate subdomain and API key
- fetch sample resources to confirm permissions
- return operator-friendly validation result

Acceptance criteria:

- internal ops can verify Cliniko connectivity before pilot go-live

### VV-032: Sync practitioners and appointment types

Priority: P0
Depends on: VV-030

Scope:

- fetch practitioners
- fetch appointment types
- store local copies for allowlisting

Acceptance criteria:

- internal ops can see and configure current practitioner and appointment type data

### VV-033: Implement booking policy model

Priority: P0
Depends on: VV-032

Scope:

- define allowlists for practitioners and appointment types
- define spoken alias mapping
- define clinic-specific booking constraints

Acceptance criteria:

- policy rules can be changed without code changes
- unsupported practitioner/type combinations are rejected before booking

### VV-034: Implement available-times tool

Priority: P0
Depends on: VV-030, VV-033, VV-022

Scope:

- fetch available times from Cliniko
- apply local policy filters
- normalize slot presentation for voice use

Acceptance criteria:

- only policy-approved availability is offered to callers
- empty-availability cases return graceful fallback responses

### VV-035: Implement create-booking tool

Priority: P0
Depends on: VV-034

Scope:

- create supported appointment in Cliniko
- capture booking metadata
- confirm success or failure to orchestration layer

Acceptance criteria:

- completed bookings are written correctly to Cliniko
- duplicate or conflicting attempts fail safely

### VV-036: Implement reschedule / cancel tools

Priority: P1
Depends on: VV-035

Scope:

- locate supported appointment
- update or cancel booking when policy allows
- log before-and-after action details

Acceptance criteria:

- supported changes are reflected correctly in Cliniko
- ambiguous matches escalate instead of guessing

### VV-037: Implement Cliniko stub adapter

Priority: P0
Depends on: VV-033

Scope:

- create a stub adapter that mirrors the Cliniko wrapper interface
- support demo practitioners, appointment types, availability, and booking mutations
- allow switching between live and stub mode per clinic

Acceptance criteria:

- booking flows can run without live Cliniko access
- the same orchestration path works against live and stub adapters

### VV-038: Implement Cliniko payload preview and export

Priority: P0
Depends on: VV-037, VV-040

Scope:

- persist the payload that would be sent to Cliniko in stub mode
- support JSON and CSV review output
- attach payload preview to booking and call records

Acceptance criteria:

- operators and prospects can inspect what would have been written to Cliniko
- every stubbed mutation is traceable from the call review flow

## Epic E: Data, Logging, and Security

### VV-040: Define database schema

Priority: P0
Depends on: VV-001

Scope:

- define tables for clinic, config, FAQs, call sessions, transcript turns, tool events, escalation events, and booking actions
- define tenant ownership fields

Acceptance criteria:

- schema supports end-to-end pilot workflows
- all major user and system actions are represented

### VV-041: Implement call event logging

Priority: P0
Depends on: VV-040, VV-020

Scope:

- log session start/end
- log tool calls
- log escalations
- log failures

Acceptance criteria:

- every pilot call has a reviewable event trail

### VV-042: Implement transcript persistence

Priority: P0
Depends on: VV-040, VV-013

Scope:

- store input transcription
- store output transcription
- maintain ordered transcript turns

Acceptance criteria:

- transcripts can be reconstructed for completed and failed calls

### VV-043: Implement recording policy and metadata

Priority: P1
Depends on: VV-040, VV-010

Scope:

- store recording settings per clinic
- capture recording metadata only when enabled
- secure access to recordings

Acceptance criteria:

- recordings are off by default
- enabled recordings are accessible through signed or controlled access only

### VV-044: Implement secrets management contract

Priority: P0
Depends on: VV-002

Scope:

- define encrypted storage path for Cliniko credentials
- define runtime access pattern for secrets
- document rotation process

Acceptance criteria:

- secrets are never stored in plaintext app config

## Epic F: Internal Ops Console

### VV-050: Build internal authentication and access gate

Priority: P0
Depends on: VV-001, VV-040

Scope:

- create internal-only access model
- restrict ops console to Veriti operators

Acceptance criteria:

- non-operators cannot access internal screens

### VV-051: Build clinic config screen

Priority: P0
Depends on: VV-032, VV-033, VV-050

Scope:

- edit clinic basics
- configure fallback number
- manage allowlists
- manage appointment aliases

Acceptance criteria:

- an operator can prepare a clinic without touching the database directly

### VV-052: Build FAQ management screen

Priority: P0
Depends on: VV-050, VV-040

Scope:

- create, edit, delete, and order FAQ items
- validate required fields

Acceptance criteria:

- FAQ content updates are reflected in future prompt assembly

### VV-053: Build call review screen

Priority: P0
Depends on: VV-041, VV-042, VV-050

Scope:

- list calls by clinic
- filter failed and escalated calls
- filter action-required calls
- view transcript, outcome, and booking result

Acceptance criteria:

- ops can review pilot calls without reading raw logs

### VV-055: Build self-serve setup flow

Priority: P0
Depends on: VV-031, VV-032, VV-033, VV-037

Scope:

- create a narrow happy-path onboarding flow
- collect business details, fallback number, FAQs, and booking policy
- support live Cliniko connection or stub/demo mode
- finish with a test-call step

Acceptance criteria:

- a happy-path user can complete setup and place a test call without manual help
- live and stub setup paths both produce usable clinic configuration

### VV-056: Build demo/test-call flow

Priority: P0
Depends on: VV-055, VV-017

Scope:

- create a polished demo clinic experience
- expose a demo number or direct test-call flow
- show resulting booking or action output after the call

Acceptance criteria:

- Ian or a prospect can call a number and experience a convincing end-to-end demo
- post-call output is visible immediately

### VV-057: Build prioritized action queue

Priority: P0
Depends on: VV-041, VV-042, VV-053, VV-024

Scope:

- classify handled calls by required next action
- prioritize late arrivals, urgent callbacks, and failed bookings
- separate no-action-completed calls from staff-action-required calls

Acceptance criteria:

- the review UI clearly surfaces which calls need attention first
- prioritization rules are deterministic and testable

### VV-054: Build recording access flow

Priority: P1
Depends on: VV-043, VV-053

Scope:

- show recording link only when enabled and available
- enforce controlled access

Acceptance criteria:

- recordings are only exposed to authorized ops users

## Epic G: Testing and QA

### VV-060: Create unit test harness for policy and orchestration

Priority: P0
Depends on: VV-020, VV-023, VV-033

Scope:

- test state transitions
- test escalation rules
- test booking policy evaluation

Acceptance criteria:

- critical logic is covered by deterministic tests

### VV-061: Create integration tests for Cliniko tools

Priority: P0
Depends on: VV-034, VV-035

Scope:

- test availability path
- test booking path
- test failure path mapping

Acceptance criteria:

- supported Cliniko operations are covered by integration tests

### VV-062: Create scripted call test scenarios

Priority: P0
Depends on: VV-015, VV-023, VV-035

Scope:

- supported booking scenario
- no-availability scenario
- clinical-question scenario
- human-request scenario
- interruption scenario
- late-arrival scenario
- practitioner-guidance scenario
- demo-mode scenario

Acceptance criteria:

- team can run repeatable end-to-end call tests before pilot go-live

### VV-063: Define QA scorecard

Priority: P1
Depends on: VV-053

Scope:

- define quality rubric for latency, correctness, escalation, tone, and cleanup burden
- include naturalness and signup-intent scoring for demo calls
- create review checklist for pilot operations

Acceptance criteria:

- call reviewers use a consistent scoring framework

## Epic H: Pilot Operations

### VV-070: Define pilot onboarding checklist

Priority: P0
Depends on: VV-051, VV-052

Scope:

- capture clinic FAQ set
- capture booking policy
- capture fallback rules
- capture routing plan

Acceptance criteria:

- one operator can onboard a clinic from a repeatable checklist

### VV-071: Build proof-of-value metrics summary

Priority: P1
Depends on: VV-041, VV-042, VV-053

Scope:

- aggregate supported calls, bookings, escalations, and failures
- aggregate setup time and action-queue metrics
- produce weekly pilot summary

Acceptance criteria:

- team can send pilot clinic a weekly value summary without manual spreadsheet work

### VV-074: Track self-serve funnel and demo intent

Priority: P1
Depends on: VV-055, VV-056

Scope:

- capture setup started, setup completed, test call started, and test call completed
- capture internal or prospect naturalness and signup-intent scoring

Acceptance criteria:

- the team can measure whether the POC is easy to set up and compelling to test

### VV-072: Launch pilot 1

Priority: P0
Depends on: VV-062, VV-070

Scope:

- configure one pilot clinic
- route overflow or after-hours traffic
- monitor live call behavior

Acceptance criteria:

- pilot clinic is handling real traffic with daily QA review

### VV-073: Tune prompts and policies from live calls

Priority: P0
Depends on: VV-072

Scope:

- review failed calls
- tighten prompt instructions
- adjust policies and FAQ content

Acceptance criteria:

- at least one measurable improvement is shipped from pilot findings

## Recommended Build Order

### Sprint 1

- VV-001
- VV-002
- VV-010
- VV-011
- VV-012
- VV-013
- VV-014
- VV-015
- VV-020

### Sprint 2

- VV-021
- VV-022
- VV-023
- VV-024
- VV-030
- VV-031
- VV-032
- VV-033
- VV-037
- VV-034
- VV-035

### Sprint 3

- VV-040
- VV-041
- VV-042
- VV-038
- VV-044
- VV-050
- VV-051
- VV-052
- VV-053
- VV-055
- VV-056
- VV-057
- VV-060
- VV-061
- VV-062

### Sprint 4

- VV-070
- VV-072
- VV-073
- VV-071
- VV-074
- VV-016
- VV-036
- VV-043
- VV-054
- VV-063

## Current Recommendation

If we start implementation next, the best first ticket stack is:

1. VV-001
2. VV-002
3. VV-012
4. VV-010
5. VV-011
6. VV-013
7. VV-014
8. VV-015
9. VV-017

That sequence gets us to the first live voice loop fastest while keeping the architecture clean.
