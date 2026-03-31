# Implementation Log

Last updated: 2026-03-29
Project: Veriti Voice Overflow
Purpose: Living engineering record of what has been built, how it was verified, what is still stubbed, and what should happen next.

## How To Use This

This file is the running delivery log for the repo. It should be updated as implementation continues.

Each entry should capture:

- what changed
- why it changed
- how it was verified
- what remains incomplete

## Current Product Intent

The current build target is:

- a self-guided, demo-friendly, Cliniko-oriented voice agent POC
- convincing enough that Ian or a prospect can test it and want to move to pilot
- narrow enough that we can keep the product safe and operationally believable

The demo must show:

- self-serve happy-path setup
- natural-feeling call flow directionally
- booking preview payloads
- prioritized call/session records
- a believable realtime voice/media loop

It should also stay explicit about what is intentionally deferred:

- real Cliniko account verification is not required for this POC
- real Cliniko writes remain off by default
- production compliance hardening is not the current build target

## Milestone Summary

### 2026-03-28 to 2026-03-29: Product Strategy and Build Planning

Created:

- [geminiflash.md](/Users/treemacair/Documents/Call%20Agents/geminiflash.md)
- [veriti-voice-strategic-plan.md](/Users/treemacair/Documents/Call%20Agents/veriti-voice-strategic-plan.md)
- [veriti-voice-prd.md](/Users/treemacair/Documents/Call%20Agents/veriti-voice-prd.md)
- [veriti-voice-poc-backlog.md](/Users/treemacair/Documents/Call%20Agents/veriti-voice-poc-backlog.md)
- [veriti-voice-implementation-tickets.md](/Users/treemacair/Documents/Call%20Agents/veriti-voice-implementation-tickets.md)
- [veriti-voice-architecture-decisions.md](/Users/treemacair/Documents/Call%20Agents/veriti-voice-architecture-decisions.md)

Outcome:

- strategy narrowed from broad "AI receptionist" framing to a safer Cliniko-oriented overflow booking wedge
- POC goals expanded to include self-serve setup, stub Cliniko mode, naturalness scoring, prioritized follow-up actions, and a compelling demo path

### 2026-03-29: Monorepo Scaffold

Created repo skeleton:

- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)
- [.env.example](/Users/treemacair/Documents/Call%20Agents/.env.example)
- [package.json](/Users/treemacair/Documents/Call%20Agents/package.json)
- [apps/api](/Users/treemacair/Documents/Call%20Agents/apps/api)
- [apps/ops](/Users/treemacair/Documents/Call%20Agents/apps/ops)
- [packages/shared](/Users/treemacair/Documents/Call%20Agents/packages/shared)
- [docs/setup-contract.md](/Users/treemacair/Documents/Call%20Agents/docs/setup-contract.md)

Backend scaffold highlights:

- FastAPI app entrypoint
- health route
- Twilio webhook route
- `VoiceSession` abstraction
- Gemini adapter stub
- call state machine primitive

Frontend scaffold highlights:

- Vite/React app
- setup/demo shell
- action queue card

Verification:

- Python source compilation passed
- frontend dependencies installed
- frontend build passed

### 2026-03-29: Demo API and Cliniko Stub

Added backend demo capabilities:

- [apps/api/app/api/http/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/demo.py)
- [apps/api/app/integrations/cliniko/adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/adapter.py)
- [apps/api/app/integrations/cliniko/factory.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/factory.py)
- [apps/api/app/integrations/cliniko/stub.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/stub.py)
- [apps/api/app/domain/calls/session_manager.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/calls/session_manager.py)
- [apps/api/app/core/store.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/core/store.py)

Implemented:

- seeded practitioners
- seeded appointment types
- seeded availability
- booking preview payload generation
- call session inspection endpoints

Verification:

- local API import succeeded from repo venv
- `/demo/clinic`, `/demo/practitioners`, `/demo/availability`, and `/demo/booking-preview` returned valid responses

### 2026-03-29: Frontend Demo Workbench

Added:

- [apps/ops/src/lib/api.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/lib/api.ts)
- [apps/ops/src/features/setup/DemoWorkbench.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/setup/DemoWorkbench.tsx)

Implemented:

- demo clinic loading
- practitioners and appointment type loading
- booking preview generation
- stub payload inspection
- call session inspection
- reset controls

Verification:

- frontend build passed after each significant change

### 2026-03-29: Realtime Media Session Path

Added or updated:

- [apps/api/app/api/websocket/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/media.py)
- [apps/api/app/integrations/twilio/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/twilio/media.py)
- [apps/api/app/domain/voice/audio.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/voice/audio.py)
- [apps/api/app/integrations/gemini/adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/adapter.py)
- [scripts/debug-media-session.mjs](/Users/treemacair/Documents/Call%20Agents/scripts/debug-media-session.mjs)

Implemented:

- Twilio-style websocket event handling for `start`, `media`, `mark`, and `stop`
- outbound `media`, `mark`, and `clear` event formatting
- stub assistant transcript generation
- stub outbound telephony audio synthesis
- Twilio-sized outbound audio frame chunking
- debug websocket mode for inspection
- scripted debug media client

Verification:

- websocket runtime dependency added to backend venv
- scripted debug session completed end-to-end
- returned:
  - `session_bootstrapped`
  - `stream_started`
  - caller transcript event
  - assistant transcript event
  - outbound Twilio `media` events
  - `media_ack`
  - `stream_stopped`
