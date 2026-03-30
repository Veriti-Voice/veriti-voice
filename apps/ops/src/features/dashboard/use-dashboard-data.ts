import { useState, useEffect, useCallback } from 'react';
import { demoApi } from '@/lib/api';
import type { CallSessionRecord, ActionQueueItem, SetupProfile } from '@/lib/api';

export type DashboardData = {
  callsHandled: number;
  bookingsMade: number;
  escalations: number;
  faqsAnswered: number;
  savingsEstimate: number;
  recentCalls: CallSessionRecord[];
  actionItems: ActionQueueItem[];
  profile: SetupProfile | null;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

const SAVINGS_PER_CALL_MINUTES = 8; // avg receptionist minutes saved per handled call
const RECEPTIONIST_RATE_PER_MIN = 0.75; // AUD per minute

export function useDashboardData(): DashboardData {
  const [sessions, setSessions] = useState<CallSessionRecord[]>([]);
  const [actionItems, setActionItems] = useState<ActionQueueItem[]>([]);
  const [profile, setProfile] = useState<SetupProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sessionsResult, queueResult, profileResult] = await Promise.all([
        demoApi.getCallSessions(),
        demoApi.getActionQueue(),
        demoApi.getSetupProfile(),
      ]);
      setSessions(sessionsResult);
      setActionItems(queueResult);
      setProfile(profileResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const callsHandled = sessions.length;
  const bookingsMade = sessions.filter(
    (s) => s.captured_intent === 'book_appointment' && s.state === 'completed',
  ).length;
  const escalations = sessions.filter((s) => s.priority === 'high' || s.action_required).length;
  const faqsAnswered = sessions.filter((s) => s.captured_intent === 'faq').length;
  const savingsEstimate = Math.round(
    callsHandled * SAVINGS_PER_CALL_MINUTES * RECEPTIONIST_RATE_PER_MIN,
  );
  const recentCalls = [...sessions]
    .sort((a, b) => (a.call_sid < b.call_sid ? 1 : -1))
    .slice(0, 8);

  const isLive = profile !== null && !isLoading;

  return {
    callsHandled,
    bookingsMade,
    escalations,
    faqsAnswered,
    savingsEstimate,
    recentCalls,
    actionItems,
    profile,
    isLive,
    isLoading,
    error,
    refresh: load,
  };
}
