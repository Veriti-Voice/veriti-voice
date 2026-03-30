const apiBaseUrl = process.env.VERITI_DEBUG_API_BASE_URL ?? 'ws://127.0.0.1:8000';
const callerName = process.env.VERITI_CALL_LAB_CALLER ?? 'Call Lab Tester';
const openingText =
  process.env.VERITI_CALL_LAB_TEXT ??
  'Hi, I need to book an appointment for lower back pain sometime this week.';
const callSid = `call-lab-probe-${Date.now()}`;
const websocketUrl =
  `${apiBaseUrl}/ws/call-lab?callSid=${encodeURIComponent(callSid)}` +
  `&clinic=demo-clinic` +
  `&callerName=${encodeURIComponent(callerName)}`;

console.log(`Connecting to ${websocketUrl}`);

const socket = new WebSocket(websocketUrl);
const received = [];
let closeTimer = null;
let stopSent = false;

socket.addEventListener('open', () => {
  console.log('Call Lab websocket opened');
});

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(String(event.data));
  received.push(payload);
  console.log(JSON.stringify(summarizePayload(payload), null, 2));

  if (payload.type === 'session_bootstrapped') {
    socket.send(JSON.stringify({ event: 'start' }));
    return;
  }

  if (payload.type === 'call_started') {
    socket.send(JSON.stringify({ event: 'text', text: openingText }));
    return;
  }

  if (payload.type === 'turn_complete' && !stopSent) {
    stopSent = true;
    socket.send(JSON.stringify({ event: 'stop' }));
    closeTimer = setTimeout(() => socket.close(), 2000);
    return;
  }

  if (payload.type === 'call_stopped') {
    if (closeTimer) {
      clearTimeout(closeTimer);
    }
    socket.close();
  }
});

socket.addEventListener('error', (event) => {
  console.error('Call Lab websocket error', event);
  process.exitCode = 1;
});

socket.addEventListener('close', () => {
  if (closeTimer) {
    clearTimeout(closeTimer);
  }
  console.log(`Call Lab probe completed with ${received.length} events`);
});

function summarizePayload(payload) {
  if (payload?.type === 'audio_chunk' && payload.audio?.payload) {
    return {
      ...payload,
      audio: {
        ...payload.audio,
        payload: `<${payload.audio.payload.length} base64 chars>`,
      },
    };
  }

  if (
    payload?.type === 'voice_event' &&
    payload.voiceEvent?.eventType === 'audio_chunk' &&
    payload.voiceEvent?.payload?.audio_bytes
  ) {
    return {
      ...payload,
      voiceEvent: {
        ...payload.voiceEvent,
        payload: {
          ...payload.voiceEvent.payload,
          audio_bytes: `<${payload.voiceEvent.payload.size_bytes ?? 'unknown'} bytes>`,
        },
      },
    };
  }

  return payload;
}
