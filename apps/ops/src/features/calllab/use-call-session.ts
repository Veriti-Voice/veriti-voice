import { FormEvent, useEffect, useRef, useState } from 'react';

import { API_BASE_URL, demoApi } from '@/lib/api';
import type {
  CallStage,
  TalkMode,
  MicPermissionState,
  TranscriptSpeaker,
  AssistantTransport,
  ReviewTab,
  TranscriptEntry,
  TimelineEntry,
  CallSessionState,
  CallSessionActions,
} from './types';
import type { ActionQueueItem, CallSessionRecord, SetupProfile, StubPayloadRecord } from '@/lib/api';
import { initialStatusCopy } from './constants';
import { formatTime } from './format-utils';
import {
  getAudioContext,
  bytesToBase64,
  downsampleFloat32,
  float32ToPcm16Bytes,
  playPcm16Payload,
  clearScheduledPlayback,
  cleanupRecorderResources,
  calculateRms,
} from './audio-utils';

export function useCallSession(onCallCompleted?: () => void): CallSessionState & CallSessionActions & { statusCopy: string; clinicName: string; clinicLine: string } {
  const [stage, setStage] = useState<CallStage>('idle');
  const [talkMode, setTalkMode] = useState<TalkMode>('handsfree');
  const [setupProfile, setSetupProfile] = useState<SetupProfile | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [draftUtterance, setDraftUtterance] = useState('');
  const [callSid, setCallSid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [speakerReady, setSpeakerReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micPermission, setMicPermission] = useState<MicPermissionState>('unknown');
  const [handsfreeEnabled, setHandsfreeEnabled] = useState(false);
  const [assistantTransport, setAssistantTransport] = useState<AssistantTransport>('waiting');
  const [activeReviewTab, setActiveReviewTab] = useState<ReviewTab>('after');
  const [lastSession, setLastSession] = useState<CallSessionRecord | null>(null);
  const [lastQueueItems, setLastQueueItems] = useState<ActionQueueItem[]>([]);
  const [lastPayload, setLastPayload] = useState<StubPayloadRecord | null>(null);

  // All refs must remain in the same hook scope — the audio processing callback reads them synchronously.
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackCursorRef = useRef(0);
  const activePlaybackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamSidRef = useRef('veriti-call-lab-stream');
  const primedRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderContextRef = useRef<AudioContext | null>(null);
  const recorderSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recorderProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recorderMuteGainRef = useRef<GainNode | null>(null);
  const autoSpeakingRef = useRef(false);
  const silenceFramesRef = useRef(0);
  const recordedSampleCountRef = useRef(0);
  const stageRef = useRef<CallStage>('idle');
  const talkModeRef = useRef<TalkMode>('handsfree');
  const handsfreeEnabledRef = useRef(false);
  const isUploadingAudioRef = useRef(false);
  const interruptionRequestedRef = useRef(false);
  const suppressAssistantAudioRef = useRef(false);

  // --- Effects ---

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const profile = await demoApi.getSetupProfile();
        if (!cancelled) setSetupProfile(profile);
      } catch {
        if (!cancelled) setSetupProfile(null);
      }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!callStartedAt || (stage !== 'live' && stage !== 'responding')) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));
    }, 1000);
    return () => { window.clearInterval(timer); };
  }, [callStartedAt, stage]);

  useEffect(() => {
    return () => {
      if (websocketRef.current) websocketRef.current.close();
      if (audioContextRef.current) void audioContextRef.current.close();
      cleanupRecorderResources(mediaStreamRef, recorderContextRef, recorderSourceRef, recorderProcessorRef, recorderMuteGainRef);
    };
  }, []);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { talkModeRef.current = talkMode; }, [talkMode]);
  useEffect(() => { handsfreeEnabledRef.current = handsfreeEnabled; }, [handsfreeEnabled]);
  useEffect(() => { isUploadingAudioRef.current = isUploadingAudio; }, [isUploadingAudio]);

  // --- Derived ---

  const statusCopy = isRecording
    ? talkMode === 'handsfree'
      ? 'Listening hands-free. Just speak normally.'
      : 'Listening. Let go to send.'
    : isUploadingAudio
      ? 'Sending your turn.'
      : initialStatusCopy[stage];
  const clinicName = setupProfile?.clinic_name ?? 'Harbour Physio';
  const clinicLine = setupProfile?.fallback_number ?? '+61 clinic line';

  // --- Helpers ---

  function appendTranscript(speaker: TranscriptSpeaker, text: string) {
    if (!text.trim()) return;
    setTranscript((current) => [
      ...current,
      { id: `${speaker}-${Date.now()}-${current.length}`, speaker, text, at: formatTime(new Date()) },
    ]);
  }

  function appendTimeline(label: string, tone: TimelineEntry['tone']) {
    setTimeline((current) => [
      { id: `${Date.now()}-${current.length}`, label, tone, at: formatTime(new Date()) },
      ...current,
    ]);
  }

  function resetCallState(nextStage: CallStage = 'ended') {
    if (websocketRef.current) {
      try {
        websocketRef.current.close();
      } catch {
        // noop
      }
      websocketRef.current = null;
    }
    clearScheduledPlayback(audioContextRef, playbackCursorRef, activePlaybackSourcesRef);
    cleanupRecorderResources(mediaStreamRef, recorderContextRef, recorderSourceRef, recorderProcessorRef, recorderMuteGainRef);
    setIsRecording(false);
    setIsUploadingAudio(false);
    setMicLevel(0);
    setHandsfreeEnabled(false);
    setSpeakerReady(false);
    setAssistantTransport('waiting');
    interruptionRequestedRef.current = false;
    suppressAssistantAudioRef.current = false;
    primedRef.current = false;
    autoSpeakingRef.current = false;
    silenceFramesRef.current = 0;
    recordedSampleCountRef.current = 0;
    setStage(nextStage);
  }

  function requestAssistantInterruption(label: string) {
    if (interruptionRequestedRef.current) return;
    interruptionRequestedRef.current = true;
    suppressAssistantAudioRef.current = true;
    websocketRef.current?.send(JSON.stringify({ event: 'interrupt' }));
    clearScheduledPlayback(audioContextRef, playbackCursorRef, activePlaybackSourcesRef);
    setStage('live');
    appendTimeline(label, 'warm');
  }

  // --- Voice event handlers ---

  function handleVoiceEvent(voiceEvent?: { eventType?: string; payload?: Record<string, unknown> }) {
    const eventType = String(voiceEvent?.eventType ?? '');
    const payload = voiceEvent?.payload ?? {};

    if (eventType === 'input_transcript') {
      appendTranscript('caller', String(payload.text ?? ''));
      return;
    }
    if (eventType === 'output_transcript') {
      if (suppressAssistantAudioRef.current && !isUploadingAudioRef.current) return;
      interruptionRequestedRef.current = false;
      suppressAssistantAudioRef.current = false;
      appendTranscript('assistant', String(payload.text ?? ''));
      setStage('responding');
      return;
    }
    if (eventType === 'interruption') {
      appendTimeline('Interruption detected.', 'alert');
      setStage('live');
      return;
    }
    if (eventType === 'error') {
      setStage('error');
      setIsUploadingAudio(false);
      setIsRecording(false);
      setHandsfreeEnabled(false);
      interruptionRequestedRef.current = false;
      suppressAssistantAudioRef.current = false;
      clearScheduledPlayback(audioContextRef, playbackCursorRef, activePlaybackSourcesRef);
      setError(String(payload.message ?? 'Unknown voice error.'));
      appendTimeline('Voice provider returned an error.', 'alert');
    }
  }

  function handleSocketMessage(payload: Record<string, unknown>) {
    const type = String(payload.type ?? payload.event ?? 'event');

    if (type === 'session_bootstrapped') {
      appendTimeline('Clinic assistant connected.', 'warm');
      const voiceEvent = payload.voiceEvent as { payload?: Record<string, unknown> } | undefined;
      const welcomeText = String(voiceEvent?.payload?.text ?? '').trim();
      const transport = String(voiceEvent?.payload?.transport ?? '').trim();
      if (transport) {
        setAssistantTransport(transport === 'live' ? 'live' : 'stub');
        appendTimeline(`Assistant transport: ${transport}.`, transport === 'live' ? 'warm' : 'alert');
      }
      if (welcomeText) appendTranscript('assistant', welcomeText);
      websocketRef.current?.send(
        JSON.stringify({ event: 'start', streamSid: streamSidRef.current, start: { streamSid: streamSidRef.current } })
      );
      return;
    }
    if (type === 'call_started') {
      appendTimeline('Browser-native call stream started.', 'neutral');
      setStage('live');
      if (!primedRef.current) {
        primedRef.current = true;
        if (talkModeRef.current === 'handsfree') {
          window.setTimeout(() => {
            void handleMicPress();
          }, 0);
        }
      }
      return;
    }
    if (type === 'voice_event') {
      const ve = payload.voiceEvent as { eventType?: string; payload?: Record<string, unknown> } | undefined;
      handleVoiceEvent(ve);
      return;
    }
    if (type === 'audio_chunk' && payload.audio) {
      if (suppressAssistantAudioRef.current && !isUploadingAudioRef.current) return;
      const audio = payload.audio as { payload?: string; sampleRateHz?: number };
      if (audio.payload) {
        void playPcm16Payload(audio.payload, Number(audio.sampleRateHz ?? 24000), audioContextRef, playbackCursorRef, activePlaybackSourcesRef).then(() => {
          setSpeakerReady(true);
        });
      }
      return;
    }
    if (type === 'turn_complete') {
      appendTimeline('Assistant turn completed.', 'neutral');
      setIsUploadingAudio(false);
      interruptionRequestedRef.current = false;
      suppressAssistantAudioRef.current = false;
      setStage('live');
      if (talkModeRef.current === 'handsfree' && handsfreeEnabledRef.current && !isRecording) {
        window.setTimeout(() => {
          void handleMicPress();
        }, 0);
      }
      return;
    }
    if (type === 'clear_playback') {
      suppressAssistantAudioRef.current = true;
      clearScheduledPlayback(audioContextRef, playbackCursorRef, activePlaybackSourcesRef);
      appendTimeline('Playback cleared for interruption.', 'neutral');
      return;
    }
    if (type === 'call_stopped') {
      appendTimeline('Call ended.', 'neutral');
      setIsUploadingAudio(false);
      setIsRecording(false);
      setMicLevel(0);
      setHandsfreeEnabled(false);
      setAssistantTransport('waiting');
      interruptionRequestedRef.current = false;
      suppressAssistantAudioRef.current = false;
      setStage('ended');
      void loadCallOutcome(callSid || String(payload.callSession && (payload.callSession as Record<string, unknown>).call_sid || ''));
      onCallCompleted?.();
      return;
    }
    if (type === 'ignored_event' || type === 'mark_ack') return;
    appendTimeline(`Received ${type}.`, 'neutral');
  }

  // --- Call lifecycle ---

  async function handleStartCall() {
    resetCallState('idle');
    try {
      setError(null);
      setStage('connecting');
      setTranscript([]);
      setTimeline([]);
      setDraftUtterance('');
      primedRef.current = false;
      setIsUploadingAudio(false);
      setMicLevel(0);
      setLastSession(null);
      setLastQueueItems([]);
      setLastPayload(null);
      setActiveReviewTab('after');
      setHandsfreeEnabled(talkModeRef.current === 'handsfree');
      setAssistantTransport('waiting');
      interruptionRequestedRef.current = false;
      suppressAssistantAudioRef.current = false;

      assertCallLabDeploymentConfig();

      await ensureMicrophonePermission();

      const generatedCallSid = `call-lab-${Date.now()}`;
      setCallSid(generatedCallSid);
      setCallStartedAt(Date.now());
      setElapsedSeconds(0);

      const audioContext = await getAudioContext(audioContextRef);
      playbackCursorRef.current = audioContext.currentTime;
      setSpeakerReady(audioContext.state === 'running');

      const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
      const wsBase = API_BASE_URL.replace(/^https?/, protocol);
      const websocketUrl =
        `${wsBase}/ws/call-lab?callSid=${encodeURIComponent(generatedCallSid)}` +
        `&clinic=${encodeURIComponent(setupProfile?.clinic_key ?? 'demo-clinic')}` +
        `&callerName=${encodeURIComponent('Call Lab Tester')}`;

      appendTimeline('Dialling the internal phone-mode simulator.', 'warm');
      const socket = new WebSocket(websocketUrl);
      websocketRef.current = socket;

      socket.onopen = () => {
        appendTimeline('Call connection opened.', 'neutral');
      };
      socket.onmessage = (message) => {
        const p = JSON.parse(String(message.data)) as Record<string, unknown>;
        handleSocketMessage(p);
      };
      socket.onerror = () => {
        console.error('Call Lab websocket failed to connect.', { websocketUrl });
        setStage('error');
        setError('The Call Lab websocket failed to connect.');
        appendTimeline('Websocket connection failed.', 'alert');
      };
      socket.onclose = (event) => {
        websocketRef.current = null;
        if (stageRef.current === 'connecting') {
          const detail = event.reason ? ` ${event.reason}` : '';
          setError(`The call could not finish starting.${detail}`);
          appendTimeline('Call start ended before the assistant came online.', 'alert');
          resetCallState('error');
          return;
        }
        if (stageRef.current !== 'ended' && stageRef.current !== 'idle' && stageRef.current !== 'error') {
          appendTimeline('Call connection closed.', 'neutral');
          resetCallState('ended');
        }
      };
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : 'Failed to start the call.';
      console.error('Call Lab start failed.', startError);
      setError(message);
      appendTimeline(message, 'alert');
      resetCallState('error');
    }
  }

  function handleEndCall() {
    if (!websocketRef.current) {
      setError(null);
      appendTimeline('Call reset.', 'neutral');
      resetCallState('ended');
      return;
    }
    void stopRecordingAndSend({ shouldSend: false });
    if (websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({ event: 'stop', streamSid: streamSidRef.current, stop: { reason: 'call-lab-ended' } })
      );
      return;
    }
    appendTimeline('Call reset before the line fully connected.', 'neutral');
    setError(null);
    resetCallState('ended');
  }

  function sendUtterance(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !websocketRef.current || (stage !== 'live' && stage !== 'responding')) return;
    if (stage === 'responding') requestAssistantInterruption('Caller cut in with a typed reply.');
    websocketRef.current.send(JSON.stringify({ event: 'text', text: trimmed }));
    setDraftUtterance('');
    appendTimeline('You sent a typed reply.', 'warm');
    setStage('responding');
  }

  // --- Mic handling ---

  async function handleMicPress() {
    const activeStage = stageRef.current;
    if (
      isRecording ||
      isUploadingAudio ||
      !websocketRef.current ||
      (activeStage !== 'live' && activeStage !== 'responding')
    ) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support microphone capture for the Call Lab.');
      setMicPermission('denied');
      appendTimeline('Browser microphone capture is unavailable.', 'alert');
      return;
    }
    try {
      setError(null);
      recordedSampleCountRef.current = 0;
      const activeTalkMode = talkModeRef.current;
      if (activeStage === 'responding' && websocketRef.current) {
        requestAssistantInterruption('Caller interrupted assistant.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;
      setMicPermission('granted');

      const context = new AudioContext();
      recorderContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const muteGain = context.createGain();
      muteGain.gain.value = 0;

      recorderSourceRef.current = source;
      recorderProcessorRef.current = processor;
      recorderMuteGainRef.current = muteGain;

      processor.onaudioprocess = (event) => {
        const channel = event.inputBuffer.getChannelData(0);
        const slice = new Float32Array(channel);
        const rms = calculateRms(slice);
        setMicLevel(rms);

        const handsfreeActive = talkModeRef.current === 'handsfree' && handsfreeEnabledRef.current;
        if (handsfreeActive && stageRef.current === 'responding' && !isUploadingAudioRef.current && rms > 0.08) {
          requestAssistantInterruption('Caller spoke over the assistant.');
        }

        const shouldStream =
          talkModeRef.current === 'push' ||
          (handsfreeActive && (stageRef.current === 'live' || interruptionRequestedRef.current) && !isUploadingAudioRef.current);

        if (shouldStream) {
          const downsampled = downsampleFloat32(slice, context.sampleRate, 16000);
          recordedSampleCountRef.current += downsampled.length;
          sendBrowserAudioChunk(downsampled);
        }

        if (handsfreeActive) {
          processHandsfreeFrame(rms);
        }
      };

      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(context.destination);
      await context.resume();

      appendTimeline(
        activeTalkMode === 'handsfree' ? 'Hands-free is on. Speak naturally.' : 'Push to talk is ready.',
        'warm'
      );
      setIsRecording(true);
      if (activeTalkMode === 'handsfree') {
        handsfreeEnabledRef.current = true;
        setHandsfreeEnabled(true);
      }
    } catch (micError) {
      setMicPermission('denied');
      setError(micError instanceof Error ? micError.message : 'Unable to access the microphone for Phone Mode.');
      appendTimeline('Microphone access failed.', 'alert');
      cleanupRecorderResources(mediaStreamRef, recorderContextRef, recorderSourceRef, recorderProcessorRef, recorderMuteGainRef);
    }
  }

  function handleMicRelease() {
    if (talkMode === 'handsfree') return;
    void stopRecordingAndSend({ shouldSend: true });
  }

  async function toggleHandsfree() {
    talkModeRef.current = 'handsfree';
    setTalkMode('handsfree');
    if (handsfreeEnabled) {
      handsfreeEnabledRef.current = false;
      await stopRecordingAndSend({ shouldSend: false });
      setHandsfreeEnabled(false);
      appendTimeline('Hands-free listening paused.', 'neutral');
      return;
    }
    await handleMicPress();
  }

  async function stopRecordingAndSend({ shouldSend }: { shouldSend: boolean }) {
    if (!isRecording && !recorderContextRef.current) return;
    cleanupRecorderResources(mediaStreamRef, recorderContextRef, recorderSourceRef, recorderProcessorRef, recorderMuteGainRef);
    setIsRecording(false);
    setMicLevel(0);
    autoSpeakingRef.current = false;
    silenceFramesRef.current = 0;

    if (!shouldSend || !websocketRef.current) {
      recordedSampleCountRef.current = 0;
      interruptionRequestedRef.current = false;
      suppressAssistantAudioRef.current = false;
      return;
    }
    if (recordedSampleCountRef.current < 2048) {
      appendTimeline('Mic turn was too short to send.', 'neutral');
      recordedSampleCountRef.current = 0;
      interruptionRequestedRef.current = false;
      suppressAssistantAudioRef.current = false;
      return;
    }
    appendTimeline('Caller sent a microphone turn.', 'warm');
    setIsUploadingAudio(true);
    setStage('responding');
    interruptionRequestedRef.current = false;
    websocketRef.current.send(JSON.stringify({ event: 'audio_commit' }));
    recordedSampleCountRef.current = 0;
  }

  function processHandsfreeFrame(rms: number) {
    if (!handsfreeEnabledRef.current || isUploadingAudioRef.current || (stageRef.current !== 'live' && !interruptionRequestedRef.current)) return;

    const speechThreshold = 0.08;
    const silenceThreshold = 0.04;
    const maxSilenceFrames = 5;

    if (rms > speechThreshold) autoSpeakingRef.current = true;
    if (autoSpeakingRef.current && rms < silenceThreshold) {
      silenceFramesRef.current += 1;
    } else {
      silenceFramesRef.current = 0;
    }

    if (autoSpeakingRef.current && silenceFramesRef.current >= maxSilenceFrames) {
      autoSpeakingRef.current = false;
      silenceFramesRef.current = 0;
      appendTimeline('Hands-free detected the end of a caller turn.', 'warm');
      if (websocketRef.current && recordedSampleCountRef.current >= 2048) {
        setIsUploadingAudio(true);
        setStage('responding');
        websocketRef.current.send(JSON.stringify({ event: 'audio_commit' }));
        recordedSampleCountRef.current = 0;
      }
    }
  }

  function sendBrowserAudioChunk(float32Chunk: Float32Array) {
    if (!websocketRef.current || float32Chunk.length === 0) return;
    const pcm16 = float32ToPcm16Bytes(float32Chunk);
    websocketRef.current.send(
      JSON.stringify({
        event: 'audio_chunk',
        audio: { payload: bytesToBase64(pcm16), sampleRateHz: 16000, format: 'pcm16le' },
      })
    );
  }

  async function ensureMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission('denied');
      throw new Error('This browser does not support microphone access for the Call Lab.');
    }
    if (micPermission === 'granted') return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    stream.getTracks().forEach((track) => track.stop());
    setMicPermission('granted');
    appendTimeline('Microphone ready.', 'neutral');
  }

  async function loadCallOutcome(resolvedCallSid: string) {
    if (!resolvedCallSid) return;
    try {
      const [sessions, queueItems, payloads] = await Promise.all([
        demoApi.getCallSessions(),
        demoApi.getActionQueue(),
        demoApi.getStubPayloads(),
      ]);
      const session =
        sessions.find((item) => item.call_sid === resolvedCallSid) ??
        [...sessions].reverse().find((item) => item.call_sid.startsWith('call-lab-')) ??
        null;
      const relatedQueueItems = queueItems.filter((item) => item.related_call_sid === resolvedCallSid);
      const relatedPayload =
        [...payloads].reverse().find((item) => {
          const cs = item.call_sid;
          return typeof cs === 'string' && cs === resolvedCallSid;
        }) ?? null;
      setLastSession(session);
      setLastQueueItems(relatedQueueItems);
      setLastPayload(relatedPayload);
    } catch (loadError) {
      appendTimeline(loadError instanceof Error ? loadError.message : 'Failed to load post-call outcome.', 'alert');
    }
  }

  function handlePushModeSelected() {
    talkModeRef.current = 'push';
    setTalkMode('push');
    if (handsfreeEnabled) {
      handsfreeEnabledRef.current = false;
      void stopRecordingAndSend({ shouldSend: false });
      setHandsfreeEnabled(false);
    }
    appendTimeline('Push-to-talk selected.', 'neutral');
  }

  function handleHandsfreeModeSelected() {
    talkModeRef.current = 'handsfree';
    setTalkMode('handsfree');
    appendTimeline('Hands-free selected.', 'warm');
    if (!handsfreeEnabled && websocketRef.current && (stageRef.current === 'live' || stageRef.current === 'responding')) {
      void toggleHandsfree();
    }
  }

  function handleComposerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendUtterance(draftUtterance);
  }

  function assertCallLabDeploymentConfig() {
    if (typeof window === 'undefined') return;

    const frontendHost = window.location.hostname;
    const isLocalFrontend =
      frontendHost === 'localhost' ||
      frontendHost === '127.0.0.1' ||
      frontendHost.endsWith('.local');

    let apiUrl: URL;
    try {
      apiUrl = new URL(API_BASE_URL);
    } catch {
      throw new Error(`Invalid API base URL: ${API_BASE_URL}`);
    }

    const apiHost = apiUrl.hostname;
    const apiIsLocal =
      apiHost === 'localhost' ||
      apiHost === '127.0.0.1' ||
      apiHost.endsWith('.local');

    if (!isLocalFrontend && apiIsLocal) {
      throw new Error(
        'This deployed frontend is still pointing at localhost. Set VITE_API_BASE_URL to your Railway API URL in Vercel and redeploy.'
      );
    }

    if (window.location.protocol === 'https:' && apiUrl.protocol === 'http:' && !apiIsLocal) {
      throw new Error(
        'This frontend is loaded over HTTPS but the API base URL is HTTP. Use an HTTPS API URL so the Call Lab websocket can connect.'
      );
    }
  }

  return {
    // State
    stage,
    talkMode,
    setupProfile,
    transcript,
    timeline,
    draftUtterance,
    callSid,
    error,
    callStartedAt,
    elapsedSeconds,
    speakerReady,
    isRecording,
    isUploadingAudio,
    micLevel,
    micPermission,
    handsfreeEnabled,
    assistantTransport,
    activeReviewTab,
    lastSession,
    lastQueueItems,
    lastPayload,
    // Derived
    statusCopy,
    clinicName,
    clinicLine,
    // Actions
    handleStartCall,
    handleEndCall,
    handleMicPress,
    handleMicRelease,
    toggleHandsfree,
    handlePushModeSelected,
    handleHandsfreeModeSelected,
    sendUtterance,
    handleComposerSubmit,
    setDraftUtterance,
    setActiveReviewTab,
  };
}
