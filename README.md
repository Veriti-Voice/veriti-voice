# Veriti Voice Overflow

Monorepo scaffold for the Veriti Voice Overflow POC.

## Workspace Layout

- `apps/api`: FastAPI backend for realtime orchestration and integrations
- `apps/ops`: React/Vite ops and setup UI
- `packages/shared`: shared frontend types and constants
- `docs`: engineering notes and setup guides

## Key Docs

- [Call Lab Build Plan](./docs/call-lab-build-plan.md)
- [Implementation Log](./docs/implementation-log.md)
- [POC Readiness Checklist](./docs/poc-readiness-checklist.md)
- [Setup Contract](./docs/setup-contract.md)

## Current Status

This scaffold covers:

- monorepo structure
- environment contract
- FastAPI entrypoint
- Twilio webhook skeleton
- `VoiceSession` abstraction
- Gemini Live adapter stub
- call-state primitives
- demo workbench UI
- persistent local demo/session store
- Twilio-style media websocket path
- provider-audio conversion boundary for Gemini-style PCM in/out
- self-serve setup profile persistence
- demo action queue and allied-health scenario simulation
- setup-profile driven voice and simulation behavior
- Gemini Live websocket transport scaffold with `stub` / `auto` / `live` modes
- Cliniko live adapter scaffold with safe preview-only mode and explicit write guard

## Getting Started

### Backend

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

### Ops UI

```bash
npm install
npm run dev --workspace @veriti/ops
```

### Debug Media Session

With the API running locally:

```bash
npm run debug:media
```

This opens a debug WebSocket session against `/ws/media`, sends Twilio-style
`start`, `media`, and `stop` events, and prints the returned debug events.

### Call Lab Probe

With the API running locally:

```bash
npm run probe:call-lab
```

This exercises the browser-native `/ws/call-lab` route with a start event, a
caller text turn, and a clean stop, then prints the returned transcripts and
audio/event messages.

### Gemini Live Probe

To exercise the Gemini adapter directly:

```bash
GEMINI_API_KEY=your_key_here GEMINI_LIVE_TRANSPORT=live npm run probe:gemini
```

Useful variants:

```bash
GEMINI_LIVE_TRANSPORT=stub npm run probe:gemini
VERITI_GEMINI_PROBE_TEXT="Please greet the caller naturally." npm run probe:gemini
```

This uses the same `GeminiLiveVoiceSession` adapter as the app, sends a text
probe turn, and prints the resulting transcripts/audio events.

In real Gemini mode, the debug media verifier also supports a debug-text assist
path so `/ws/media` can be exercised deterministically even when the script only
sends tiny synthetic telephony chunks.

## Important Notes

- The backend now returns TwiML and health responses and also processes Twilio-style media websocket events through `/ws/media`.
- The backend now also exposes `/twilio/stream-status` plus `/demo/twilio-status`, so the demo can show whether the build is actually ready for a real phone-number test or still only locally debuggable.
- The backend now also exposes a browser-native `/ws/call-lab` route so the internal Call Lab can stream browser audio and text turns without faking the Twilio media protocol.
- The realtime media path now converts Twilio `mulaw/8kHz` edge audio into Gemini-style `PCM16/16kHz` input and converts provider-style `PCM16/24kHz` output back into Twilio frames.
- The Gemini provider now includes a real Live API websocket transport scaffold. `GEMINI_LIVE_TRANSPORT=stub` forces local stub mode, `auto` tries the live transport when an API key is present and falls back to stub, and `live` requires the real Gemini transport.
- The real Gemini Live path has now been validated end-to-end: direct probe mode works, and the `/ws/media` debug loop can return real Gemini transcripts plus Twilio-compatible outbound audio frames.
- The Cliniko side now has `stub` / `auto` / `live` support as well. Live mode can read real Cliniko data, but actual patient/appointment writes stay disabled unless `CLINIKO_WRITE_ENABLED=true`.
- The demo API now supports setup-profile persistence, simulated allied-health call scenarios, and a prioritized action queue for front-desk review.
- The action queue now supports workflow states (`new`, `reviewed`, `done`) so the demo can show actual post-call triage, not just passive sorting.
- The ops app now includes a premium-feeling `Call Lab` with an iPhone-style phone simulator, live transcript, assistant voice playback, push-to-talk and hands-free browser microphone turns, a browser-native realtime route with continuous audio chunk streaming, interruption-aware playback, and post-call outcome review inferred from the actual conversation.
- If you change the backend Call Lab or Gemini adapter code while testing, restart the API server before retrying the browser call. The Call Lab voice loop is backend-driven, so stale `uvicorn` state can make the UI look broken even when the code is fixed.
- The setup profile now changes stub voice behavior and simulated scenario outcomes, so toggles like bookings, routing, and late-arrival handling affect the demo logic instead of only affecting the UI.
- The Gemini adapter still falls back to stub synthesis by default in local dev unless live transport is explicitly available.
- The ops demo now exposes Cliniko connection status and Twilio live-call readiness so we can tell whether the product is ready for a real prospect phone test.
