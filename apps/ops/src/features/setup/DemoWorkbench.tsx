import { FormEvent, useEffect, useState } from 'react';

import {
  API_BASE_URL,
  ActionQueueItem,
  AppointmentType,
  AvailabilitySlot,
  BookingPreview,
  CallSessionRecord,
  ClinikoStatus,
  Practitioner,
  SetupProfile,
  StubPayloadRecord,
  TwilioStatus,
  demoApi,
} from '../../lib/api';

type DemoWorkbenchProps = {
  onDataChanged?: () => void;
};

type BookingFormState = {
  clinicKey: string;
  mode: string;
  patientName: string;
  patientPhone: string;
  practitionerId: string;
  appointmentTypeId: string;
  startsAt: string;
};

type DebugEvent = {
  type: string;
  payload: unknown;
};

type ScenarioOption = {
  id:
    | 'new_booking'
    | 'reschedule'
    | 'cancel_and_reschedule'
    | 'late_arrival'
    | 'who_should_i_see'
    | 'callback_request';
  label: string;
};

const initialBookingFormState: BookingFormState = {
  clinicKey: 'demo-clinic',
  mode: 'stub',
  patientName: 'Taylor Morgan',
  patientPhone: '+61412345678',
  practitionerId: '',
  appointmentTypeId: '',
  startsAt: '',
};

const scenarioOptions: ScenarioOption[] = [
  { id: 'new_booking', label: 'Simulate new booking' },
  { id: 'reschedule', label: 'Simulate reschedule' },
  { id: 'cancel_and_reschedule', label: 'Simulate cancel + callback' },
  { id: 'late_arrival', label: 'Simulate late arrival' },
  { id: 'who_should_i_see', label: 'Simulate routing advice' },
  { id: 'callback_request', label: 'Simulate callback request' },
];

