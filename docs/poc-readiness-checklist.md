# POC Readiness Checklist

Last updated: 2026-03-29
Project: Veriti Voice Overflow

## Purpose

This checklist defines what "real POC ready" means for Veriti Voice Overflow.

It is designed around the current success measures:

- a Cliniko clinic should feel they can self-set up the product
- the assistant should sound natural and human enough to create trust quickly
- handled calls should be prioritized clearly for staff follow-up
- Cliniko writes can remain stubbed, but the pushed payloads must be visible
- a prospect should be able to call the number and come away wanting to sign up

## Must Have Before Prospect Demo

- Twilio number is configured and points to the generated `/twilio/voice` webhook.
- Public HTTPS base URL is configured so Twilio can reach the app.
- Media stream resolves to `wss://` and succeeds end-to-end.
- Gemini Live mode is enabled and producing real speech output, not stub tone audio.
- Opening disclosure is present and sounds calm and natural.
- The first response is fast enough that the call feels conversational.
- The assistant can handle:
  - new booking
  - reschedule
  - cancel and offer reschedule follow-up
  - late arrival notice
  - callback request
  - "who should I see?" routing guidance
- Booking, reschedule, and cancel actions produce visible stub payloads.
- The action queue surfaces urgent items first.
- Staff can mark queue items as new, reviewed, or done without losing prioritization.
- The setup screen makes the happy-path setup feel self-serve and low friction.
- A demo operator can inspect transcripts, queue items, and payloads after the call.

## Must Have Before Pilot

- Real phone testing has been completed on a live Twilio number.
- At least one full inbound call has completed over PSTN with real Gemini audio.
- Failure paths are graceful:
  - provider timeout
  - bad media stream
  - unsupported request
  - after-hours escalation
- Sessions, transcripts, and queue items are persisted in a more durable store than local JSON.
- SMS confirmation or callback follow-up path is believable and testable.
- Prompting and voice behavior have been tuned against real calls, not only debug sessions.
- Basic operational logging exists for call failures, slow turns, and missing follow-up actions.
- Privacy and disclosure language has been reviewed for demo-safe use.

## Explicitly Deferred For This POC

- Real Cliniko account verification
- Real Cliniko writes
- Full patient matching and deduplication
- Production-grade analytics
- Full compliance hardening for production rollout
- Broad multi-clinic onboarding beyond the narrow Cliniko-aligned happy path

## Current Status Snapshot

- Gemini Live transport: validated locally against the real service
- Twilio media loop: validated through the local debug websocket path
- Twilio real phone readiness: partially complete, now visible in `/demo/twilio-status`
- Cliniko live adapter: scaffolded, intentionally left unverified against a real account
- Setup and review UI: strong demo workbench, still needs more polish for prospect-facing demos
- Persistence: still local JSON only

## Remaining Highest-Value Work

1. Put a real Twilio number on the build and point it at the public `/twilio/voice` URL.
2. Tune the live Gemini prompt and voice until calls feel consistently natural.
3. Tighten the core call flows so every supported outcome produces the right queue item and stub payload.
4. Move session and queue persistence to a small relational database.
5. Polish the demo UI so setup, readiness, and post-call review feel customer-facing rather than internal.

## Demo Exit Gate

The POC is ready for a serious prospect demo when all of the following are true:

- someone can call a real number from their own phone
- the assistant answers naturally and handles interruption reasonably well
- at least one booking and one non-booking scenario complete cleanly
- the clinic can see what happened afterward in the queue and payload view
- nothing in the experience feels obviously fake, brittle, or confusing
