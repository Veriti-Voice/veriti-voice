import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Phone, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { demoApi } from '@/lib/api';
import type { CallSessionRecord } from '@/lib/api';

function intentLabel(intent: string): string {
  if (!intent) return 'General';
  return intent.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityVariant(p: string): 'default' | 'accent' | 'destructive' | 'success' | 'secondary' {
  if (p === 'high') return 'destructive';
  if (p === 'medium') return 'accent';
  return 'success';
}

function outcomeIcon(session: CallSessionRecord) {
  if (session.priority === 'high' || session.action_required) {
    return <AlertTriangle className="h-5 w-5 text-copper-clay" />;
  }
  if (session.captured_intent === 'book_appointment') {
    return <CheckCircle className="h-5 w-5 text-deep-eucalypt" />;
  }
  return <MessageSquare className="h-5 w-5 text-deep-eucalypt" />;
}

function outcomeLabel(session: CallSessionRecord): string {
  if (session.captured_intent === 'book_appointment') return 'Booking captured';
  if (session.priority === 'high') return 'Escalated to human';
  if (session.captured_intent === 'faq') return 'FAQ answered';
  return 'Call handled';
}

export function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<CallSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    demoApi
      .getCallSession(id)
      .then(setSession)
      .catch(() => setError('Call not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        to="/calls"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ironwood transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to calls
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error || !session ? (
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{error ?? 'Call not found.'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-ironwood">
                {session.caller_name || session.from_number || 'Unknown caller'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{session.call_sid}</p>
            </div>
            <Badge variant={priorityVariant(session.priority)} className="text-sm px-3 py-1">
              {intentLabel(session.captured_intent)}
            </Badge>
          </div>

          {/* Outcome verdict card */}
          <Card className="bg-white border-l-4 border-l-deep-eucalypt">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{outcomeIcon(session)}</div>
                <div>
                  <p className="text-xs font-medium text-deep-eucalypt uppercase tracking-wider">
                    Outcome
                  </p>
                  <p className="text-lg font-semibold text-ironwood mt-0.5">
                    {outcomeLabel(session)}
                  </p>
                  {session.status_summary ? (
                    <p className="text-sm text-muted-foreground mt-1">{session.status_summary}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'From', value: session.from_number || '—' },
              { label: 'To', value: session.to_number || '—' },
              { label: 'Priority', value: session.priority || '—' },
              { label: 'Action required', value: session.action_required ? 'Yes' : 'No' },
              { label: 'State', value: session.state || '—' },
              { label: 'Audio in', value: `${session.inbound_audio_chunk_count} chunks` },
              { label: 'Audio out', value: `${session.outbound_audio_chunk_count} chunks` },
              { label: 'Clinic', value: session.clinic_key || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-border rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-ironwood mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Transcript */}
          {session.transcript_events && session.transcript_events.length > 0 ? (
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <div>
                  <p className="text-xs font-medium text-deep-eucalypt uppercase tracking-wider">
                    Transcript
                  </p>
                  <CardTitle className="text-base mt-0.5">
                    Conversation · {session.transcript_events.length} turns
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                  {session.transcript_events.map((entry, i) => {
                    const isAssistant = entry.speaker === 'assistant' || entry.speaker === 'agent';
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium ${
                            isAssistant
                              ? 'bg-deep-eucalypt/10 text-deep-eucalypt'
                              : 'bg-copper-clay/10 text-copper-clay'
                          }`}
                        >
                          {isAssistant ? 'AI' : 'C'}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            isAssistant
                              ? 'bg-deep-eucalypt/8 border border-deep-eucalypt/15'
                              : 'bg-soft-sand border border-copper-clay/20'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1 text-muted-foreground">
                            {isAssistant ? 'AI Receptionist' : 'Caller'}
                          </p>
                          <p className="text-sm text-ironwood">{entry.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-sage-mist" />
                  No transcript available for this call.
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
