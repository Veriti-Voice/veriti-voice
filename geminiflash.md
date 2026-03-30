# Gemini 3.1 Flash Live Reference Guide

Last reviewed: 2026-03-28  
Primary focus: `gemini-3.1-flash-live-preview`

## Purpose

This file is a working reference for Gemini 3.1 Flash Live and the Gemini Live API based on the Google sources listed at the end of this document. It is written to be practical for future implementation work, not just as a feature summary.

## Executive Summary

Gemini 3.1 Flash Live is Google's preview real-time audio model for low-latency voice interactions. It is exposed through the Gemini Live API over WebSockets and supports audio, text, and image/video-frame input with audio output. It is positioned as Google's highest-quality live audio model as of March 26, 2026, with stronger task execution, better tonal understanding, lower latency, and more natural conversation flow than the prior live model family.

For implementation work, the most important operational facts are:

- Model name: `gemini-3.1-flash-live-preview`
- API shape: stateful WebSocket session
- Best transport choices:
  - Server-to-server: GenAI SDK or raw WebSockets
  - Client-to-server: raw WebSockets with ephemeral tokens
- Input types: text, audio, image frames / video frames
- Output type: audio only for native audio models
- If you need text output, enable output transcription
- Tool use is supported, but Gemini 3.1 Flash Live supports synchronous function calling only
- Some Live API features described in the docs are generic and do not apply to 3.1 Flash Live yet

## What Google Says Changed in 3.1 Flash Live

From Google's March 26, 2026 launch post:

- Lower latency and more natural turn-taking
- Improved tonal understanding, including pitch and pace
- Better reliability for voice agents doing complex tasks
- Stronger results on audio-oriented reasoning and tool-use benchmarks
- Audio outputs are watermarked with SynthID

Google specifically highlighted:

- `90.8%` on ComplexFuncBench Audio
- `36.1%` on Scale AI's Audio MultiChallenge with thinking enabled
- Availability for developers via Gemini Live API in Google AI Studio
- Availability for enterprise CX use cases
- Use across Gemini Live and Search Live

## Core Mental Model

The Live API is a persistent bidirectional WebSocket session with the model.

You typically:

1. Open a WebSocket session.
2. Send an initial setup/config message.
3. Stream user input as text, audio chunks, or image/video frames.
4. Receive server events containing audio, transcriptions, interruption signals, and tool calls.
5. Execute tools yourself when requested and send tool responses back into the same session.

Important mental model distinction:

- `send_realtime_input` / `sendRealtimeInput` is for live interaction during the session.
- `send_client_content` / `sendClientContent` is more restricted on Gemini 3.1 Flash Live than on Gemini 2.5 Flash Live.

## Recommended Implementation Paths

### 1. Server-to-server with the Google GenAI SDK

Best when:

- you already have a backend
- you want simpler connection management
- you want Google SDK abstractions instead of manual JSON message handling

Notes:

- Python and JavaScript examples are provided in the docs
- the SDK still uses WebSockets under the hood
- JavaScript SDK usage relies on connection callbacks such as `onopen`, `onmessage`, `onerror`, and `onclose`

### 2. Raw WebSockets

Best when:

- you want full control over the protocol
- you are building a thin client integration
- you need direct browser or frontend connectivity

Notes:

- API key connection example uses the `v1beta` WebSocket endpoint
- ephemeral-token client connections use a `v1alpha` constrained endpoint
- the first message must be the setup/config message

### 3. Direct client-to-server

Google notes this can reduce latency because the client streams directly to the Live API instead of proxying media through your backend. For production, Google recommends ephemeral tokens rather than exposing standard API keys in the client.

## Authentication and Endpoints

### Standard API key WebSocket endpoint

```text
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=YOUR_API_KEY
```

### Ephemeral token WebSocket endpoint

```text
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token={short-lived-token}
```

Important:

- The ephemeral-token flow is the safer choice for direct frontend/client streaming.
- The first WebSocket message must contain the setup/config payload.

## Technical Specifications

| Category | Value |
| --- | --- |
| Protocol | Stateful WebSocket (`WSS`) |
| Input modalities | Audio, text, images |
| Audio input format | Raw 16-bit PCM, little-endian |
| Native audio input rate | 16kHz |
| Audio output format | Raw 16-bit PCM, little-endian |
| Audio output rate | 24kHz |
| Video input approach | Send frames as images |
| Image/video frame cadence | Up to 1 frame per second |
| Typical image formats | JPEG, PNG |

Implementation note:

- The docs say the API will resample input audio if needed, but Google's best-practices guide still recommends resampling microphone audio to `16kHz` on the client before sending it.

## Minimal Session Configuration Shape

### JavaScript SDK sketch

```js
import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const session = await ai.live.connect({
  model: 'gemini-3.1-flash-live-preview',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: {
      parts: [{ text: 'You are a concise, helpful voice assistant.' }],
    },
    outputAudioTranscription: {},
  },
  callbacks: {
    onmessage: (message) => {
      // handle audio, transcripts, interruptions, tool calls
    },
  },
});
```

### Raw WebSocket setup sketch

