import type { ReviewTab, TranscriptEntry, TimelineEntry } from './types';
import type { ActionQueueItem, CallSessionRecord, StubPayloadRecord } from '@/lib/api';
import { humaniseIntent, humaniseState, humaniseSpeaker, buildPayloadSummary } from './format-utils';

type ReviewPanelProps = {
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  transcript: TranscriptEntry[];
  timeline: TimelineEntry[];
  lastSession: CallSessionRecord | null;
  lastQueueItems: ActionQueueItem[];
  lastPayload: StubPayloadRecord | null;
};

export function ReviewPanel({
  activeTab,
  onTabChange,
  transcript,
  timeline,
  lastSession,
  lastQueueItems,
  lastPayload,
}: ReviewPanelProps) {
  return (
    <article className="subcard review-panel">
      <div className="preview-header review-panel-head">
        <div>
          <p className="card-kicker">Review</p>
          <h3>Call details</h3>
        </div>
        <div className="review-tab-row">
          <button
            type="button"
            className={`mode-chip ${activeTab === 'after' ? 'mode-chip-active' : ''}`}
            onClick={() => onTabChange('after')}
          >
            Outcome
          </button>
          <button
            type="button"
            className={`mode-chip ${activeTab === 'transcript' ? 'mode-chip-active' : ''}`}
            onClick={() => onTabChange('transcript')}
          >
            Transcript
          </button>
          <button
            type="button"
            className={`mode-chip ${activeTab === 'events' ? 'mode-chip-active' : ''}`}
            onClick={() => onTabChange('events')}
          >
            Events
          </button>
        </div>
      </div>

      <div className="review-panel-body">
        {activeTab === 'after' ? (
          <>
            <div className="preview-header review-panel-subhead">
              <div>
                <p className="card-kicker">Outcome</p>
                <h3>After the call</h3>
              </div>
              <span className="priority priority-medium">
                {lastSession ? lastSession.priority : 'waiting'}
              </span>
            </div>
            {lastSession ? (
              <div className="record-stack">
                <div className="outcome-summary-card">
                  <strong>{lastSession.status_summary || 'No summary captured yet.'}</strong>
                </div>
                <div className="outcome-facts-grid">
                  <div className="meta-pill">
                    <span>Intent</span>
                    <strong>{humaniseIntent(lastSession.captured_intent)}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>State</span>
                    <strong>{humaniseState(lastSession.state)}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Needs action</span>
                    <strong>{lastSession.action_required ? 'Yes' : 'No'}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Audio turns</span>
                    <strong>
                      {lastSession.inbound_audio_chunk_count} in / {lastSession.outbound_audio_chunk_count} out
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="empty-copy">Finish a call to see the outcome here.</p>
            )}
            {lastQueueItems.length ? (
              <div className="record-stack compact-records">
                {lastQueueItems.map((item) => (
                  <div className="session-summary" key={item.item_id}>
                    <strong>{item.label}</strong>
                    <p>{item.summary}</p>
                    <p>
                      {item.priority} priority · {item.workflow_status}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {lastPayload ? (
              <div className="record-stack compact-records">
                <div className="session-summary">
                  <strong>{humaniseIntent(lastPayload.action)}</strong>
                  <p>{buildPayloadSummary(lastPayload)}</p>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeTab === 'transcript' ? (
          <>
            <div className="preview-header review-panel-subhead">
              <div>
                <p className="card-kicker">Transcript</p>
                <h3>Live conversation</h3>
              </div>
              <span className="priority priority-low">{transcript.length} turns</span>
            </div>
            <div className="transcript-stack review-scroll">
              {transcript.length ? (
                transcript.map((entry) => (
                  <div key={entry.id} className={`transcript-bubble transcript-${entry.speaker}`}>
                    <span>{humaniseSpeaker(entry.speaker)}</span>
                    <strong>{entry.text}</strong>
                    <small>{entry.at}</small>
                  </div>
                ))
              ) : (
                <p className="empty-copy">Start a call to see the conversation appear here.</p>
              )}
            </div>
          </>
        ) : null}

        {activeTab === 'events' ? (
          <>
            <div className="preview-header review-panel-subhead">
              <div>
                <p className="card-kicker">Timeline</p>
                <h3>Call events</h3>
              </div>
              <span className="priority priority-medium">Internal</span>
            </div>
            <div className="timeline-stack review-scroll">
              {timeline.length ? (
                timeline.map((entry) => (
                  <div key={entry.id} className={`timeline-row timeline-${entry.tone}`}>
                    <strong>{entry.label}</strong>
                    <span>{entry.at}</span>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No events yet.</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}