- persisted session showed:
  - `inbound_audio_chunk_count = 1`
  - `outbound_audio_chunk_count = 69`

### 2026-03-29: Provider Audio Boundary Alignment

Updated:

- [apps/api/app/domain/voice/audio.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/voice/audio.py)
- [apps/api/app/api/websocket/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/media.py)
- [apps/api/app/integrations/gemini/adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/adapter.py)
- [apps/api/tests/test_voice_audio.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_voice_audio.py)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- explicit audio conversion helpers for:
  - Twilio `mu-law/8kHz` to provider `PCM16/16kHz`
  - provider `PCM16/24kHz` to Twilio `mu-law/8kHz`
- internal sample-rate constants for the current Gemini Live assumptions captured in `geminiflash.md`
- stub provider audio generation in provider-native PCM format instead of generating telephony audio directly
- websocket edge conversion so the `VoiceSession` boundary now receives provider-shaped audio and emits provider-shaped audio
- richer debug acknowledgements showing both Twilio-edge byte counts and provider-side byte counts

Why this changed:

- the earlier stub path worked end-to-end but skipped the real transport shape we will need for Gemini Live
- moving the codec conversion to the websocket edge keeps the provider adapter honest and reduces future rework when the real Gemini websocket client is added

Verification:

- backend compile pass succeeded after the conversion changes
- direct runtime check succeeded with:
  - `provider_bytes = 20160`
  - `telephony_bytes = 3360`
  - `inbound_provider_bytes = 13438`
  - `outbound_twilio_bytes = 3360`
- frontend production build passed
- scripted debug websocket session passed end-to-end against a live local server
- debug session now shows:
  - caller transcript referencing provider-formatted `16000Hz` PCM input
  - assistant `audio_chunk` events advertising `audio/pcm;rate=24000`
  - `media_ack` reporting both `twilioAudioBytes` and `providerAudioBytes`

Still incomplete:

- the Gemini adapter is still synthesizing stub audio rather than relaying real Gemini Live output
- interruption handling is still basic and not yet coordinated with real model playback state
- real Twilio PSTN traffic and live Cliniko writes are still pending

### 2026-03-29: Self-Serve Setup and Prioritized Demo Queue

Updated:

