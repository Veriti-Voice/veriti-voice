import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  CheckCircle,
  Loader2,
  Copy,
  Check,
  Phone,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { demoApi } from '@/lib/api';
import type { SetupProfile, Practitioner } from '@/lib/api';
import type { OnboardingFormData } from './use-onboarding-state';

type StepProps = {
  formData: OnboardingFormData;
  updateForm: (patch: Partial<OnboardingFormData>) => void;
};

/* ── Step 1: Practice basics ─────────────────────────────── */

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Hobart',
  'Pacific/Auckland',
];

export function PracticeBasicsStep({ formData, updateForm }: StepProps) {
  const [profile, setProfile] = useState<SetupProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    demoApi
      .getSetupProfile()
      .then((p) => {
        setProfile(p);
        if (!formData.clinicName && p.clinic_name) {
          updateForm({
            clinicName: p.clinic_name,
            fallbackNumber: p.fallback_number,
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          {profile && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-deep-eucalypt/5 border border-deep-eucalypt/15">
              <CheckCircle className="h-4 w-4 text-deep-eucalypt shrink-0" />
              <p className="text-sm text-deep-eucalypt">Clinic profile loaded from your account.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="clinic-name">Clinic name</Label>
            <Input
              id="clinic-name"
              value={formData.clinicName}
              onChange={(e) => updateForm({ clinicName: e.target.value })}
              placeholder="e.g. Southside Allied Health"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => updateForm({ timezone: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('Australia/', '').replace('Pacific/', '')}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fallback">Fallback number (calls when AI can't help)</Label>
            <Input
              id="fallback"
              value={formData.fallbackNumber}
              onChange={(e) => updateForm({ fallbackNumber: e.target.value })}
              placeholder="+61 4xx xxx xxx"
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ── Step 2: Connect Cliniko ─────────────────────────────── */

export function ConnectClinikoStep({ formData, updateForm }: StepProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  function handleCheck() {
    setIsChecking(true);
    demoApi
      .getClinikoStatus()
      .then((status) => {
        const connected = status.configured;
        updateForm({ clinikoConnected: connected });
        setChecked(true);
      })
      .finally(() => setIsChecking(false));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Connect your Cliniko account so the AI can read availability and create bookings in real time.
      </p>

      <div className="rounded-xl border border-border bg-soft-sand p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center text-sm font-bold text-ironwood">
            C
          </div>
          <div>
            <p className="text-sm font-medium text-ironwood">Cliniko</p>
            <p className="text-xs text-muted-foreground">Practice management software</p>
          </div>
          {formData.clinikoConnected ? (
            <Badge variant="success" className="ml-auto">Connected</Badge>
          ) : checked ? (
            <Badge variant="secondary" className="ml-auto">Not configured</Badge>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          className="w-full h-9 rounded-md bg-ironwood text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-ironwood/90 transition-colors disabled:opacity-50"
        >
          {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isChecking ? 'Checking connection...' : 'Verify Cliniko connection'}
        </button>
      </div>

      {formData.clinikoConnected && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-deep-eucalypt/5 border border-deep-eucalypt/20">
          <CheckCircle className="h-4 w-4 text-deep-eucalypt mt-0.5 shrink-0" />
          <p className="text-sm text-deep-eucalypt">
            Cliniko connected — the AI can access your live schedule and book appointments.
          </p>
        </div>
      )}

      {checked && !formData.clinikoConnected && (
        <p className="text-sm text-muted-foreground">
          No Cliniko API key found. The AI will still work in demo mode without live booking access.
          You can skip this step and set it up later in Settings.
        </p>
      )}
    </div>
  );
}

/* ── Step 3: Review practitioners ────────────────────────── */

export function ReviewPractitionersStep({ formData, updateForm }: StepProps) {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    demoApi
      .getPractitioners()
      .then((list) => {
        setPractitioners(list);
        if (formData.activePractitioners.length === 0) {
          updateForm({ activePractitioners: list.map((p) => p.practitioner_id) });
        }
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    const current = formData.activePractitioners;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updateForm({ activePractitioners: next });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select which practitioners the AI should offer when booking appointments.
      </p>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : practitioners.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No practitioners found. Add them in Cliniko and they'll appear here automatically.
        </p>
      ) : (
        <ul className="space-y-2">
          {practitioners.map((p) => {
            const active = formData.activePractitioners.includes(p.practitioner_id);
            return (
              <li key={p.practitioner_id}>
                <button
                  type="button"
                  onClick={() => toggle(p.practitioner_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                    active
                      ? 'border-deep-eucalypt/30 bg-deep-eucalypt/5'
                      : 'border-border bg-white hover:border-slate-fog'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-deep-eucalypt/10 flex items-center justify-center text-sm font-semibold text-deep-eucalypt shrink-0">
                    {p.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ironwood">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.speciality}</p>
                  </div>
                  {active ? (
                    <ToggleRight className="h-5 w-5 text-deep-eucalypt shrink-0" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── Step 4: Set hours ───────────────────────────────────── */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function SetHoursStep({ formData, updateForm }: StepProps) {
  function toggle(day: string) {
    updateForm({
      hoursEnabled: { ...formData.hoursEnabled, [day]: !formData.hoursEnabled[day] },
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which days the AI receptionist is active. Calls on inactive days go straight to your fallback number.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {DAYS.map((day) => {
          const enabled = formData.hoursEnabled[day] ?? false;
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                enabled
                  ? 'border-deep-eucalypt/30 bg-deep-eucalypt/5'
                  : 'border-border bg-white hover:border-slate-fog'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${enabled ? 'text-ironwood' : 'text-muted-foreground'}`}>
                  {day}
                </span>
                {enabled && (
                  <span className="text-xs text-deep-eucalypt">8:00 am – 6:00 pm</span>
                )}
              </div>
              {enabled ? (
                <ToggleRight className="h-5 w-5 text-deep-eucalypt" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 5: FAQs ────────────────────────────────────────── */

export function AddFaqsStep({ formData, updateForm }: StepProps) {
  function toggle(id: string) {
    updateForm({
      faqs: formData.faqs.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    });
  }

  const enabled = formData.faqs.filter((f) => f.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Enable the FAQs your AI should know how to answer.
        </p>
        <Badge variant="secondary" className="text-xs">
          {enabled} active
        </Badge>
      </div>
      <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {formData.faqs.map((faq) => (
          <li key={faq.id}>
            <button
              type="button"
              onClick={() => toggle(faq.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                faq.enabled
                  ? 'border-deep-eucalypt/30 bg-deep-eucalypt/5'
                  : 'border-border bg-white hover:border-slate-fog'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {faq.enabled ? (
                  <ToggleRight className="h-5 w-5 text-deep-eucalypt" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${faq.enabled ? 'text-ironwood' : 'text-muted-foreground'}`}>
                  {faq.question}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{faq.answer}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Step 6: Call forwarding ─────────────────────────────── */

const CARRIERS = [
  { id: 'telstra', label: 'Telstra' },
  { id: 'optus', label: 'Optus' },
  { id: 'vodafone', label: 'Vodafone' },
  { id: 'tpg', label: 'TPG' },
  { id: 'other', label: 'Other carrier' },
];

const FORWARD_NUMBER = '+61 488 123 456'; // demo number

export function CallForwardingStep({ formData, updateForm }: StepProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(FORWARD_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Forward your clinic's phone number to the Veriti Voice line. Your carrier will have a menu or
        app for this — most take under a minute.
      </p>

      <div className="space-y-2">
        <Label>Your carrier</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CARRIERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => updateForm({ carrier: c.id })}
              className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                formData.carrier === c.id
                  ? 'border-ironwood bg-ironwood text-white'
                  : 'border-border bg-white text-ironwood hover:border-deep-eucalypt'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Forward to this number</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 rounded-md border border-border bg-soft-sand px-3 flex items-center text-sm font-mono text-ironwood">
            {FORWARD_NUMBER}
          </div>
          <button
            type="button"
            onClick={copy}
            className="h-9 px-3 rounded-md border border-border bg-white hover:bg-soft-sand transition-colors flex items-center gap-1.5 text-sm text-ironwood"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-deep-eucalypt" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {formData.carrier && (
        <div className="rounded-xl border border-border bg-soft-sand p-4 text-sm space-y-1.5">
          <p className="font-medium text-ironwood">
            {formData.carrier === 'telstra' ? 'Telstra' :
             formData.carrier === 'optus' ? 'Optus' :
             formData.carrier === 'vodafone' ? 'Vodafone' :
             formData.carrier === 'tpg' ? 'TPG' : 'Your carrier'} instructions
          </p>
          <p className="text-muted-foreground">
            {formData.carrier === 'telstra'
              ? 'Dial *21*[number]# to enable unconditional forwarding. Or use the My Telstra app → Settings → Call Forwarding.'
              : formData.carrier === 'optus'
              ? 'Dial **21*[number]# to set call forwarding. Or log into the My Optus app → Account → Services → Call Forwarding.'
              : formData.carrier === 'vodafone'
              ? 'Dial *21*[number]# or use the My Vodafone app → Plan → Call Settings → Call Divert.'
              : 'Contact your carrier or check their app to set up unconditional call forwarding to the number above.'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => updateForm({ callForwardingSet: !formData.callForwardingSet })}
        className={`w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
          formData.callForwardingSet
            ? 'border-deep-eucalypt/30 bg-deep-eucalypt/5 text-deep-eucalypt'
            : 'border-border bg-white text-ironwood hover:border-deep-eucalypt'
        }`}
      >
        {formData.callForwardingSet ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
        {formData.callForwardingSet ? 'Call forwarding is set up' : "Mark as done when you've set it up"}
      </button>
    </div>
  );
}

/* ── Step 7: Test call ───────────────────────────────────── */

export function TestCallStep({ formData, updateForm }: StepProps) {
  const checklist = [
    { label: 'AI answers within 2 rings', done: formData.testCallDone },
    { label: 'Voice sounds natural and clear', done: formData.testCallDone },
    { label: 'Booking flow works end-to-end', done: formData.testCallDone },
    { label: 'Handoff to human works if needed', done: formData.testCallDone },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Run a test call in the Call Lab to make sure everything is working before you go live.
      </p>

      <Link
        to="/lab"
        className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-copper-clay text-white text-sm font-medium hover:bg-copper-clay/90 transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        Open Call Lab
      </Link>

      <div className="space-y-2">
        {checklist.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
              item.done ? 'border-deep-eucalypt/20 bg-deep-eucalypt/5' : 'border-border bg-white'
            }`}
          >
            <CheckCircle
              className={`h-4 w-4 shrink-0 ${item.done ? 'text-deep-eucalypt' : 'text-muted-foreground/30'}`}
            />
            <span className={`text-sm ${item.done ? 'text-ironwood' : 'text-muted-foreground'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => updateForm({ testCallDone: !formData.testCallDone })}
        className={`w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
          formData.testCallDone
            ? 'border-deep-eucalypt/30 bg-deep-eucalypt/5 text-deep-eucalypt'
            : 'border-border bg-white text-ironwood hover:border-deep-eucalypt'
        }`}
      >
        {formData.testCallDone ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
        {formData.testCallDone ? 'Test call passed' : 'Mark test call as done'}
      </button>
    </div>
  );
}

/* ── Step 8: Go live ─────────────────────────────────────── */

export function GoLiveStep({ formData, updateForm }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-deep-eucalypt/10 flex items-center justify-center mx-auto">
          <Phone className="h-7 w-7 text-deep-eucalypt" />
        </div>
        <h3 className="text-lg font-semibold text-ironwood">Ready to go live</h3>
        <p className="text-sm text-muted-foreground">
          Your AI receptionist is configured and ready to handle real calls.
        </p>
      </div>

      <Card className="border-copper-clay/20">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-2 text-sm">
            {[
              { label: 'Clinic', value: formData.clinicName || 'Not set' },
              {
                label: 'Active days',
                value: Object.entries(formData.hoursEnabled)
                  .filter(([, v]) => v)
                  .map(([k]) => k.slice(0, 3))
                  .join(', '),
              },
              {
                label: 'FAQs active',
                value: `${formData.faqs.filter((f) => f.enabled).length} enabled`,
              },
              {
                label: 'Practitioners',
                value: `${formData.activePractitioners.length} selected`,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-ironwood">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => updateForm({ goLiveConfirmed: !formData.goLiveConfirmed })}
        className={`w-full flex items-center gap-3 justify-center px-6 py-4 rounded-xl border-2 text-base font-semibold transition-all ${
          formData.goLiveConfirmed
            ? 'border-deep-eucalypt bg-deep-eucalypt text-white shadow-lg shadow-deep-eucalypt/20'
            : 'border-copper-clay bg-copper-clay text-white hover:bg-copper-clay/90'
        }`}
      >
        {formData.goLiveConfirmed ? (
          <>
            <CheckCircle className="h-5 w-5" />
            Live — AI is answering calls
          </>
        ) : (
          <>
            <Phone className="h-5 w-5" />
            Activate AI receptionist
          </>
        )}
      </button>

      {formData.goLiveConfirmed && (
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-deep-eucalypt">You're live!</p>
          <p className="text-xs text-muted-foreground">
            Your AI receptionist is now handling calls. Visit the dashboard to see activity.
          </p>
        </div>
      )}
    </div>
  );
}