```json
{
  "config": {
    "model": "models/gemini-3.1-flash-live-preview",
    "responseModalities": ["AUDIO"],
    "systemInstruction": {
      "parts": [
        { "text": "You are a concise, helpful voice assistant." }
      ]
    }
  }
}
```

## Input and Output Modalities

### Audio input

- Send raw PCM bytes
- MIME type should describe the input sample rate, for example:
  - `audio/pcm;rate=16000`

### Audio output

- Returned as audio chunks in server messages
- Output is `24kHz` PCM
- Your client should be ready to consume partial audio chunks continuously

### Text input

- Supported through `send_realtime_input` / `sendRealtimeInput`
- This is the right path for short text updates during an active live session

### Video / image input

- Video is represented as individual image frames
- Max documented cadence: `1 FPS`
- Example formats: JPEG or PNG

### Transcriptions

The API can expose:

- input transcription: what the user said
- output transcription: what Gemini said

Practical rule:

- Native audio output models only support audio response modality
- if your product UI also needs text, enable output transcription

## Gemini 3.1 Flash Live Specific Behavior

This is the most important section for avoiding implementation mistakes.

| Area | Gemini 3.1 Flash Live behavior |
| --- | --- |
| Model ID | `gemini-3.1-flash-live-preview` |
| Status | Preview |
| Thinking control | Uses `thinkingLevel` |
| Thinking default | `minimal` for lowest latency |
| Response event shape | A single server event can contain multiple content parts at once |
| `send_client_content` | Only for seeding initial context history when configured; not for general mid-conversation text updates |
| Text updates during live session | Use `send_realtime_input` |
| Turn coverage default | `TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO` |
| Function calling | Supported, synchronous only |
| Async function calling | Not yet supported |
| Google Search grounding | Supported |
| Google Maps tool | Not supported |
| Code execution tool | Not supported |
| URL context tool | Not supported |
| Affective dialog | Not supported |
| Proactive audio | Not supported |

Practical implications:

- Your event handler must iterate through all parts in a server event instead of assuming one payload per event.
- Do not design a 3.1 Flash Live app around async tool execution unless Google updates support later.
- Do not rely on affective dialog or proactive audio even though they appear in generic Live API feature documentation.

## Thinking

Gemini 3.1 Flash Live uses `thinkingLevel` rather than `thinkingBudget`.

Documented levels:

- `minimal`
- `low`
- `medium`
- `high`

Default:

- `minimal`, explicitly to optimize for lowest latency

Practical advice:

- start with `minimal` or `low` for voice-first UX
- increase only if task complexity clearly benefits from deeper reasoning
- remember that higher thinking depth generally trades off against responsiveness

## Voice, Language, and Native Audio

The Live API docs describe Gemini 3.1 Flash Live under the native audio output model family.

Important consequences:

- response modality is audio-only
- voices can be selected through `speechConfig`
- native audio models can switch languages naturally during conversation
- if you want to constrain language behavior, specify it in system instructions

Voice example shape:

```js
speechConfig: {
  voiceConfig: {
    prebuiltVoiceConfig: {
      voiceName: 'Kore',
    },
  },
}
```

## Language Support

There is a documentation inconsistency worth preserving here:

- the Live API overview page says Live API supports `70` languages
- the capabilities page says Live API supports `97` languages and includes a full language list

Inference:

- the `97-language` figure is likely the current one because it appears on the more detailed capabilities page, which was updated later on `2026-03-26`, while the overview page was updated on `2026-03-25`

Still, if language coverage matters for production work, re-check the live docs before launch.

## Tool Use

### Supported on Gemini 3.1 Flash Live

- Google Search grounding
- synchronous function calling

### Not supported on Gemini 3.1 Flash Live

- asynchronous function calling
- Google Maps
- code execution
- URL context

### Implementation rule

Live API tool handling is manual.

Unlike some non-live generation flows, the client must:

1. receive the tool call
2. execute the function locally
3. send a `FunctionResponse` / tool response back into the session

### Function calling workflow

1. Define tool declarations in session config.
2. Listen for `toolCall` events.
3. Execute the requested tool locally.
4. Send back `functionResponses`.

### Google Search grounding

Google Search can be enabled in `tools` as part of session config to improve accuracy and reduce hallucinations during live conversation.

## Voice Activity Detection and Barge-In

VAD is central to the live conversational UX.

What it does:

- detects when the user starts speaking
- enables interruption of model speech
- cancels and discards ongoing generation when a user barges in

When an interruption happens:

- the server sets `interrupted: true`
- anything not yet delivered to the client is discarded
- pending function calls are also discarded

Required client behavior:

- immediately stop playback
- clear any queued model audio

If you do not do this, your app will keep speaking over the user even though the server has already canceled that turn.

### Automatic VAD tuning

The docs expose settings such as:

- start-of-speech sensitivity
- end-of-speech sensitivity
- prefix padding
- silence duration

### Manual VAD mode

Automatic VAD can be disabled. In that mode:

- the client must send `activityStart`
- the client streams audio
- the client sends `activityEnd`

Use this only if you need tight control over turn boundaries.

## Context Window and Session Limits

### Context window

The capabilities guide states:

