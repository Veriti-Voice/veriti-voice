import { Link } from 'react-router';
import { Phone, Calendar, AlertTriangle, TrendingUp, MessageSquare, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CallSessionRecord, ActionQueueItem } from '@/lib/api';

/* ── Status Bar ──────────────────────────────────────────── */

type StatusBarProps = {
  isLive: boolean;
  clinicName: string;
  onRefresh: () => void;
  isLoading: boolean;
};

export function StatusBar({ isLive, clinicName, onRefresh, isLoading }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold text-ironwood">{clinicName || 'Dashboard'}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI receptionist performance</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-white text-sm font-medium">
          <span
            className={`w-2 h-2 rounded-full ${isLive ? 'bg-sage-mist animate-pulse' : 'bg-copper-clay'}`}
          />
          <span className={isLive ? 'text-deep-eucalypt' : 'text-copper-clay'}>
            {isLive ? 'Live' : 'Offline'}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg border border-border bg-white hover:bg-soft-sand transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}

/* ── Metric Card ─────────────────────────────────────────── */

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isLoading: boolean;
  sub?: string;
  accent?: boolean;
};

export function MetricCard({ label, value, icon, isLoading, sub, accent }: MetricCardProps) {
  return (
    <Card className={accent ? 'border-copper-clay/20 bg-white' : 'bg-white'}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`p-1.5 rounded-lg ${accent ? 'bg-copper-clay/10' : 'bg-soft-sand'}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-20" />
        ) : (
          <>
            <div className={`text-4xl font-bold ${accent ? 'text-copper-clay' : 'text-ironwood'}`}>
              {value}
            </div>
            {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Alert Banner ────────────────────────────────────────── */

type AlertBannerProps = {
  actionItems: ActionQueueItem[];
};

export function AlertBanner({ actionItems }: AlertBannerProps) {
  const newItems = actionItems.filter((i) => i.workflow_status === 'new' && i.action_required);
  if (!newItems.length) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-copper-clay/30 bg-copper-clay/5">
      <AlertTriangle className="h-4 w-4 text-copper-clay mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ironwood">
          {newItems.length} call{newItems.length > 1 ? 's' : ''} need{newItems.length === 1 ? 's' : ''} attention
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {newItems[0].label}{newItems.length > 1 ? ` and ${newItems.length - 1} more` : ''}
        </p>
      </div>
      <Link
        to="/calls"
        className="text-xs font-medium text-copper-clay hover:underline shrink-0 flex items-center gap-1"
      >
        Review <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

/* ── Intent badge helper ─────────────────────────────────── */

function intentLabel(intent: string): string {
  if (!intent) return 'General';
  return intent
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityVariant(p: string): 'default' | 'accent' | 'destructive' | 'success' | 'secondary' {
  if (p === 'high') return 'destructive';
  if (p === 'medium') return 'accent';
  return 'success';
}

/* ── Recent Calls List ───────────────────────────────────── */

type RecentCallsListProps = {
  calls: CallSessionRecord[];
  isLoading: boolean;
};

export function RecentCallsList({ calls, isLoading }: RecentCallsListProps) {
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <p className="text-xs font-medium text-deep-eucalypt uppercase tracking-wider">Activity</p>
          <CardTitle className="text-base mt-0.5">Recent calls</CardTitle>
        </div>
        <Link
          to="/calls"
          className="text-xs font-medium text-copper-clay hover:underline flex items-center gap-1"
        >
          All calls <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 pb-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No calls yet — make a test call in the{' '}
            <Link to="/lab" className="text-copper-clay hover:underline font-medium">
              Call Lab
            </Link>{' '}
            to see data here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {calls.map((call) => (
              <li key={call.call_sid}>
                <Link
                  to={`/calls/${call.call_sid}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-soft-sand/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-deep-eucalypt/10 flex items-center justify-center shrink-0">
                    <Phone className="h-3.5 w-3.5 text-deep-eucalypt" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ironwood truncate">
                      {call.caller_name || call.from_number || 'Unknown caller'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {call.status_summary || intentLabel(call.captured_intent)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={priorityVariant(call.priority)} className="text-xs">
                      {intentLabel(call.captured_intent)}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Savings Card ────────────────────────────────────────── */

type SavingsCardProps = {
  savingsEstimate: number;
  callsHandled: number;
  isLoading: boolean;
};

export function SavingsCard({ savingsEstimate, callsHandled, isLoading }: SavingsCardProps) {
  return (
    <Card className="bg-ironwood text-white border-ironwood">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-sage-mist uppercase tracking-wider">Savings estimate</p>
          <TrendingUp className="h-4 w-4 text-copper-clay" />
        </div>
        <CardTitle className="text-white text-base mt-0.5">Receptionist time saved</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-32 bg-white/10" />
        ) : (
          <>
            <div className="text-4xl font-bold text-copper-clay">
              ${savingsEstimate.toLocaleString()}
            </div>
            <p className="text-xs text-white/60 mt-1">
              Based on {callsHandled} calls × 8 min avg × $0.75/min receptionist rate
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Action Queue Card ───────────────────────────────────── */

type ActionQueueCardProps = {
  items: ActionQueueItem[];
  isLoading: boolean;
};

export function ActionQueueCard({ items, isLoading }: ActionQueueCardProps) {
  const pendingItems = items.filter((i) => i.workflow_status === 'new');

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <p className="text-xs font-medium text-deep-eucalypt uppercase tracking-wider">Queue</p>
          <CardTitle className="text-base mt-0.5">Action items</CardTitle>
        </div>
        {pendingItems.length > 0 && (
          <Badge variant="accent" className="text-xs">
            {pendingItems.length} new
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 pb-6 space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : pendingItems.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-sage-mist" />
            All caught up — no pending actions.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {pendingItems.slice(0, 5).map((item) => (
              <li key={item.item_id} className="px-6 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ironwood truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.summary}</p>
                  </div>
                  <Badge variant={priorityVariant(item.priority)} className="text-xs shrink-0">
                    {item.priority}
                  </Badge>
                </div>
              </li>
            ))}
            {pendingItems.length > 5 && (
              <li className="px-6 py-3">
                <Link to="/calls" className="text-xs text-copper-clay hover:underline font-medium">
                  +{pendingItems.length - 5} more — view all
                </Link>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Stat row (small quick-stats) ────────────────────────── */

type QuickStatsProps = {
  escalations: number;
  faqsAnswered: number;
  isLoading: boolean;
};

export function QuickStats({ escalations, faqsAnswered, isLoading }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-white">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Escalated</p>
              {isLoading ? (
                <Skeleton className="h-7 w-10 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-ironwood mt-0.5">{escalations}</p>
              )}
            </div>
            <AlertTriangle className="h-5 w-5 text-copper-clay/60" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">FAQs answered</p>
              {isLoading ? (
                <Skeleton className="h-7 w-10 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-ironwood mt-0.5">{faqsAnswered}</p>
              )}
            </div>
            <MessageSquare className="h-5 w-5 text-deep-eucalypt/60" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
