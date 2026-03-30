import { useEffect, useState } from 'react';

import { ActionQueueItem, demoApi } from '../../lib/api';

type CallsPriorityCardProps = {
  refreshToken: number;
};

export function CallsPriorityCard({ refreshToken }: CallsPriorityCardProps) {
  const [items, setItems] = useState<ActionQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const queueItems = await demoApi.getActionQueue();
        if (!cancelled) {
          setItems(queueItems);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load queue.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  async function handleWorkflowUpdate(
    itemId: string,
    workflowStatus: 'new' | 'reviewed' | 'done'
  ) {
    try {
      setUpdatingItemId(itemId);
      setError(null);
      const updated = await demoApi.updateActionQueueItem(itemId, workflowStatus);
      setItems((current) => {
        const next = current.map((item) => (item.item_id === itemId ? updated : item));
        return [...next].sort(compareQueueItems);
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Failed to update queue item.'
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  const newCount = items.filter((item) => item.workflow_status === 'new').length;
  const highPriorityCount = items.filter((item) => item.priority === 'high').length;
  const actionRequiredCount = items.filter((item) => item.action_required).length;
  const primaryItems = items.filter((item) => item.workflow_status !== 'done');
  const compactItems = (primaryItems.length ? primaryItems : items).slice(0, 2);
  const visibleItems = showAll ? items : compactItems;
  const hiddenItemCount = Math.max(0, items.length - visibleItems.length);

  return (
    <article className="card queue-card">
      <p className="card-kicker">Front Desk Queue</p>
      <h2>Triage what each call created</h2>
      <p className="card-copy">
        Keep this light. New calls should stand out straight away instead of getting buried in a
        big backlog.
      </p>

      <div className="queue-summary-grid">
        <div className="queue-summary-pill">
          <span>New</span>
          <strong>{newCount}</strong>
        </div>
        <div className="queue-summary-pill">
          <span>High priority</span>
          <strong>{highPriorityCount}</strong>
        </div>
        <div className="queue-summary-pill">
          <span>Needs action</span>
          <strong>{actionRequiredCount}</strong>
        </div>
      </div>

      {loading ? <p>Loading queue…</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      {items.length ? (
        <div className="queue-stack">
          {visibleItems.map((item) => (
            <section className="queue-item" key={item.item_id}>
              <div className="queue-item-header">
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.summary}</p>
                </div>
                <span className={`priority priority-${item.priority.toLowerCase()}`}>
                  {item.priority}
                </span>
              </div>

              <div className="queue-meta-row">
                <span>{item.status}</span>
                <span>{item.action_required ? 'Action required' : 'Auto-handled'}</span>
                <span className={`workflow-chip workflow-${item.workflow_status}`}>
                  {item.workflow_status}
                </span>
              </div>

              <div className="secondary-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={updatingItemId === item.item_id || item.workflow_status === 'new'}
                    onClick={() => handleWorkflowUpdate(item.item_id, 'new')}
                  >
                    Mark new
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={
                      updatingItemId === item.item_id || item.workflow_status === 'reviewed'
                    }
                    onClick={() => handleWorkflowUpdate(item.item_id, 'reviewed')}
                  >
                    Mark reviewed
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={updatingItemId === item.item_id || item.workflow_status === 'done'}
                    onClick={() => handleWorkflowUpdate(item.item_id, 'done')}
                  >
                    Mark done
                  </button>
              </div>
            </section>
          ))}

          {hiddenItemCount > 0 ? (
            <div className="queue-footer">
              <p className="empty-copy">
                {hiddenItemCount} older {hiddenItemCount === 1 ? 'item' : 'items'} hidden for a
                cleaner inbox.
              </p>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll ? 'Show fewer' : `Show all (${items.length})`}
              </button>
            </div>
          ) : items.length > 2 ? (
            <div className="queue-footer">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll ? 'Show fewer' : 'Show all'}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="empty-copy">No queue items yet. New calls will appear here.</p>
      )}
    </article>
  );
}

function compareQueueItems(a: ActionQueueItem, b: ActionQueueItem) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const workflowOrder = { new: 0, reviewed: 1, done: 2 };

  return (
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    workflowOrder[a.workflow_status] - workflowOrder[b.workflow_status] ||
    (a.action_required ? 0 : 1) - (b.action_required ? 0 : 1) ||
    a.item_id.localeCompare(b.item_id)
  );
}
