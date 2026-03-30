const apiBaseUrl = process.env.VERITI_DEBUG_API_BASE_URL ?? 'ws://127.0.0.1:8000';
const debugText =
  process.env.VERITI_DEBUG_TEXT ??
  'Please greet the caller briefly and explain what this clinic assistant can help with.';
const callSid = `debug-script-${Date.now()}`;
const websocketUrl = `${apiBaseUrl}/ws/media?callSid=${encodeURIComponent(callSid)}&clinic=demo-clinic&debug=1&debugText=${encodeURIComponent(debugText)}`;

const dummyAudio = Buffer.alloc(160, 255).toString('base64');
const received = [];
let completed = false;
let ackReceived = false;
let stopTimer = null;

console.log(`Connecting to ${websocketUrl}`);

const socket = new WebSocket(websocketUrl);

socket.addEventListener('open', () => {
  console.log('WebSocket opened');
});

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(String(event.data));
  received.push(payload);
  if (payload.event === 'media' && payload.media?.payload) {
    console.log(
      JSON.stringify(
        {
          event: 'media',
          streamSid: payload.streamSid,
          payloadBytes: Buffer.from(payload.media.payload, 'base64').length,
        },
        null,
        2
      )
    );
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (payload.type === 'session_bootstrapped') {
    socket.send(
      JSON.stringify({
        event: 'start',
        streamSid: 'debug-stream-script',
        start: { streamSid: 'debug-stream-script' },
      })
    );
    socket.send(
      JSON.stringify({
        event: 'media',
        streamSid: 'debug-stream-script',
        media: { payload: dummyAudio },
      })
    );
  }

  if (payload.type === 'media_ack') {
    ackReceived = true;
    completed = true;
    socket.send(
      JSON.stringify({
        event: 'stop',
        streamSid: 'debug-stream-script',
        stop: { reason: 'script-finished' },
      })
    );
    stopTimer = setTimeout(() => {
      console.log(`Completed debug session with ${received.length} events`);
      socket.close();
    }, 1000);
  }

  if (payload.type === 'stream_stopped') {
    completed = true;
    if (stopTimer) {
      clearTimeout(stopTimer);
    }
    console.log(`Completed debug session with ${received.length} events`);
    socket.close();
  }
});

socket.addEventListener('error', (event) => {
  if (completed) {
    return;
  }
  console.error('WebSocket error', event);
  process.exitCode = 1;
});

socket.addEventListener('close', () => {
  if (stopTimer) {
    clearTimeout(stopTimer);
  }
  if (ackReceived && !process.exitCode) {
    console.log(`Completed debug session with ${received.length} events`);
  }
  console.log('WebSocket closed');
});