- [apps/api/app/api/http/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/demo.py)
- [apps/api/app/core/store.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/core/store.py)
- [apps/api/app/domain/calls/session_manager.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/calls/session_manager.py)
- [apps/api/app/schemas/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/schemas/demo.py)
- [apps/api/app/schemas/calls.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/schemas/calls.py)
- [apps/ops/src/lib/api.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/lib/api.ts)
- [apps/ops/src/features/setup/DemoWorkbench.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/setup/DemoWorkbench.tsx)
- [apps/ops/src/features/calls/CallsPriorityCard.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calls/CallsPriorityCard.tsx)
- [apps/ops/src/routes/App.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/routes/App.tsx)
- [apps/ops/src/styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- persistent self-serve setup profile API:
  - `GET /demo/setup-profile`
  - `PUT /demo/setup-profile`
- setup-profile storage normalization so older `dev_store.json` data does not break when new keys are introduced
- richer call-session metadata:
  - caller name
  - captured intent
  - status summary
- simulated allied-health scenarios through `POST /demo/simulate-call` for:
  - new booking
  - reschedule
  - cancel and reschedule callback
  - late arrival
  - who-should-I-see routing
  - callback request
- prioritized action queue endpoint at `GET /demo/action-queue`
- frontend setup workbench reworked into a more product-like flow with:
  - configuration step
  - scenario simulation step
  - booking preview step
  - debug media check
  - stored payload and handled-call inspection
- action queue card now loads real prioritized data instead of static placeholders

Why this changed:

- the POC goals are not just technical voice plumbing; they are also about self-serve setup and a credible clinic operations view
- this slice moves the demo toward "someone can test it and immediately understand the value" rather than "there is a websocket loop"

Verification:

- backend compile pass succeeded

### 2026-03-29: Twilio Demo Readiness Surface

Updated:

- [apps/api/app/integrations/twilio/twiml.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/twilio/twiml.py)
- [apps/api/app/api/http/twilio.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/twilio.py)
- [apps/api/app/api/http/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/demo.py)
- [apps/api/app/domain/calls/session_manager.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/calls/session_manager.py)
- [apps/api/app/schemas/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/schemas/demo.py)
- [apps/api/tests/test_twilio_media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_twilio_media.py)
- [apps/ops/src/lib/api.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/lib/api.ts)
- [apps/ops/src/features/setup/DemoWorkbench.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/setup/DemoWorkbench.tsx)
- [docs/poc-readiness-checklist.md](/Users/treemacair/Documents/Call%20Agents/docs/poc-readiness-checklist.md)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- TwiML helpers for:
  - derived `/twilio/voice` URL
  - derived `/twilio/stream-status` URL
  - demo-facing Twilio readiness assessment
- `POST /twilio/stream-status` to record Twilio media stream lifecycle events
- `/demo/twilio-status` so the ops UI can show whether the build is genuinely ready for a real inbound call
- UI visibility for:
  - voice webhook URL
  - media stream websocket URL
  - stream status callback URL
  - readiness notes
- a dedicated POC readiness checklist that separates:
  - prospect demo gates
  - pilot gates
  - intentionally deferred work

Why this changed:

- the POC needs to prove "someone can call this from a real phone" rather than just "the websocket loop works locally"
- making Twilio readiness explicit reduces demo risk and gives us a clearer definition of done for the next hardening steps

Still incomplete:

- the build is only fully prospect-ready once a real Twilio number is attached to a public HTTPS endpoint
- live PSTN testing is still pending

### 2026-03-29: Operable Front-Desk Queue

Updated:

- [apps/api/app/core/store.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/core/store.py)
- [apps/api/app/schemas/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/schemas/demo.py)
- [apps/api/app/api/http/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/demo.py)
- [apps/ops/src/lib/api.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/lib/api.ts)
- [apps/ops/src/features/calls/CallsPriorityCard.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calls/CallsPriorityCard.tsx)
- [apps/ops/src/styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)

Implemented:

- persistent queue workflow state with:
  - `new`
  - `reviewed`
  - `done`
- `PUT /demo/action-queue/{item_id}` to update queue workflow state
- queue sorting that now considers:
  - urgency
  - workflow state
  - action-required status
- front-desk controls in the ops UI to mark queue items through the workflow

Why this changed:

- one of the core POC success measures is not just that calls are handled, but that the clinic can prioritize and work through the outcomes afterward
- adding operable queue states makes the demo feel more like a usable front-desk product and less like a static inspection console

Still incomplete:

- queue state is still persisted in the local JSON store rather than a production-grade relational DB
- the DemoWorkbench summary counts do not yet live-refresh when queue state changes from the queue card

### 2026-03-29: Call Lab Phase 1

Updated:

- [docs/call-lab-build-plan.md](/Users/treemacair/Documents/Call%20Agents/docs/call-lab-build-plan.md)
- [apps/api/app/api/websocket/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/media.py)
- [apps/api/app/schemas/calls.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/schemas/calls.py)
- [apps/ops/src/features/calllab/CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [apps/ops/src/routes/App.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/routes/App.tsx)
- [apps/ops/src/styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- documented the Call Lab strategy and phased build
- added the first in-browser `Phone Mode` Call Lab surface with:
  - realistic call UI
  - start / end call controls
  - scenario presets
  - quick utterance chips
  - live transcript
  - event timeline
  - assistant speaker playback for returned audio
- added debug-only `veriti_text` turns to `/ws/media` so the browser can simulate multiple caller turns cleanly without sending synthetic Twilio media for every utterance

Why this changed:

- the existing debug harness was good for protocol validation but not for shaping a convincing internal voice experience
- the POC needs a no-Twilio internal tester that still feels product-like and still uses the backend path we care about

Verification:

- backend compile pass succeeded
- frontend production build succeeded

Still incomplete:

- browser microphone capture is handled separately in the next Call Lab milestone below
- Studio Mode is only documented, not implemented yet
- the Call Lab does not yet generate richer post-call operational outcomes beyond the underlying call session record

### 2026-03-29: Call Lab Push-To-Talk Microphone Input

Updated:

- [apps/ops/src/features/calllab/CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [apps/ops/src/styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- browser microphone capture for Call Lab Phone Mode
- push-to-talk recording using browser media APIs
- client-side downsampling into `8kHz` audio for the existing phone-mode websocket path
- client-side mu-law encoding so the browser can send Twilio-shaped media payloads without Twilio
- live mic-level driven waveform changes in the phone UI

Why this changed:

- typed turns were a useful first step, but the next big unlock for internal testing is hearing and speaking through the browser like a real call
- push-to-talk fits the current turn-based backend better than pretending we already support full duplex browser streaming

Verification:

- backend compile pass succeeded
- frontend production build succeeded

Still incomplete:

- this is push-to-talk, not continuous live microphone streaming
- Studio Mode is still pending
- the browser microphone path has not yet been user-validated in a live session from this environment

### 2026-03-29: Call Lab Hands-Free Mode And Outcome Review

Updated:

- [apps/ops/src/features/calllab/CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [apps/ops/src/styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- hands-free browser mic mode with browser-side silence detection
- auto-send of caller turns when the speaker pauses
- Call Lab post-call review panel showing:
  - latest session outcome
  - related queue items
  - latest stub payload snapshot

Why this changed:

- realistic internal call simulation needs to feel closer to "speak naturally and wait for a reply" than "hold a button every time"
- the tester also needs to see what the simulated call actually created operationally, not just hear the conversation

Verification:

- backend compile pass succeeded
- frontend production build succeeded

Still incomplete:

- hands-free mode is still turn-based and browser-side, not true full-duplex telephony behavior
- interruption handling is still lighter than a real live phone call
- Studio Mode is still pending

### 2026-03-29: Browser-Native Call Lab Realtime Route

Updated:

- [apps/api/app/api/websocket/call_lab.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/call_lab.py)
- [apps/api/app/main.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/main.py)
- [apps/api/app/domain/demo/policy.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/demo/policy.py)
- [apps/api/app/api/http/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/demo.py)
- [apps/ops/src/features/calllab/CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [apps/ops/src/lib/api.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/lib/api.ts)
- [scripts/probe-call-lab.mjs](/Users/treemacair/Documents/Call%20Agents/scripts/probe-call-lab.mjs)
- [package.json](/Users/treemacair/Documents/Call%20Agents/package.json)

Implemented:

- browser-native `/ws/call-lab` route for:
  - `start`
  - `text`
  - `audio_chunk`
  - `audio_commit`
  - `interrupt`
  - `stop`
- direct PCM16 browser audio flow for the internal Call Lab instead of forcing the browser through a Twilio-shaped mu-law path
- scenario-linked call aftermath so completed Call Lab sessions can leave behind:
  - session summaries
  - queue effects
  - stub payloads where appropriate
- `npm run probe:call-lab` for scripted verification of the browser-native route

Why this changed:

- the earlier Call Lab was still carrying too much Twilio-shaped protocol baggage for an internal browser-first simulator
- a dedicated internal route gives us a cleaner path toward realistic laptop call testing and future full-duplex improvements

Verification:

- backend compile pass succeeded
- frontend production build succeeded

Still incomplete:

- true full-duplex live conversation is not fully achieved yet because turn commit still gates model response
- interruption is better, but not yet as seamless as a real production phone call
- Studio Mode is still pending

### 2026-03-29: Scenario-Free Call Lab

Updated:

- [apps/api/app/api/websocket/call_lab.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/call_lab.py)
- [apps/api/app/domain/demo/policy.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/demo/policy.py)
- [apps/api/app/domain/calls/session_manager.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/calls/session_manager.py)
- [apps/ops/src/features/calllab/CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [docs/call-lab-build-plan.md](/Users/treemacair/Documents/Call%20Agents/docs/call-lab-build-plan.md)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- removed the requirement to choose a scenario before using Call Lab
- shifted the UI to optional example prompts rather than predetermined call types
- infered likely intent/outcome from the actual caller transcript on completion
- tied inferred aftermath into:
  - session summary
  - queue review
  - stub payload generation where relevant

Why this changed:

- the target experience is an open-ended phone simulation where the tester can simply talk naturally
- requiring a scenario picker made the simulation feel artificial and constrained

Verification:

- backend compile pass succeeded
- frontend production build succeeded

Still incomplete:

- inferred aftermath is still heuristic rather than model-graded
- true full-duplex live behavior is still not complete

### 2026-03-29: Live Event Pump For Call Lab

Updated:

- [apps/api/app/api/websocket/call_lab.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/call_lab.py)
- [apps/ops/src/features/calllab/CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- backend event pump so Call Lab voice events are forwarded continuously instead of only after per-turn draining
- browser-native continuous audio chunk streaming to the Call Lab route
- interruption-aware playback clearing when the caller starts speaking over the assistant
- hands-free mode that can keep the mic loop live while using pause detection to commit turns

Why this changed:

- the remaining realism gap was that the Call Lab still felt like a dressed-up turn simulator
- moving to a continuous event pump makes the browser experience much closer to a genuinely live internal phone call

Verification:

- backend compile pass succeeded
- frontend production build succeeded

Still incomplete:

- real-world browser validation is still needed because this environment cannot place or listen to an actual UI call
- true production-grade full duplex depends partly on live model and device behavior, not only local code structure
- frontend production build succeeded
- route import verification shows:
  - `/demo/setup-profile`
  - `/demo/action-queue`
  - `/demo/simulate-call`
- local API verification succeeded for:
  - `GET /demo/setup-profile`
  - `GET /demo/action-queue`
  - `POST /demo/simulate-call`
  - `GET /demo/call-sessions`
- verified simulated outcomes:
  - high-priority late arrival appears at the top of the queue
  - low-priority new booking appears in the queue and generates a stub payload

Still incomplete:

- the queue is still a demo/operator view, not a full staff-facing workflow app
- setup is self-serve for the demo happy path, not yet a generalized onboarding engine for arbitrary clinic structures
- live Cliniko auth and writeback are still pending

### 2026-03-29: Setup Profile Now Drives Behavior

Updated:

- [apps/api/app/domain/demo/policy.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/demo/policy.py)
- [apps/api/app/domain/voice/session.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/voice/session.py)
- [apps/api/app/domain/voice/factory.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/voice/factory.py)
- [apps/api/app/integrations/gemini/adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/adapter.py)
- [apps/api/app/api/http/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/demo.py)
- [apps/api/app/api/websocket/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/media.py)
- [apps/api/tests/test_demo_policy.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_demo_policy.py)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- shared clinic-policy module for:
  - loading and saving the demo setup profile
  - deriving supported actions from profile toggles
  - building voice-session context
  - resolving simulated call outcomes from clinic policy
- `VoiceSessionContext` so the voice provider layer receives clinic-specific instructions instead of relying on generic hardcoded text
- Gemini stub welcome/assistant responses now reflect:
  - clinic name
  - enabled booking/change/cancel capabilities
  - routing support policy
  - after-hours posture
  - SMS follow-up support
- media websocket bootstrap now annotates sessions as `voice_demo` and passes clinic policy into the `VoiceSession`
- simulated call behavior now changes when toggles change
  - example: disabling self-serve bookings turns a new-booking simulation into a manual callback flow with no stub payload write

Why this changed:

- the earlier setup profile influenced the UI and demo cards, but not the assistant behavior itself
- this slice makes the POC much more honest: configuration choices now affect what the assistant says and what operations the simulated system performs

Verification:

- backend compile pass succeeded
- frontend production build succeeded
- direct runtime policy check showed:
  - `allow_new_bookings = false` removes booking support from the voice context
  - `new_booking` simulation becomes `action_required = true`
  - no stub payload is produced in that state
- local API verification succeeded by:
  - updating `PUT /demo/setup-profile`
  - posting `POST /demo/simulate-call` with `scenario = new_booking`
  - confirming the response switched to a manual-review callback outcome
- local debug media verification succeeded with `npm run debug:media`
  - welcome transcript reflected the current clinic profile
  - assistant transcript reflected the reduced capability set when routing was disabled

Notes:

- after verification, the demo setup profile was restored to the stronger default prospect-demo state with bookings, routing, cancellations, and late-arrival capture enabled

### 2026-03-29: Gemini Live Transport Scaffold

Updated:

- [apps/api/app/integrations/gemini/live.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/live.py)
- [apps/api/app/integrations/gemini/adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/adapter.py)
- [apps/api/app/core/config.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/core/config.py)
- [.env.example](/Users/treemacair/Documents/Call%20Agents/.env.example)
- [apps/api/app/api/http/health.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/health.py)
- [apps/api/tests/test_gemini_live_wire.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_gemini_live_wire.py)
- [scripts/probe-gemini-live.py](/Users/treemacair/Documents/Call%20Agents/scripts/probe-gemini-live.py)
- [package.json](/Users/treemacair/Documents/Call%20Agents/package.json)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- Gemini Live websocket wire helpers for:
  - setup message construction
  - realtime PCM audio message construction
  - realtime text message construction
  - server message parsing into `VoiceEvent`s
- transport modes via env:
  - `stub`
  - `auto`
  - `live`
- `auto` mode behavior:
  - if no API key is present, use stub mode
  - if an API key is present, try the live websocket transport
  - if live connection fails, fall back to stub mode
- explicit live-mode configuration knobs:
  - websocket endpoint
  - prebuilt Gemini voice name
  - max output tokens
- direct probe command:
  - `npm run probe:gemini`
  - uses the same `GeminiLiveVoiceSession` adapter as the application
  - works in stub mode for local sanity checks and is ready for live mode when a key is available
- adapter refactor so the same `GeminiLiveVoiceSession` can run either:
  - a real websocket receive loop, or
  - the existing local stub synthesis path
- health endpoint now reports the configured Gemini transport mode
- stub text turns now return an assistant transcript and turn completion so the probe script yields a meaningful local result

Why this changed:

- the repo needed a real integration path toward Gemini Live, not just a placeholder comment saying it would come later
- this keeps the project buildable and demoable locally while also giving us a concrete place to finish the production transport once credentials and external connectivity are available

Verification:

- backend compile pass succeeded
- frontend production build succeeded
- runtime import check succeeded for the new `GeminiLiveVoiceSession`
- local debug media session still completed end-to-end after the adapter refactor
- `GEMINI_LIVE_TRANSPORT=stub npm run probe:gemini` succeeded and returned:
  - connect transcript
  - input transcript
  - assistant transcript
  - turn complete
- new wire-shape tests were added for:
  - setup message contents
  - realtime audio message encoding
  - server message parsing into transcript/audio/turn-complete events

Still incomplete:

- real Gemini Live connectivity was not exercised against Google from this environment because no local `.env` / `GEMINI_API_KEY` was present
- tool-calling over Gemini Live is not yet wired into the internal action/tool boundary
- live-session retry, reconnect, and resumption behavior are still not implemented

### 2026-03-29: Real Gemini Live Verification

Updated:

- [apps/api/app/integrations/gemini/live.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/live.py)
- [apps/api/app/api/websocket/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/media.py)
- [scripts/debug-media-session.mjs](/Users/treemacair/Documents/Call%20Agents/scripts/debug-media-session.mjs)
- [apps/api/tests/test_gemini_live_wire.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_gemini_live_wire.py)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- fixed the first real Gemini protocol mismatch:
  - `setup.systemInstruction` now sends a proper `Content` object with `parts[].text`
- added a debug-only `debugText` assist path to `/ws/media`
  - this lets the local media verifier drive a deterministic live Gemini turn even though the debug client only sends tiny synthetic telephony audio chunks
- improved the debug media script shutdown behavior so successful live runs exit cleanly after `media_ack`

What was verified against the real Gemini service:

- direct live adapter probe succeeded after the system-instruction fix
- Gemini returned:
  - real output transcript chunks
  - real `audio/pcm;rate=24000` chunks
- the local API was then run in `GEMINI_LIVE_TRANSPORT=live`
- `npm run debug:media` succeeded against `/ws/media` with the real Gemini backend
- the media loop returned:
  - `session_bootstrapped`
  - `stream_started`
  - incremental live output transcript events
  - real outbound audio converted into Twilio-style media frames
  - `media_ack` with `live_turn_complete`

Why this matters:

- the Gemini path is no longer just scaffolded on paper; the core live transport has been exercised against the real Google endpoint and proven to work through our local Twilio-style media bridge

Still incomplete:

- live tool-calling is still not wired into the internal function/tool boundary
- the `/ws/media` verification still relies on a debug-only text assist for deterministic local testing
- retry/resume/reconnect behavior for production-grade live sessions is still pending

### 2026-03-29: Cliniko Live Adapter Scaffold

Updated:

- [apps/api/app/integrations/cliniko/live.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/live.py)
- [apps/api/app/integrations/cliniko/factory.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/factory.py)
- [apps/api/app/integrations/cliniko/adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/adapter.py)
- [apps/api/app/integrations/cliniko/stub.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/stub.py)
- [apps/api/app/schemas/cliniko.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/schemas/cliniko.py)
- [apps/api/app/core/config.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/core/config.py)
- [apps/api/app/api/http/demo.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/http/demo.py)
- [apps/api/tests/test_live_cliniko.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_live_cliniko.py)
- [apps/ops/src/lib/api.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/lib/api.ts)
- [apps/ops/src/features/setup/DemoWorkbench.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/setup/DemoWorkbench.tsx)
- [.env.example](/Users/treemacair/Documents/Call%20Agents/.env.example)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

Implemented:

- Cliniko adapter modes:
  - `stub`
  - `auto`
  - `live`
- live Cliniko configuration surface:
  - API key
  - account URL or explicit API base URL
  - optional business ID
  - explicit write enable flag
  - configurable user agent
- live adapter read support for:
  - practitioners
  - appointment types
  - available times
- safe booking behavior:
  - when writes are disabled, booking requests return a real live preview payload only
  - when writes are enabled, the adapter is prepared to create a patient and an individual appointment
- Cliniko connection status endpoint:
  - `GET /demo/cliniko-status`
- frontend status panel showing whether Cliniko is configured and whether writes are enabled

Why this changed:

- Gemini is now real enough that the next bottleneck is the scheduling system boundary
- we need a believable live-path adapter without making accidental writes the default

Verification:

- backend compile pass succeeded
- frontend production build succeeded
- route import verification now includes `/demo/cliniko-status`
- local unit-style execution passed for:
  - base URL derivation from a Cliniko account URL
  - preview-only booking mode with writes disabled
  - create mode flow with writes enabled

Still incomplete:

- no real Cliniko credentials were exercised yet from this environment
- patient matching/deduplication is still naive and would need tightening before production writes
- reschedule/cancel/live callback actions are not yet implemented against the real Cliniko API

POC scoping note:

- real Cliniko account testing is intentionally deferred for this POC phase
- the current plan is to keep Cliniko in stub / preview-safe mode for demo validation, workflow proof, and prospect testing
- live Cliniko verification can happen later once the voice/demo experience is consistently strong enough to justify integration risk

## Current Files That Matter Most

### Core Backend

- [apps/api/app/main.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/main.py)
- [apps/api/app/core/config.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/core/config.py)
- [apps/api/app/core/store.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/core/store.py)
- [apps/api/app/api/websocket/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/media.py)
- [apps/api/app/domain/voice/session.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/voice/session.py)
- [apps/api/app/domain/voice/audio.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/domain/voice/audio.py)
- [apps/api/app/integrations/gemini/adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/adapter.py)
- [apps/api/app/integrations/twilio/media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/twilio/media.py)
- [apps/api/app/integrations/cliniko/stub.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/cliniko/stub.py)

### Core Frontend

- [apps/ops/src/routes/App.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/routes/App.tsx)
- [apps/ops/src/features/setup/DemoWorkbench.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/setup/DemoWorkbench.tsx)
- [apps/ops/src/lib/api.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/lib/api.ts)
- [apps/ops/src/styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)

### Verification Helpers

- [scripts/debug-media-session.mjs](/Users/treemacair/Documents/Call%20Agents/scripts/debug-media-session.mjs)
- [apps/api/tests/test_twilio_media.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_twilio_media.py)
- [apps/api/tests/test_voice_audio.py](/Users/treemacair/Documents/Call%20Agents/apps/api/tests/test_voice_audio.py)

## What Is Real Versus Stubbed

### Real Enough For Local Demo

- frontend setup/demo workbench
- backend demo endpoints
- persistent local demo/session store
- Twilio-style websocket media event handling
- outbound telephony frame generation and return
- scripted debug media session
- real Gemini Live transport and audio return path
- Twilio readiness and stream-status surfaces
- Cliniko live adapter scaffold with preview-safe mode

### Still Stubbed

- real Cliniko account verification
- real Cliniko writes
- DB-backed persistence
- real Twilio phone-number routing and live PSTN verification

## Verification Checklist

These checks have been run successfully during implementation:

- `PYTHONPYCACHEPREFIX=/tmp/veriti-pyc apps/api/.venv/bin/python -m compileall apps/api/app apps/api/tests`
- `npm run build:ops`
- local API import from repo venv
- demo endpoint `curl` requests
- `npm run debug:media`
- real Gemini Live probe and debug media verification

## Current Local Runtime Instructions

### Backend

```bash
cd "/Users/treemacair/Documents/Call Agents/apps/api"
python3 -m venv .venv
.venv/bin/pip install "/Users/treemacair/Documents/Call Agents/apps/api"
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd "/Users/treemacair/Documents/Call Agents"
npm install
npm run dev:ops
```

### Scripted Realtime Check

With the API running:

```bash
cd "/Users/treemacair/Documents/Call Agents"
npm run debug:media
```

## Next Recommended Steps

### Highest Priority

1. Attach a real Twilio number to a public HTTPS `/twilio/voice` endpoint and run live PSTN verification.
2. Move persistence from local JSON to a proper relational store.
3. Tune live Gemini prompt, turn length, and interruption behavior for prospect demos.

### Product/Demo Priority

1. Replace the remaining raw debug/session text with a more polished prospect-demo view.
2. Add richer post-call actions such as late arrival and callback records with explicit staff workflow status.
3. Exercise the live Cliniko adapter against a real account in preview-only mode when the voice demo is consistently strong enough to justify the integration risk.

## Documentation Rule Going Forward

As implementation continues:

- update this file after every meaningful milestone
- note verification steps actually run
- clearly label stubs versus production-ready paths
- add links to any new scripts, docs, or core files here

## 2026-03-29: Call Lab Response Loop Fix

### What Changed

- Fixed the browser-native Call Lab backend so it no longer floods endless idle `turn_complete` events from the Gemini stub path.
- Fixed the stub voice session so text turns now generate assistant audio as well as transcript output.
- Fixed the stub voice session so microphone turns accumulate until `audio_commit`, then produce one coherent assistant response with one outbound audio payload.
- Fixed the Call Lab websocket route cleanup import so stop/disconnect handling does not trip on a missing `contextlib`.
- Fixed the Call Lab UX so choosing `Hands-free` during a live call now actually opens the microphone instead of only changing the chip state.
- Fixed a stale-state bug in the Call Lab recorder so hands-free now really runs in hands-free mode under the hood instead of opening the mic with push-to-talk semantics.
- Added a local ignored `.env` for development so the API can actually load the supplied Gemini key, and forced `GEMINI_LIVE_TRANSPORT=live` for clearer Call Lab testing.
- Added a Call Lab timeline hint that shows whether the assistant transport is `live` or `stub` right after session bootstrap.
- Fixed the backend settings loader so it can read the repo-root `.env` even when `uvicorn` is launched from [apps/api](/Users/treemacair/Documents/Call%20Agents/apps/api).
- Updated backend settings parsing to ignore frontend-only env keys such as `VITE_API_BASE_URL`, which was blocking shared `.env` loading during verification.
- Replaced the generic stub clinic world with seeded Tensegrity-inspired practitioners and locations so the POC can sound more realistic while staying internally consistent.
- Updated the voice prompt context to bias Gemini toward the seeded practitioner and location names during booking conversations.
- Updated booking outcome generation so the stored stub payload reflects the named practitioner/location inferred from the actual conversation instead of always falling back to generic demo IDs.
- Upgraded the `cancel_and_reschedule` outcome path so it can now persist both a cancellation artifact and a reschedule artifact, with the outcome summary rewritten to reflect the rebooked slot inferred from the call transcript.
- Updated the Call Lab probe script to match the current open-ended Call Lab URL and to summarize audio payloads instead of dumping giant blobs.

### Files

- [call_lab.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/api/websocket/call_lab.py)
- [adapter.py](/Users/treemacair/Documents/Call%20Agents/apps/api/app/integrations/gemini/adapter.py)
- [probe-call-lab.mjs](/Users/treemacair/Documents/Call%20Agents/scripts/probe-call-lab.mjs)
- [CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [README.md](/Users/treemacair/Documents/Call%20Agents/README.md)

### Why It Mattered

- The user could grant microphone access, but the Call Lab was still not reliably answering back.
- In stub mode, that was caused by two issues:
  - the event pump was being spammed by fake idle completions
  - typed turns did not emit any assistant audio at all
- That made the UI look connected while still feeling silent or broken.

### Verification Run

```bash
PYTHONPYCACHEPREFIX=/tmp/veriti-pycache python3 -m compileall \
  "apps/api/app/api/websocket/call_lab.py" \
  "apps/api/app/integrations/gemini/adapter.py"
```

```bash
VERITI_DEBUG_API_BASE_URL=ws://127.0.0.1:8001 npm run probe:call-lab
```

Observed results:

- `session_bootstrapped`
- `call_started`
- caller transcript event
- assistant transcript event
- outbound assistant `audio_chunk`
- `turn_complete`

### Note For Manual Testing

- If the API server was already running before this fix, restart it before re-testing in the browser.
- Without a restart, the browser Call Lab can still be talking to the old in-memory backend code.

## 2026-03-29: Testing UI UX Audit And Reorganization

### What Changed

- Audited the internal testing UI and identified the main structural problem: too many equal-priority panels competing with the Call Lab.
- Reworked the top-level app layout so the page now follows a clearer hierarchy:
  - hero
  - call experience
  - front-desk queue
  - ops studio
- Rebuilt the hero section to explain the three jobs of the page instead of dropping the user straight into a mixed tool surface.
- Repositioned the queue into a dedicated right-hand triage column beside the Call Lab.
- Redesigned the queue to feel more like a clinic inbox, with summary counts, clearer workflow chips, and card-based items.
- Reframed the lower tooling as `Clinic Ops Studio` so setup, payload previews, quick simulations, and debug tools feel intentionally secondary.
- Added a written UX audit so the information architecture and design rationale are documented for future iterations.

### Files

- [App.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/routes/App.tsx)
- [CallsPriorityCard.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calls/CallsPriorityCard.tsx)
- [DemoWorkbench.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/setup/DemoWorkbench.tsx)
- [styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)
- [testing-ui-ux-audit.md](/Users/treemacair/Documents/Call%20Agents/docs/testing-ui-ux-audit.md)

### Why It Mattered

- The testing page had enough functionality, but not enough hierarchy.
- That made the POC look messier and less trustworthy than the underlying product deserved.
- The redesign keeps the phone interaction as the hero and pushes ops/debug surfaces into the right supporting roles.

### Verification Run

```bash
npm run build:ops
```

```bash
PYTHONPYCACHEPREFIX=/tmp/veriti-pycache apps/api/.venv/bin/python -m compileall apps/api/app
```

## 2026-03-29: Call Lab Interruption Handling Fix

### What Changed

- Investigated why the assistant kept talking when the caller started speaking over it in hands-free mode.
- Fixed the hands-free recorder loop so it no longer ignores caller speech while the assistant is in `responding`.
- Added client-side barge-in detection that now requests an interruption as soon as the caller starts speaking over the assistant.
- Updated the browser playback layer so `clear_playback` actually stops already scheduled audio nodes instead of only resetting an internal cursor.
- Added light suppression of stale assistant audio during interruption windows so old chunks are less likely to leak through after the caller cuts in.
- Extended typed caller turns so they also interrupt the assistant if they are sent mid-response.

### Files

- [CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)

### Why It Mattered

- The previous behavior felt unnatural because the POC did not really support barge-in in hands-free mode.
- The browser was still recording, but the logic intentionally stopped processing caller audio while the assistant was speaking.
- Even when playback was “cleared”, already scheduled audio buffers could keep playing, which made interruption feel ignored.

### Verification Run

```bash
npm run build:ops
```

```bash
PYTHONPYCACHEPREFIX=/tmp/veriti-pycache apps/api/.venv/bin/python -m compileall apps/api/app
```

## 2026-03-29: Call Lab UI Simplification And Hands-free Default

### What Changed

- Reworked the Call Lab to feel less like a control panel and more like a premium internal softphone.
- Made `hands-free` the default talk mode so the main testing path matches how people naturally speak on calls.
- Removed the extra mode clutter from the top of the Call Lab and replaced it with compact status chips.
- Tightened the copy throughout the testing surface so it reads more naturally, with less instructional noise.
- Simplified the phone UI labels and reduced the amount of text inside the handset itself.
- Reshaped the outcome panel so it shows a cleaner summary and key facts instead of dumping raw JSON first.
- Tightened spacing and responsive layout rules to reduce overlap risk in the phone area, side panels, and action dock.
- Shortened surrounding page copy in the hero, queue, and ops studio so the whole testing page feels more focused.

### Files

- [CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)
- [App.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/routes/App.tsx)
- [CallsPriorityCard.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calls/CallsPriorityCard.tsx)
- [DemoWorkbench.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/setup/DemoWorkbench.tsx)

### Why It Mattered

- The previous page had too much text and too many equally loud controls for a realistic call-testing experience.
- That made the POC feel messier and less human than the actual product direction.
- Moving to hands-free by default and cutting back the UI noise makes the testing flow closer to a real clinic call.

### Verification Run

```bash
npm run build:ops
```

```bash
PYTHONPYCACHEPREFIX=/tmp/veriti-pycache apps/api/.venv/bin/python -m compileall apps/api/app
```

## 2026-03-29: Call Lab Layout Containment And Tabbed Review

### What Changed

- Reworked the Call Lab again after visual review showed the phone was overrunning nearby panels and the right-hand review area had become too tall.
- Replaced the nested two-column phone-plus-console layout with a single stacked call surface on the left.
- Contained the handset to a more realistic width and aspect ratio so it no longer dominates the whole page height.
- Converted the right-hand review area into a single tabbed panel with:
  - outcome
  - transcript
  - events
- Reduced the need to scroll through multiple stacked cards just to reach the next type of information.
- Kept hands-free as the default while aligning the internal ref state so the behaviour now matches the visible UI.

### Files

- [CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)

### Why It Mattered

- The earlier redesign improved copy and hierarchy, but still asked one screen to hold too many simultaneous sub-layouts.
- That caused overlap pressure around the phone and turned the review column into a long, awkward scroll.
- The tabbed review model is simpler and gives the phone room to feel intentional again.

### Verification Run

```bash
npm run build:ops
```

```bash
PYTHONPYCACHEPREFIX=/tmp/veriti-pycache apps/api/.venv/bin/python -m compileall apps/api/app
```

## 2026-03-31: Call Lab Start Failure Visibility And Reset Recovery

### What Changed

- Tightened the Call Lab startup flow so failures are visible near the phone instead of only down in the caller tools panel.
- Added an inline error banner directly under the handset for failed connect or microphone startup paths.
- Made the `End` control behave as a true reset during half-started calls, including when the websocket never fully opens.
- Added more defensive frontend diagnostics:
  - console logging for startup failures
  - timeline entries for failed start attempts
  - websocket close handling while the call is still in `connecting`

### Files

- [use-call-session.ts](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/use-call-session.ts)
- [PhoneSimulator.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/PhoneSimulator.tsx)
- [CallLab.tsx](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/features/calllab/CallLab.tsx)
- [styles.css](/Users/treemacair/Documents/Call%20Agents/apps/ops/src/styles.css)

### Why It Mattered

- On the deployed app, `Start` could appear to do nothing even when the app had already failed and moved into an error state.
- The microphone permission check can briefly light up the mic indicator and then stop, which is normal for permission priming, but it looked like a broken call because the real error was hidden below the fold.
- The `End` button also felt broken when startup failed before the websocket was ready, because it only worked when a live socket already existed.

### Verification Run

```bash
npm run build:ops
```

```bash
PYTHONPYCACHEPREFIX=/tmp/veriti-pycache apps/api/.venv/bin/python -m compileall apps/api/app
```
