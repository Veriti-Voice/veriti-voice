import { useState } from 'react';
import { CallLab } from '@/features/calllab/CallLab';
import { CallsPriorityCard } from '@/features/calls/CallsPriorityCard';

export function LabPage() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ironwood">Call Lab</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test your AI voice agent with real conversations
        </p>
      </div>

      <div className="call-lab-legacy-wrapper">
        <section className="experience-layout">
          <div className="experience-main">
            <CallLab onCallCompleted={() => setRefreshToken((c) => c + 1)} />
          </div>
          <aside className="experience-side">
            <CallsPriorityCard refreshToken={refreshToken} />
          </aside>
        </section>
      </div>
    </div>
  );
}
