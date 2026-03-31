import type { CallLabProps } from './types';
import { formatStageLabel, stageToneClass } from './format-utils';
import { useCallSession } from './use-call-session';
import { PhoneSimulator } from './PhoneSimulator';
import { ReviewPanel } from './ReviewPanel';
import { CallerTools } from './CallerTools';

export function CallLab({ onCallCompleted }: CallLabProps) {
  const session = useCallSession(onCallCompleted);

  return (
    <section className="call-lab card card-wide">
      <div className="call-lab-header">
        <div>
          <p className="card-kicker">Call Lab</p>
          <h2>Test the clinic call flow</h2>
          <p className="card-copy">
            Ring the line, talk naturally, then review what the call created.
          </p>
        </div>
        <div className="call-lab-status-row">
          <span className="mode-chip mode-chip-active">Hands-free by default</span>
          <span className={`mode-chip mode-chip-static mode-chip-${session.assistantTransport}`}>
            {session.assistantTransport === 'waiting'
              ? 'Assistant waiting'
              : session.assistantTransport === 'live'
                ? 'Live voice'
                : 'Stub voice'}
          </span>
        </div>
      </div>

      <div className="call-lab-howto call-lab-hints">
        <span>Start the call</span>
        <span>Speak naturally</span>
        <span>
          Mic{' '}
          {session.micPermission === 'granted'
            ? 'ready'
            : session.micPermission === 'denied'
              ? 'blocked'
              : 'pending'}
        </span>
        <span>Push to talk is fallback only</span>
      </div>

      <div className="call-lab-grid">
        <section className="call-stage">
          <div className="call-stage-topline">
            <div>
              <span className="phone-pill">Internal call</span>
              <h3>Natural call testing</h3>
              <p>Talk to it like a real caller and see how it holds up.</p>
            </div>
            <div className="call-topline-stats">
              <span className={`priority ${stageToneClass(session.stage)}`}>
                {formatStageLabel(session.stage)}
              </span>
              <span className="call-stat-pill">
                {session.talkMode === 'handsfree' ? 'Hands-free' : 'Push to talk'}
              </span>
              <span className="call-stat-pill">
                {session.assistantTransport === 'live'
                  ? 'Live voice'
                  : session.assistantTransport === 'stub'
                    ? 'Stub voice'
                    : 'Waiting'}
              </span>
            </div>
          </div>

          <PhoneSimulator
            stage={session.stage}
            talkMode={session.talkMode}
            clinicName={session.clinicName}
            clinicLine={session.clinicLine}
            statusCopy={session.statusCopy}
            elapsedSeconds={session.elapsedSeconds}
            speakerReady={session.speakerReady}
            isRecording={session.isRecording}
            isUploadingAudio={session.isUploadingAudio}
            micLevel={session.micLevel}
            handsfreeEnabled={session.handsfreeEnabled}
            assistantTransport={session.assistantTransport}
            onStartCall={session.handleStartCall}
            onEndCall={session.handleEndCall}
            onMicPress={session.handleMicPress}
            onMicRelease={session.handleMicRelease}
            onToggleHandsfree={session.toggleHandsfree}
          />

          {session.error ? (
            <div className="call-lab-inline-error error-banner" role="alert">
              <strong>Call start issue</strong>
              <span>{session.error}</span>
            </div>
          ) : null}
        </section>

        <section className="call-sidebar">
          <ReviewPanel
            activeTab={session.activeReviewTab}
            onTabChange={session.setActiveReviewTab}
            transcript={session.transcript}
            timeline={session.timeline}
            lastSession={session.lastSession}
            lastQueueItems={session.lastQueueItems}
            lastPayload={session.lastPayload}
          />
        </section>
      </div>

      <CallerTools
        stage={session.stage}
        talkMode={session.talkMode}
        draftUtterance={session.draftUtterance}
        error={session.error}
        onSendUtterance={session.sendUtterance}
        onDraftChange={session.setDraftUtterance}
        onComposerSubmit={session.handleComposerSubmit}
        onPushModeSelected={session.handlePushModeSelected}
        onHandsfreeModeSelected={session.handleHandsfreeModeSelected}
      />
    </section>
  );
}