export function DemoWorkbench({ onDataChanged }: DemoWorkbenchProps) {
  const [setupProfile, setSetupProfile] = useState<SetupProfile | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [clinikoStatus, setClinikoStatus] = useState<ClinikoStatus | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null);
  const [preview, setPreview] = useState<BookingPreview | null>(null);
  const [stubPayloads, setStubPayloads] = useState<StubPayloadRecord[]>([]);
  const [callSessions, setCallSessions] = useState<CallSessionRecord[]>([]);
  const [priorityQueue, setPriorityQueue] = useState<ActionQueueItem[]>([]);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSetup, setSavingSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [runningDebugCall, setRunningDebugCall] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormState>(initialBookingFormState);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [profile, practitionerData, appointmentTypeData, availabilityData] =
          await Promise.all([
            demoApi.getSetupProfile(),
            demoApi.getPractitioners(),
            demoApi.getAppointmentTypes(),
            demoApi.getAvailability(),
          ]);
        const [clinikoState, twilioState] = await Promise.all([
          demoApi.getClinikoStatus(),
          demoApi.getTwilioStatus(),
        ]);

        if (cancelled) {
          return;
        }

        setSetupProfile(profile);
        setPractitioners(practitionerData);
        setAppointmentTypes(appointmentTypeData);
        setAvailability(availabilityData);
        setClinikoStatus(clinikoState);
        setTwilioStatus(twilioState);
        setBookingForm((current) => ({
          ...current,
          clinicKey: profile.clinic_key,
          mode: profile.cliniko_mode,
          practitionerId: current.practitionerId || practitionerData[0]?.practitioner_id || '',
          appointmentTypeId:
            current.appointmentTypeId || appointmentTypeData[0]?.appointment_type_id || '',
          startsAt: current.startsAt || availabilityData[0]?.starts_at || '',
        }));
        await refreshRecords(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load demo data.');
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
  }, []);

  async function refreshRecords(notify = true) {
    const [payloadData, callSessionData, queueData, clinikoState, twilioState] = await Promise.all([
      demoApi.getStubPayloads(),
      demoApi.getCallSessions(),
      demoApi.getActionQueue(),
      demoApi.getClinikoStatus(),
      demoApi.getTwilioStatus(),
    ]);
    setStubPayloads(payloadData);
    setCallSessions(callSessionData);
    setPriorityQueue(queueData);
    setClinikoStatus(clinikoState);
    setTwilioStatus(twilioState);
    if (notify) {
      onDataChanged?.();
    }
  }

  async function handleSetupSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setupProfile) {
      return;
    }

    try {
      setSavingSetup(true);
      setError(null);
      const saved = await demoApi.updateSetupProfile(setupProfile);
      setSetupProfile(saved);
      setBookingForm((current) => ({ ...current, mode: saved.cliniko_mode }));
      await refreshRecords();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save setup profile.');
    } finally {
      setSavingSetup(false);
    }
  }

  async function handleBookingPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      const result = await demoApi.createBookingPreview({
        clinic_key: bookingForm.clinicKey,
        patient_name: bookingForm.patientName,
        patient_phone: bookingForm.patientPhone,
        practitioner_id: bookingForm.practitionerId,
        appointment_type_id: bookingForm.appointmentTypeId,
        starts_at: bookingForm.startsAt,
        mode: bookingForm.mode,
      });
      setPreview(result);
      await refreshRecords();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to create booking preview.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScenarioRun(scenario: ScenarioOption['id']) {
    try {
      setRunningScenario(scenario);
      setError(null);
      await demoApi.simulateCall({
        scenario,
        caller_name: bookingForm.patientName,
        phone_number: bookingForm.patientPhone,
      });
      await refreshRecords();
    } catch (scenarioError) {
      setError(
        scenarioError instanceof Error ? scenarioError.message : 'Failed to simulate call.'
      );
    } finally {
      setRunningScenario(null);
    }
  }

  async function handleReset() {
    try {
      setError(null);
      await demoApi.resetDemoState();
      setPreview(null);
      setDebugEvents([]);
      const profile = await demoApi.getSetupProfile();
      setSetupProfile(profile);
      setBookingForm((current) => ({
        ...current,
        clinicKey: profile.clinic_key,
        mode: profile.cliniko_mode,
      }));
      await refreshRecords();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset demo state.');
    }
  }

  async function handleDebugCall() {
    try {
      setRunningDebugCall(true);
      setError(null);
      setDebugEvents([]);

      const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
      const wsBase = API_BASE_URL.replace(/^https?/, protocol);
      const callSid = `debug-${Date.now()}`;
      const websocket = new WebSocket(
        `${wsBase}/ws/media?callSid=${encodeURIComponent(callSid)}&clinic=${encodeURIComponent(
          bookingForm.clinicKey
        )}&debug=1`
      );

      const dummyAudio = new Uint8Array(160);
      const mediaPayload = btoa(String.fromCharCode(...dummyAudio));

      await new Promise<void>((resolve, reject) => {
        websocket.onmessage = (message) => {
          const parsed = JSON.parse(message.data) as Record<string, unknown>;
          setDebugEvents((current) => [...current, { type: String(parsed.type), payload: parsed }]);

          if (parsed.type === 'session_bootstrapped') {
            websocket.send(
              JSON.stringify({
                event: 'start',
                streamSid: 'debug-stream-001',
                start: { streamSid: 'debug-stream-001' },
              })
            );
            websocket.send(
              JSON.stringify({
                event: 'media',
                streamSid: 'debug-stream-001',
                media: { payload: mediaPayload },
              })
            );
            websocket.send(
              JSON.stringify({
                event: 'stop',
                streamSid: 'debug-stream-001',
                stop: { reason: 'debug-complete' },
              })
            );
          }

          if (parsed.type === 'stream_stopped') {
            websocket.close();
            resolve();
          }
        };

        websocket.onerror = () => {
          reject(new Error('Debug media session failed.'));
        };
      });

      await refreshRecords();
    } catch (debugError) {
      setError(debugError instanceof Error ? debugError.message : 'Failed to run debug call.');
    } finally {
      setRunningDebugCall(false);
    }
  }

  const setupCompletion = buildSetupCompletion(setupProfile);

  return (
    <article className="card card-wide ops-studio-card">
      <p className="card-kicker">Clinic Ops Studio</p>
      <h2>Tune the clinic setup without cluttering the call view</h2>
      <p className="card-copy">
        This is the operator layer: setup, seeded availability, payload previews, and debug tools.
        The live call stays up top.
      </p>

      <div className="ops-overview-grid">
        <div className="step-pill">
          <strong>Clinic setup</strong>
          <span>{setupCompletion.label}</span>
        </div>
        <div className="step-pill">
          <strong>Queue backlog</strong>
          <span>{priorityQueue.length} items ready for review</span>
        </div>
        <div className="step-pill">
          <strong>Payload capture</strong>
          <span>{stubPayloads.length} stored artifacts</span>
        </div>
      </div>

      {loading ? <p>Loading demo clinic…</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      {setupProfile ? (
        <>
          <div className="meta-grid">
            <div className="meta-pill">
              <span>Clinic</span>
              <strong>{setupProfile.clinic_name}</strong>
            </div>
            <div className="meta-pill">
              <span>Mode</span>
              <strong>{setupProfile.cliniko_mode}</strong>
            </div>
            <div className="meta-pill">
              <span>Fallback</span>
              <strong>{setupProfile.fallback_number}</strong>
            </div>
            {clinikoStatus ? (
              <div className="meta-pill">
                <span>Cliniko</span>
                <strong>
                  {clinikoStatus.mode} · {clinikoStatus.configured ? 'configured' : 'not ready'}
                </strong>
              </div>
            ) : null}
            {twilioStatus ? (
              <div className="meta-pill">
                <span>Twilio</span>
                <strong>{twilioStatus.ready_for_live_calls ? 'demo ready' : 'setup needed'}</strong>
              </div>
            ) : null}
          </div>

          <div className="ops-status-grid">
            {twilioStatus ? (
              <section className="subcard">
                <div className="preview-header">
                  <div>
                    <p className="card-kicker">Twilio</p>
                    <h3>Live call readiness</h3>
                  </div>
                  <span
                    className={`priority ${
                      twilioStatus.ready_for_live_calls ? 'priority-low' : 'priority-medium'
                    }`}
                  >
                    {twilioStatus.ready_for_live_calls ? 'ready' : 'not ready'}
                  </span>
                </div>
                <p className="card-copy">
                  {twilioStatus.ready_for_live_calls
                    ? `Inbound calls can be pointed to ${twilioStatus.voice_webhook_url}.`
                    : 'Still local-only until the number and public HTTPS webhook are configured.'}
                </p>
                <div className="record-stack compact-records">
                  <pre>{twilioStatus.voice_webhook_url}</pre>
                  <pre>{twilioStatus.media_stream_websocket_url}</pre>
                </div>
              </section>
            ) : null}

            {clinikoStatus ? (
              <section className="subcard">
                <div className="preview-header">
                  <div>
                    <p className="card-kicker">Cliniko</p>
                    <h3>Data mode</h3>
                  </div>
                  <span
                    className={`priority ${
                      clinikoStatus.configured ? 'priority-low' : 'priority-medium'
                    }`}
                  >
                    {clinikoStatus.mode}
                  </span>
                </div>
                <p className="card-copy">
                  {clinikoStatus.configured
                    ? `Connected to ${clinikoStatus.base_url || 'the seeded clinic world'}.`
                    : 'Using stub mode or waiting on live credentials.'}
                </p>
                {clinikoStatus.notes.length ? (
                  <div className="record-stack compact-records">
                    {clinikoStatus.notes.map((note) => (
                      <pre key={note}>{note}</pre>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="ops-studio-grid">
            <div className="ops-studio-main">
              <section className="subcard">
                <div className="preview-header">
                  <div>
                    <p className="card-kicker">Setup</p>
                    <h3>Clinic setup profile</h3>
                  </div>
                  <span className="priority priority-low">{setupCompletion.percent}% complete</span>
                </div>
                <form className="setup-form" onSubmit={handleSetupSave}>
                  <div className="form-grid">
                    <label>
                      Clinic name
                      <input
                        value={setupProfile.clinic_name}
                        onChange={(event) =>
                          setSetupProfile({ ...setupProfile, clinic_name: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      Fallback number
                      <input
                        value={setupProfile.fallback_number}
                        onChange={(event) =>
                          setSetupProfile({ ...setupProfile, fallback_number: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      Cliniko mode
                      <select
                        value={setupProfile.cliniko_mode}
                        onChange={(event) =>
                          setSetupProfile({ ...setupProfile, cliniko_mode: event.target.value })
                        }
                      >
                        <option value="stub">Stub Cliniko</option>
                        <option value="live">Live Cliniko later</option>
                      </select>
                    </label>

                    <label>
                      Welcome message
                      <input
                        value={setupProfile.welcome_message}
                        onChange={(event) =>
                          setSetupProfile({ ...setupProfile, welcome_message: event.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className="toggle-grid">
                    <ToggleField
                      label="Allow new bookings"
                      checked={setupProfile.allow_new_bookings}
                      onChange={(checked) =>
                        setSetupProfile({ ...setupProfile, allow_new_bookings: checked })
                      }
                    />
                    <ToggleField
                      label="Allow reschedules"
                      checked={setupProfile.allow_reschedules}
                      onChange={(checked) =>
                        setSetupProfile({ ...setupProfile, allow_reschedules: checked })
                      }
                    />
                    <ToggleField
                      label="Allow cancellations"
                      checked={setupProfile.allow_cancellations}
                      onChange={(checked) =>
                        setSetupProfile({ ...setupProfile, allow_cancellations: checked })
                      }
                    />
                    <ToggleField
                      label="Capture late arrivals"
                      checked={setupProfile.capture_late_arrivals}
                      onChange={(checked) =>
                        setSetupProfile({ ...setupProfile, capture_late_arrivals: checked })
                      }
                    />
                    <ToggleField
                      label="Routing advice"
                      checked={setupProfile.routing_support_enabled}
                      onChange={(checked) =>
                        setSetupProfile({ ...setupProfile, routing_support_enabled: checked })
                      }
                    />
                    <ToggleField
                      label="SMS confirmations"
                      checked={setupProfile.sms_confirmations_enabled}
                      onChange={(checked) =>
                        setSetupProfile({ ...setupProfile, sms_confirmations_enabled: checked })
                      }
                    />
                    <ToggleField
                      label="After-hours overflow"
                      checked={setupProfile.after_hours_enabled}
                      onChange={(checked) =>
                        setSetupProfile({ ...setupProfile, after_hours_enabled: checked })
                      }
                    />
                  </div>

                  <button className="primary-button" type="submit" disabled={savingSetup}>
                    {savingSetup ? 'Saving setup…' : 'Save setup profile'}
                  </button>
                </form>
              </section>

              <section className="subcard">
                <div className="preview-header">
                  <div>
                    <p className="card-kicker">Preview</p>
                    <h3>Seeded booking payload preview</h3>
                  </div>
                  <span className="priority priority-low">{stubPayloads.length} payloads</span>
                </div>

                <form className="setup-form" onSubmit={handleBookingPreview}>
                  <div className="form-grid">
                    <label>
                      Demo mode
                      <select
                        value={bookingForm.mode}
                        onChange={(event) =>
                          setBookingForm({ ...bookingForm, mode: event.target.value })
                        }
                      >
                        <option value="stub">Stub Cliniko</option>
                        <option value="live">Live Cliniko later</option>
                      </select>
                    </label>

                    <label>
                      Patient name
                      <input
                        value={bookingForm.patientName}
                        onChange={(event) =>
                          setBookingForm({ ...bookingForm, patientName: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      Patient phone
                      <input
                        value={bookingForm.patientPhone}
                        onChange={(event) =>
                          setBookingForm({ ...bookingForm, patientPhone: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      Practitioner
                      <select
                        value={bookingForm.practitionerId}
                        onChange={(event) =>
                          setBookingForm({ ...bookingForm, practitionerId: event.target.value })
                        }
                      >
                        {practitioners.map((practitioner) => (
                          <option key={practitioner.practitioner_id} value={practitioner.practitioner_id}>
                            {practitioner.name} · {practitioner.speciality}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Appointment type
                      <select
                        value={bookingForm.appointmentTypeId}
                        onChange={(event) =>
                          setBookingForm({ ...bookingForm, appointmentTypeId: event.target.value })
                        }
                      >
                        {appointmentTypes.map((appointmentType) => (
                          <option
                            key={appointmentType.appointment_type_id}
                            value={appointmentType.appointment_type_id}
                          >
                            {appointmentType.name} · {appointmentType.duration_minutes} min
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Start time
                      <select
                        value={bookingForm.startsAt}
                        onChange={(event) =>
                          setBookingForm({ ...bookingForm, startsAt: event.target.value })
                        }
                      >
                        {availability.map((slot) => (
                          <option key={slot.slot_id} value={slot.starts_at}>
                            {slot.practitioner_name || 'Practitioner'} · {slot.location_name || 'Clinic'} · {slot.starts_at}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button className="primary-button" type="submit" disabled={submitting}>
                    {submitting ? 'Generating preview…' : 'Generate booking preview'}
                  </button>
                </form>

                {preview ? (
                  <div className="preview-panel">
                    <strong>{preview.action}</strong>
                    <pre>{JSON.stringify(preview, null, 2)}</pre>
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="ops-studio-side">
              <section className="subcard">
                <div className="preview-header">
                  <div>
                    <p className="card-kicker">Scenarios</p>
                    <h3>Quick simulation shortcuts</h3>
                  </div>
                  <span className="priority priority-medium">{priorityQueue.length} queue items</span>
                </div>
                <p className="card-copy">
                  Use these when you want fast outcome testing without placing a full live call.
                </p>
                <div className="scenario-grid">
                  {scenarioOptions.map((scenario) => (
                    <button
                      key={scenario.id}
                      className="secondary-button"
                      type="button"
                      disabled={runningScenario !== null}
                      onClick={() => void handleScenarioRun(scenario.id)}
                    >
                      {runningScenario === scenario.id ? 'Running…' : scenario.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="subcard">
                <div className="preview-header">
                  <div>
                    <p className="card-kicker">Latest calls</p>
                    <h3>Recent outcome snapshots</h3>
                  </div>
                  <span className="priority priority-low">{callSessions.length}</span>
                </div>
                {callSessions.length ? (
                  <div className="record-stack">
                    {callSessions.slice().reverse().slice(0, 3).map((session) => (
                      <div className="session-summary" key={session.call_sid}>
                        <strong>{session.captured_intent || 'Debug/live session'}</strong>
                        <p>{session.status_summary || `${session.inbound_audio_chunk_count} inbound chunks captured.`}</p>
                        <p>
                          Priority: {session.priority} · Action required:{' '}
                          {session.action_required ? 'yes' : 'no'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-copy">No handled calls captured yet.</p>
                )}
              </section>
            </aside>
          </div>
        </>
      ) : null}

      <div className="records-grid">
        <section className="subcard">
          <div className="preview-header">
            <h3>Latest payloads</h3>
            <span>{stubPayloads.length}</span>
          </div>
          {stubPayloads.length ? (
            <div className="record-stack">
              {stubPayloads.slice().reverse().slice(0, 4).map((payload, index) => (
                <pre key={`${payload.action}-${index}`}>{JSON.stringify(payload, null, 2)}</pre>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No stub payloads captured yet.</p>
          )}
        </section>

        <section className="subcard">
          <div className="preview-header">
            <h3>Advanced debug</h3>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void handleDebugCall()}
              disabled={runningDebugCall}
            >
              {runningDebugCall ? 'Running debug call…' : 'Run debug media call'}
            </button>
          </div>
          {debugEvents.length ? (
            <div className="record-stack">
              {debugEvents.slice(-4).map((debugEvent, index) => (
                <pre key={`${debugEvent.type}-${index}`}>
                  {JSON.stringify(debugEvent.payload, null, 2)}
                </pre>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No debug media events captured yet.</p>
          )}
        </section>
      </div>

      <div className="secondary-actions">
        <button className="secondary-button" type="button" onClick={() => void handleReset()}>
          Reset demo state
        </button>
      </div>
    </article>
  );
}

function ToggleField(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-field">
      <input
        checked={props.checked}
        type="checkbox"
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

function buildSetupCompletion(profile: SetupProfile | null) {
  if (!profile) {
    return { percent: 0, label: 'Loading' };
  }

  const checks = [
    profile.clinic_name.trim().length > 0,
    profile.fallback_number.trim().length > 0,
    profile.welcome_message.trim().length > 0,
    profile.allow_new_bookings,
    profile.allow_reschedules,
    profile.capture_late_arrivals,
    profile.routing_support_enabled,
  ];
  const completed = checks.filter(Boolean).length;
  const percent = Math.round((completed / checks.length) * 100);

  return {
    percent,
    label: percent >= 85 ? 'Ready to demo' : 'Needs a little setup',
  };
}
