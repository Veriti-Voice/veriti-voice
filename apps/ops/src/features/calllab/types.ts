import type { ActionQueueItem, CallSessionRecord, SetupProfile, StubPayloadRecord } from '@/lib/api';

export type CallStage = 'idle' | 'connecting' | 'live' | 'responding' | 'ended' | 'error';
export type TalkMode = 'push' | 'handsfree';
export type MicPermissionState = 'unknown' | 'granted' | 'denied';
export type TranscriptSpeaker = 'assistant' | 'caller' | 'system';
export type AssistantTransport = 'waiting' | 'live' | 'stub';
export type ReviewTab = 'after' | 'transcript' | 'events';

export type TranscriptEntry = {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  at: string;
};

export type TimelineEntry = {
  id: string;
  label: string;
  tone: 'neutral' | 'warm' | 'alert';
  at: string;
};

export type Scenario = {
  id: string;
  label: string;
  subtitle: string;
  prompt: string;
};

export type CallLabProps = {
  onCallCompleted?: () => void;
};

export type CallSessionState = {
  stage: CallStage;
  talkMode: TalkMode;
  setupProfile: SetupProfile | null;
  transcript: TranscriptEntry[];
  timeline: TimelineEntry[];
  draftUtterance: string;
  callSid: string;
  error: string | null;
  callStartedAt: number | null;
  elapsedSeconds: number;
  speakerReady: boolean;
  isRecording: boolean;
  isUploadingAudio: boolean;
  micLevel: number;
  micPermission: MicPermissionState;
  handsfreeEnabled: boolean;
  assistantTransport: AssistantTransport;
  activeReviewTab: ReviewTab;
  lastSession: CallSessionRecord | null;
  lastQueueItems: ActionQueueItem[];
  lastPayload: StubPayloadRecord | null;
};

export type CallSessionActions = {
  handleStartCall: () => void;
  handleEndCall: () => void;
  handleMicPress: () => void;
  handleMicRelease: () => void;
  toggleHandsfree: () => void;
  handlePushModeSelected: () => void;
  handleHandsfreeModeSelected: () => void;
  sendUtterance: (text: string) => void;
  handleComposerSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setDraftUtterance: (value: string) => void;
  setActiveReviewTab: (tab: ReviewTab) => void;
};