- `128k` tokens for native audio output models
- `32k` tokens for other Live API models

### Session duration

The capabilities guide states:

- audio-only sessions are limited to `15 minutes`
- audio+video sessions are limited to `2 minutes`

The best-practices guide says you should use context window compression and session-management techniques to support effectively unlimited extensions for longer-running experiences.

## Session Management Guidance

Even though the dedicated session-management doc was not one of the requested sources, the linked pages include several important operational notes:

- enable context window compression for long sessions
- retain the latest session resumption token
- resumption tokens are valid for `2 hours` after the last session terminates
- handle `GoAway` messages before connection termination
- use `generationComplete` to know when a model response has finished

Practical build rule:

- treat Live API connections as renewable, not permanent

## Performance and Streaming Best Practices

Google's best-practices page recommends:

- send audio in chunks of `20ms` to `40ms`
- do not buffer large audio windows before sending
- keep buffering closer to `20ms` to `100ms`, not around `1 second`
- resample microphone input to `16kHz` before transmission
- clear client playback buffers immediately on interruption

These are easy-to-miss implementation details that materially affect latency and conversation quality.

## Prompting and System Instruction Best Practices

Google's Live API guidance strongly emphasizes system instructions.

Recommended structure:

1. Persona
2. Conversational rules
3. Tool-call flow instructions
4. Guardrails

Good practices called out by Google:

- make the persona explicit
- clearly state conversation loops versus one-time steps
- describe exactly when a tool should be called
- use separate sentences for workflow/tool steps
- keep prompts focused rather than overly long
- provide examples of desired and undesired behavior
- if you want the model to initiate the conversation, instruct it to greet first

Google also notes that if you need especially strong compliance, wording such as `unmistakably` can help increase precision.

## Common Gotchas

### 1. Assuming text responses are native

For native audio models, response modality is audio-only. If your UI needs text, enable transcriptions.

### 2. Assuming every server event contains one payload

Gemini 3.1 Flash Live can return multiple content parts in a single event. Your handler must process all parts.

### 3. Using `send_client_content` like a generic mid-conversation update API

On Gemini 3.1 Flash Live, that is not the intended path. Use realtime input for live updates.

### 4. Forgetting to clear audio playback on interruption

This is a classic voice-agent bug and Google explicitly calls it out.

### 5. Treating generic Live API features as 3.1 features

The docs cover multiple model families. For Gemini 3.1 Flash Live specifically:

- no affective dialog
- no proactive audio
- no async tool calling

### 6. Overlooking preview status

Everything here is still under preview documentation. Expect some surface details and support matrices to keep changing.

## Suggested Default Build Posture

If we build on this model later, the safest starting posture is:

- use `gemini-3.1-flash-live-preview`
- connect server-to-server first unless direct browser streaming is clearly needed
- if browser-direct, use ephemeral tokens
- set `responseModalities` to `AUDIO`
- enable `outputAudioTranscription`
- send microphone audio as `audio/pcm;rate=16000`
- stream small chunks around `20ms` to `40ms`
- implement interruption-safe playback clearing
- implement session resumption and reconnection handling
- use synchronous function calling only
- define tools with explicit invocation conditions
- keep system instructions crisp and workflow-oriented

## Quick Reference

| Topic | Key fact |
| --- | --- |
| Model | `gemini-3.1-flash-live-preview` |
| Status | Preview |
| Transport | WebSockets |
| Audio input | 16-bit PCM, little-endian, usually `16kHz` |
| Audio output | 16-bit PCM, little-endian, `24kHz` |
| Video input | image frames, max `1 FPS` |
| Response modality | audio only for native audio models |
| Text output option | use output transcription |
| Thinking control | `thinkingLevel` |
| Default thinking | `minimal` |
| Function calling | yes, synchronous |
| Google Search tool | yes |
| Async function calling | no |
| Affective dialog | no |
| Proactive audio | no |
| Audio-only session limit | `15 min` |
| Audio+video session limit | `2 min` |
| Native audio context window | `128k` tokens |

## Source Notes

All of the following were reviewed on 2026-03-28:

1. Google blog launch post:
   - https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-live/
2. Gemini Live API overview:
   - https://ai.google.dev/gemini-api/docs/live-api
3. GenAI SDK getting started:
   - https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk
4. Raw WebSocket getting started:
   - https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket
5. Capabilities guide:
   - https://ai.google.dev/gemini-api/docs/live-api/capabilities
6. Tool use guide:
   - https://ai.google.dev/gemini-api/docs/live-api/tools
7. Best practices guide:
   - https://ai.google.dev/gemini-api/docs/live-api/best-practices

Page recency observed during review:

- Live API overview: last updated `2026-03-25 UTC`
- SDK guide: last updated `2026-03-26 UTC`
- WebSocket guide: last updated `2026-03-26 UTC`
- Tools guide: last updated `2026-03-26 UTC`
- Capabilities and best-practices pages were also reviewed in their March 2026 state

## Maintenance Note

Because this is preview documentation, treat this file as a point-in-time guide. Before implementation work that depends on:

- feature availability
- tool support
- language support
- auth or endpoint behavior

re-check the current docs first.
