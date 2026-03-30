import type { CallStage, TalkMode } from './types';
import { suggestedPrompts } from './constants';

type CallerToolsProps = {
  stage: CallStage;
  talkMode: TalkMode;
  draftUtterance: string;
  error: string | null;
  onSendUtterance: (text: string) => void;
  onDraftChange: (value: string) => void;
  onComposerSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPushModeSelected: () => void;
  onHandsfreeModeSelected: () => void;
};

export function CallerTools({
  stage,
  talkMode,
  draftUtterance,
  error,
  onSendUtterance,
  onDraftChange,
  onComposerSubmit,
  onPushModeSelected,
  onHandsfreeModeSelected,
}: CallerToolsProps) {
  return (
    <section className="call-tools-panel subcard">
      <div className="call-lab-console-head">
        <div>
          <p className="card-kicker">Caller tools</p>
          <h3>Guide the test</h3>
        </div>
        <div className="call-lab-toggle-row">
          <span className="call-lab-toggle-label">Fallback</span>
          <button
            type="button"
            className={`mode-chip ${talkMode === 'push' ? 'mode-chip-active' : ''}`}
            onClick={onPushModeSelected}
          >
            Push to talk
          </button>
          <button
            type="button"
            className={`mode-chip ${talkMode === 'handsfree' ? 'mode-chip-active' : ''}`}
            onClick={onHandsfreeModeSelected}
          >
            Hands-free
          </button>
        </div>
      </div>

      <div className="call-lab-console">
        <div className="scenario-strip">
          {suggestedPrompts.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className="scenario-card"
              onClick={() => onSendUtterance(scenario.prompt)}
              disabled={stage !== 'live' && stage !== 'responding'}
            >
              <strong>{scenario.label}</strong>
              <span>{scenario.subtitle}</span>
            </button>
          ))}
        </div>

        <form className="call-composer" onSubmit={onComposerSubmit}>
          <label>
            Type a caller message if you want to steer the conversation
            <textarea
              value={draftUtterance}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Example: Hi, I need to move my appointment tomorrow arvo."
              disabled={stage !== 'live' && stage !== 'responding'}
            />
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={!draftUtterance.trim() || (stage !== 'live' && stage !== 'responding')}
          >
            Send typed message
          </button>
        </form>

        {error ? <p className="error-banner">{error}</p> : null}
      </div>
    </section>
  );
}
