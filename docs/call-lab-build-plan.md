# Call Lab Build Plan

Last updated: 2026-03-29
Project: Veriti Voice Overflow

## Goal

Build an internal testing surface that feels like a premium voice product, not a developer harness.

The Call Lab should let us:

- simulate a real call experience from a laptop
- hear the assistant voice in a realistic loop
- test open-ended caller requests and conversational quality quickly
- inspect transcripts and outcomes without leaving the page
- improve the POC before spending real Twilio minutes on prospect calls

## What We Are Challenging

The obvious idea is a plain browser softphone.

That is not enough on its own.

A basic softphone answers:

- can the browser talk to the backend?

It does not fully answer:

- does this feel impressive?
- does it survive phone-style constraints?
- does the post-call workflow look believable?

So the better product is a small internal `Call Lab`, not just a microphone test page.

## Options Considered

### Option A: Browser Phone Mode Through Our Existing Backend

Description:

- browser connects to `/ws/media`
- browser simulates a call session against the Twilio-shaped media path
- returned assistant audio is played through the laptop speakers

Pros:

- validates the actual product path we are building
- exercises call session creation, transcripts, and backend voice orchestration
- best no-Twilio approximation of production behavior

Cons:

- phone-style audio path is less magical than a direct high-fidelity browser voice mode
- microphone capture and codec conversion add implementation complexity

### Option B: Direct Browser Studio Mode Against Gemini Live

Description:

- browser streams directly to Gemini Live for the fastest, most natural internal conversation loop

Pros:

- likely the best conversational feel
- lowest latency for internal tuning
- excellent for prompt and voice iteration

Cons:

- bypasses some of our actual product backend
- weaker validation of the Twilio-shaped production path

### Option C: Twilio Browser Calling

Description:

- use Twilio browser voice tooling to make browser calls into our stack

Pros:

- close to true phone semantics

Cons:

- adds telephony setup overhead
- not the best internal-first or low-cost path
- less useful before the call UX itself is already strong

## Recommendation

Build a dual-mode `Call Lab`.

### Track 1: Phone Mode

This is the first build priority.

It should:

- run through our internal browser-native backend path
- look and feel like a premium call UI
- support realistic open-ended call testing
- play assistant voice through laptop speakers
- show transcripts and session state in real time

### Track 2: Studio Mode

This is the second build priority.

It should:

- optimize for fastest, most natural internal conversation testing
- potentially use direct browser streaming if that gives a meaningfully better tuning loop

## Phased Build

### Phase 1: Premium Phone Mode Simulator

Build now.

Scope:

- polished in-browser call UI
- start / end call controls
- optional example prompt chips
- live transcript
- assistant voice playback
- text-turn simulation for caller utterances
- call status and event timeline

Reason:

- fastest path to a useful and impressive internal tester
- lowest implementation risk because it reuses the current backend websocket path

### Phase 2: Browser Microphone Input

Build next.

Scope:

- push-to-talk or live mic streaming
- browser PCM capture and conversion into the Twilio-shaped audio path
- local speaker playback improvements

Reason:

- upgrades the simulator from "call-like" to genuinely voice-first

### Phase 3: Studio Mode

Build after Phone Mode is proving useful.

Scope:

- highest-fidelity conversation mode
- optional direct Gemini Live browser path
- side-by-side comparison with Phone Mode

Reason:

- best possible internal voice tuning loop
- useful once we want to optimize experience, not just validate the product path

## Phase 1 UX Shape

### Main Surface

- large in-call panel
- current mode badge
- clinic line label
- call timer
- ringing / connected / listening / responding states

### Interaction Surface

- optional example prompt chips
- caller message composer
- end call button

### Review Surface

- live transcript
- backend event timeline
- call notes about what this would mean operationally

### Design Direction

- should look like an intentional internal product
- warm, premium, voice-product feel
- not a generic developer dashboard

## Phase 1 Technical Approach

- use a dedicated browser-native `/ws/call-lab` route
- stream browser audio and text turns directly to the internal voice session
- play returned provider audio in the browser through Web Audio
- infer likely operational aftermath from the actual conversation rather than a preselected scenario

## Success Criteria For Phase 1

- an internal tester can start a call from the browser
- the assistant responds with real audio through speakers
- the tester can send multiple caller turns during one session
- the transcript feels like a real conversation log
- the page is attractive enough to use as part of internal demos

## What We Are Explicitly Not Solving In Phase 1

- true PSTN validation
- real phone-number routing
- full microphone streaming
- production call analytics
- direct Cliniko writes

## Current State Note

The Call Lab has now moved beyond the original Phase 1 sketch:

- it uses `/ws/call-lab` instead of piggybacking on `/ws/media`
- the tester does not need to choose a scenario before calling
- push-to-talk and hands-free browser mic modes both exist
- call aftermath is inferred from what the caller actually says

## Immediate Build Decision

Start with `Phone Mode` first.

Reason:

- it keeps the build anchored to the real product path
- it is the strongest internal testing surface we can ship quickly without telephony spend
