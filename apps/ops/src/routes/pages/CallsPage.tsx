import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Phone, ArrowRight, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { demoApi } from '@/lib/api';
import type { CallSessionRecord } from '@/lib/api';

type CallFilter = 'all' | 'booking' | 'faq' | 'escalated' | 'failed';

function intentLabel(intent: string): string {
  if (!intent) return 'General';
  return intent.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityVariant(p: string): 'default' | 'accent' | 'destructive' | 'success' | 'secondary' {
  if (p === 'high') return 'destructive';
  if (p === 'medium') return 'accent';
  return 'success';
}

function stateLabel(state: string): string {
  if (!state) return 'Unknown';
  return state.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CallsPage() {
  const [calls, setCalls] = useState<CallSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CallFilter>('all');

  useEffect(() => {
    setIsLoading(true);
    demoApi
      .getCallSessions()
      .then(setCalls)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = calls.filter((c) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'booking') return c.captured_intent === 'book_appointment';
    if (activeFilter === 'faq') return c.captured_intent === 'faq';
    if (activeFilter === 'escalated') return c.priority === 'high' || c.action_required;
    if (activeFilter === 'failed') return c.state === 'failed' || c.state === 'error';
    return true;
  });

  const filters: { id: CallFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'booking', label: 'Booking' },
    { id: 'faq', label: 'FAQ' },
    { id: 'escalated', label: 'Escalated' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ironwood">Call Log</h1>
        <p className="text-sm text-muted-foreground mt-1">All calls handled by your AI receptionist</p>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              activeFilter === f.id
                ? 'bg-ironwood text-white border-ironwood'
                : 'bg-white text-ironwood border-border hover:border-deep-eucalypt'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isLoading ? 'Loading...' : `${filtered.length} call${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 pb-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4 text-sage-mist" />
              {calls.length === 0
                ? 'No calls yet — make a test call in the Call Lab.'
                : 'No calls match this filter.'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((call) => (
                <li key={call.call_sid}>
                  <Link
                    to={`/calls/${call.call_sid}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-soft-sand/50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-deep-eucalypt/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-deep-eucalypt" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-ironwood">
                          {call.caller_name || call.from_number || 'Unknown caller'}
                        </p>
                        <Badge variant={priorityVariant(call.priority)} className="text-xs">
                          {intentLabel(call.captured_intent)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {call.status_summary || stateLabel(call.state)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">{stateLabel(call.state)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {call.inbound_audio_chunk_count}in / {call.outbound_audio_chunk_count}out
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
