import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { demoApi } from '@/lib/api';
import type { SetupProfile, ClinikoStatus, TwilioStatus } from '@/lib/api';

/* ── Shared ─────────────────────────────────────────────── */

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium text-deep-eucalypt uppercase tracking-wider">{label}</p>
      <h2 className="text-lg font-semibold text-ironwood mt-0.5">{title}</h2>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-ironwood">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
          checked ? 'bg-deep-eucalypt' : 'bg-slate-fog'
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/* ── Clinic Profile tab ──────────────────────────────────── */

export function ClinicProfileTab() {
  const [profile, setProfile] = useState<SetupProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ clinic_name: '', fallback_number: '', welcome_message: '' });

  useEffect(() => {
    demoApi
      .getSetupProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          clinic_name: p.clinic_name,
          fallback_number: p.fallback_number,
          welcome_message: p.welcome_message,
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  function save() {
    if (!profile) return;
    setIsSaving(true);
    const updated = { ...profile, ...form };
    demoApi
      .updateSetupProfile(updated)
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .finally(() => setIsSaving(false));
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-md">
      <SectionHeader label="Settings" title="Clinic profile" />

      <div className="space-y-1.5">
        <Label htmlFor="s-clinic-name">Clinic name</Label>
        <Input
          id="s-clinic-name"
          value={form.clinic_name}
          onChange={(e) => setForm((f) => ({ ...f, clinic_name: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="s-fallback">Fallback number</Label>
        <Input
          id="s-fallback"
          value={form.fallback_number}
          onChange={(e) => setForm((f) => ({ ...f, fallback_number: e.target.value }))}
          placeholder="+61 4xx xxx xxx"
        />
        <p className="text-xs text-muted-foreground">Calls are routed here when the AI cannot help.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="s-welcome">Welcome message</Label>
        <textarea
          id="s-welcome"
          value={form.welcome_message}
          onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
          rows={3}
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground">What the AI says when it picks up the phone.</p>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-copper-clay text-white text-sm font-medium hover:bg-copper-clay/90 transition-colors disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? 'Saved' : isSaving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}

/* ── Voice Agent tab ─────────────────────────────────────── */

export function VoiceAgentTab() {
  const [profile, setProfile] = useState<SetupProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    demoApi
      .getSetupProfile()
      .then(setProfile)
      .finally(() => setIsLoading(false));
  }, []);

  function updateToggle(key: keyof SetupProfile, value: boolean) {
    if (!profile) return;
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    void demoApi.updateSetupProfile(updated);
  }

  if (isLoading || !profile) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <SectionHeader label="Settings" title="Voice agent capabilities" />
      <Card className="bg-white">
        <CardContent className="pt-4 pb-0">
          <Toggle
            label="New bookings"
            description="Allow the AI to book new appointments"
            checked={profile.allow_new_bookings}
            onChange={(v) => updateToggle('allow_new_bookings', v)}
          />
          <Toggle
            label="Reschedules"
            description="Allow the AI to move existing appointments"
            checked={profile.allow_reschedules}
            onChange={(v) => updateToggle('allow_reschedules', v)}
          />
          <Toggle
            label="Cancellations"
            description="Allow the AI to cancel appointments"
            checked={profile.allow_cancellations}
            onChange={(v) => updateToggle('allow_cancellations', v)}
          />
          <Toggle
            label="Late arrival capture"
            description="Ask callers how late they expect to be"
            checked={profile.capture_late_arrivals}
            onChange={(v) => updateToggle('capture_late_arrivals', v)}
          />
          <Toggle
            label="Practitioner routing"
            description="Help callers choose the right practitioner"
            checked={profile.routing_support_enabled}
            onChange={(v) => updateToggle('routing_support_enabled', v)}
          />
          <Toggle
            label="SMS confirmations"
            description="Send a text confirmation after bookings"
            checked={profile.sms_confirmations_enabled}
            onChange={(v) => updateToggle('sms_confirmations_enabled', v)}
          />
          <Toggle
            label="After hours handling"
            description="The AI picks up outside normal hours"
            checked={profile.after_hours_enabled}
            onChange={(v) => updateToggle('after_hours_enabled', v)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Integrations tab ────────────────────────────────────── */

function IntegrationCard({
  name,
  description,
  status,
  isLoading,
  notes,
}: {
  name: string;
  description: string;
  status: 'connected' | 'partial' | 'not-configured';
  isLoading: boolean;
  notes?: string[];
}) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <Badge
              variant={status === 'connected' ? 'success' : status === 'partial' ? 'accent' : 'secondary'}
            >
              {status === 'connected' ? 'Connected' : status === 'partial' ? 'Partial' : 'Not configured'}
            </Badge>
          )}
        </div>
      </CardHeader>
      {notes && notes.length > 0 && (
        <CardContent className="pt-0">
          <ul className="space-y-1">
            {notes.map((note, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-0.5 shrink-0">·</span>
                {note}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

export function IntegrationsTab() {
  const [clinikoStatus, setClinikoStatus] = useState<ClinikoStatus | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([demoApi.getClinikoStatus(), demoApi.getTwilioStatus()])
      .then(([c, t]) => {
        setClinikoStatus(c);
        setTwilioStatus(t);
      })
      .finally(() => setIsLoading(false));
  }, []);

  function clinikoConnectionStatus(): 'connected' | 'partial' | 'not-configured' {
    if (!clinikoStatus) return 'not-configured';
    if (clinikoStatus.configured && clinikoStatus.write_enabled) return 'connected';
    if (clinikoStatus.configured) return 'partial';
    return 'not-configured';
  }

  function twilioConnectionStatus(): 'connected' | 'partial' | 'not-configured' {
    if (!twilioStatus) return 'not-configured';
    if (twilioStatus.ready_for_live_calls) return 'connected';
    if (twilioStatus.phone_number) return 'partial';
    return 'not-configured';
  }

  return (
    <div className="space-y-4 max-w-lg">
      <SectionHeader label="Settings" title="Integrations" />
      <IntegrationCard
        name="Cliniko"
        description="Practice management — bookings, practitioners, availability"
        status={clinikoConnectionStatus()}
        isLoading={isLoading}
        notes={clinikoStatus?.notes}
      />
      <IntegrationCard
        name="Twilio"
        description="Telephony — inbound call handling and media streaming"
        status={twilioConnectionStatus()}
        isLoading={isLoading}
        notes={twilioStatus?.notes}
      />
    </div>
  );
}

/* ── Advanced tab ────────────────────────────────────────── */

export function AdvancedTab() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  function handleReset() {
    if (!confirm('Reset all demo data? This will clear call sessions, payloads, and queue items.')) return;
    setIsResetting(true);
    demoApi
      .resetDemoState()
      .then(() => {
        setResetDone(true);
        setTimeout(() => setResetDone(false), 3000);
      })
      .finally(() => setIsResetting(false));
  }

  return (
    <div className="space-y-6 max-w-lg">
      <SectionHeader label="Settings" title="Advanced" />

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Demo data</CardTitle>
          <p className="text-xs text-muted-foreground">
            Clear all call sessions, stub payloads, and queue items to start fresh.
          </p>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resetDone ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {resetDone ? 'Demo data cleared' : isResetting ? 'Clearing...' : 'Clear demo data'}
          </button>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cliniko mode</CardTitle>
          <p className="text-xs text-muted-foreground">
            Switch between stub mode (safe for demos) and live mode (real Cliniko API calls).
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">stub</Badge>
            <p className="text-xs text-muted-foreground">
              Set via <code className="bg-soft-sand px-1 rounded text-ironwood">VERITI_CLINIKO_MODE=live</code> environment variable on the API server.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
