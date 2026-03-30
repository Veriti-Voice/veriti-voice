import type { CallStage, TranscriptSpeaker } from './types';
import type { StubPayloadRecord } from '@/lib/api';

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatStageLabel(stage: CallStage) {
  switch (stage) {
    case 'idle':
      return 'Ready';
    case 'connecting':
      return 'Connecting';
    case 'live':
      return 'Live';
    case 'responding':
      return 'Replying';
    case 'ended':
      return 'Ended';
    case 'error':
      return 'Error';
    default:
      return stage;
  }
}

export function stageToneClass(stage: CallStage) {
  if (stage === 'error') {
    return 'priority-high';
  }
  if (stage === 'connecting' || stage === 'responding') {
    return 'priority-medium';
  }
  return 'priority-low';
}

export function humaniseSpeaker(speaker: TranscriptSpeaker) {
  if (speaker === 'assistant') {
    return 'Agent';
  }
  if (speaker === 'caller') {
    return 'Caller';
  }
  return 'System';
}

export function humaniseIntent(value: string) {
  if (!value) {
    return 'Not captured';
  }
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function humaniseState(value: string) {
  if (!value) {
    return 'Unknown';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildPayloadSummary(payload: StubPayloadRecord) {
  const details = payload.payload ?? {};
  const parts = [
    details.patient_name,
    details.practitioner_name,
    details.location_name,
    details.starts_at,
  ].filter(Boolean);

  if (parts.length) {
    return parts.join(' · ');
  }

  return `${humaniseIntent(payload.action)} prepared.`;
}
