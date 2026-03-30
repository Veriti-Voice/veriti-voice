import type { MutableRefObject } from 'react';

export async function getAudioContext(audioContextRef: MutableRefObject<AudioContext | null>) {
  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContext();
  }
  if (audioContextRef.current.state !== 'running') {
    await audioContextRef.current.resume();
  }
  return audioContextRef.current;
}

export function base64ToBytes(input: string) {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function bytesToBase64(input: Uint8Array) {
  let binary = '';
  for (let index = 0; index < input.length; index += 1) {
    binary += String.fromCharCode(input[index]);
  }
  return btoa(binary);
}

export function downsampleFloat32(input: Float32Array, inputRate: number, outputRate: number) {
  if (inputRate === outputRate) {
    return input;
  }

  const ratio = inputRate / outputRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  let offsetBuffer = 0;

  for (let index = 0; index < outputLength; index += 1) {
    const nextOffsetBuffer = Math.round((index + 1) * ratio);
    let accumulator = 0;
    let count = 0;

    for (
      let sampleIndex = offsetBuffer;
      sampleIndex < nextOffsetBuffer && sampleIndex < input.length;
      sampleIndex += 1
    ) {
      accumulator += input[sampleIndex];
      count += 1;
    }

    output[index] = count ? accumulator / count : 0;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}

export function float32ToPcm16Bytes(input: Float32Array) {
  const output = new Uint8Array(input.length * 2);
  const view = new DataView(output.buffer);
  for (let index = 0; index < input.length; index += 1) {
    const pcm = Math.max(-1, Math.min(1, input[index]));
    view.setInt16(index * 2, Math.round(pcm * 32767), true);
  }
  return output;
}

export function pcm16BytesToFloat32(input: Uint8Array) {
  const frameCount = Math.floor(input.length / 2);
  const output = new Float32Array(frameCount);
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  for (let index = 0; index < frameCount; index += 1) {
    output[index] = view.getInt16(index * 2, true) / 32768;
  }
  return output;
}

export function calculateRms(input: Float32Array) {
  let sum = 0;
  for (let index = 0; index < input.length; index += 1) {
    sum += input[index] * input[index];
  }
  return Math.min(1, Math.sqrt(sum / Math.max(1, input.length)) * 6);
}

export async function playPcm16Payload(
  payload: string,
  sampleRateHz: number,
  audioContextRef: MutableRefObject<AudioContext | null>,
  playbackCursorRef: MutableRefObject<number>,
  activePlaybackSourcesRef: MutableRefObject<Set<AudioBufferSourceNode>>
) {
  const context = await getAudioContext(audioContextRef);
  const rawBytes = base64ToBytes(payload);
  const pcm = pcm16BytesToFloat32(rawBytes);
  const buffer = context.createBuffer(1, pcm.length, sampleRateHz);
  buffer.copyToChannel(pcm, 0);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  activePlaybackSourcesRef.current.add(source);
  source.onended = () => {
    activePlaybackSourcesRef.current.delete(source);
  };

  const startAt = Math.max(context.currentTime + 0.02, playbackCursorRef.current);
  source.start(startAt);
  playbackCursorRef.current = startAt + buffer.duration;
}

export function clearScheduledPlayback(
  audioContextRef: MutableRefObject<AudioContext | null>,
  playbackCursorRef: MutableRefObject<number>,
  activePlaybackSourcesRef: MutableRefObject<Set<AudioBufferSourceNode>>
) {
  activePlaybackSourcesRef.current.forEach((source) => {
    try {
      source.stop();
    } catch {
      // Source may already have finished; safe to ignore.
    }
  });
  activePlaybackSourcesRef.current.clear();
  if (audioContextRef.current) {
    playbackCursorRef.current = audioContextRef.current.currentTime;
  }
}

export function cleanupRecorderResources(
  mediaStreamRef: MutableRefObject<MediaStream | null>,
  recorderContextRef: MutableRefObject<AudioContext | null>,
  recorderSourceRef: MutableRefObject<MediaStreamAudioSourceNode | null>,
  recorderProcessorRef: MutableRefObject<ScriptProcessorNode | null>,
  recorderMuteGainRef: MutableRefObject<GainNode | null>
) {
  if (recorderProcessorRef.current) {
    recorderProcessorRef.current.disconnect();
    recorderProcessorRef.current.onaudioprocess = null;
    recorderProcessorRef.current = null;
  }
  if (recorderSourceRef.current) {
    recorderSourceRef.current.disconnect();
    recorderSourceRef.current = null;
  }
  if (recorderMuteGainRef.current) {
    recorderMuteGainRef.current.disconnect();
    recorderMuteGainRef.current = null;
  }
  if (mediaStreamRef.current) {
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }
  if (recorderContextRef.current) {
    void recorderContextRef.current.close();
    recorderContextRef.current = null;
  }
}
