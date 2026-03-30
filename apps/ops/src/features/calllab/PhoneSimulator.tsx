import type { CallStage, TalkMode } from './types';
import { waveformProfile } from './constants';
import { formatDuration, formatStageLabel, stageToneClass } from './format-utils';

type PhoneSimulatorProps = {
  stage: CallStage;
  talkMode: TalkMode;
  clinicName: string;
  clinicLine: string;
  statusCopy: string;
  elapsedSeconds: number;
  speakerReady: boolean;
  isRecording: boolean;
  isUploadingAudio: boolean;
  micLevel: number;
  handsfreeEnabled: boolean;
  assistantTransport: string;
  onStartCall: () => void;
  onEndCall: () => void;
  onMicPress: () => void;
  onMicRelease: () => void;
  onToggleHandsfree: () => void;
};

export function PhoneSimulator({
  stage,
  talkMode,
  clinicName,
  clinicLine,
  statusCopy,
  elapsedSeconds,
  speakerReady,
  isRecording,
  isUploadingAudio,
  micLevel,
  handsfreeEnabled,
  onStartCall,
  onEndCall,
  onMicPress,
  onMicRelease,
  onToggleHandsfree,
}: PhoneSimulatorProps) {
  return (
    <div className="call-stage-body">
      <div className="phone-shell">
        <div className="phone-frame">
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="phone-statusbar">
              <span>9:41</span>
              <div className="phone-status-icons">
                <span>5G</span>
                <span>{speakerReady ? 'Audio' : 'Idle'}</span>
              </div>
            </div>

            <div className="phone-call-body">
              <div className="phone-call-main">
                <div className="phone-line-pill">
                  <span className={`priority ${stageToneClass(stage)}`}>
                    {formatStageLabel(stage)}
                  </span>
                  <strong>{formatDuration(elapsedSeconds)}</strong>
                </div>

                <div className="phone-avatar-wrap">
                  <div className="phone-avatar-glow" />
                  <div className="phone-avatar">{clinicName.slice(0, 1)}</div>
                </div>

                <p className="phone-caller-label">Clinic line</p>
                <h3 className="phone-caller-name">{clinicName}</h3>
                <p className="phone-caller-number">{clinicLine}</p>
                <p className="phone-call-summary">{statusCopy}</p>

                <div className="phone-waveform" aria-hidden="true">
                  {waveformProfile.map((factor, index) => (
                    <span
                      key={`wave-${index}`}
                      className="phone-wave-bar"
                      style={{
                        height: `${18 + factor * 26 + micLevel * factor * 42}px`,
                        opacity: isRecording ? 1 : stage === 'responding' ? 0.9 : 0.62,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="phone-call-footer">
                <div className="phone-actions-dock">
                  <button
                    type="button"
                    className="phone-action phone-action-muted"
                    onClick={onStartCall}
                    disabled={stage === 'connecting' || stage === 'live' || stage === 'responding'}
                  >
                    <span>Start</span>
                  </button>
                  <button
                    type="button"
                    className={`phone-action phone-action-warm ${isRecording ? 'phone-action-live' : ''}`}
                    onPointerDown={(event) => {
                      if (talkMode === 'push') {
                        event.preventDefault();
                        void onMicPress();
                      }
                    }}
                    onPointerUp={(event) => {
                      if (talkMode === 'push') {
                        event.preventDefault();
                        onMicRelease();
                      }
                    }}
                    onPointerLeave={() => {
                      if (talkMode === 'push' && isRecording) onMicRelease();
                    }}
                    onPointerCancel={() => {
                      if (talkMode === 'push' && isRecording) onMicRelease();
                    }}
                    onClick={() => {
                      if (talkMode === 'handsfree') void onToggleHandsfree();
                    }}
                    disabled={isUploadingAudio || (stage !== 'live' && stage !== 'responding')}
                  >
                    <span>
                      {talkMode === 'handsfree'
                        ? handsfreeEnabled
                          ? 'Pause'
                          : 'Listen'
                        : isRecording
                          ? 'Release'
                          : 'Hold'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="phone-action phone-action-danger"
                    onClick={onEndCall}
                    disabled={stage === 'idle' || stage === 'ended' || stage === 'error'}
                  >
                    <span>End</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
