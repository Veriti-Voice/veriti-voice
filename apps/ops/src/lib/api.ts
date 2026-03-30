export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

async function postEmpty(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }
}

export type DemoClinic = {
  clinic_key: string;
  clinic_name: string;
  fallback_number: string;
  demo_mode_enabled: boolean;
  cliniko_mode: string;
};

export type SetupProfile = {
  clinic_key: string;
  clinic_name: string;
  fallback_number: string;
  cliniko_mode: string;
  welcome_message: string;
  after_hours_enabled: boolean;
  allow_new_bookings: boolean;
  allow_reschedules: boolean;
  allow_cancellations: boolean;
  capture_late_arrivals: boolean;
  routing_support_enabled: boolean;
  sms_confirmations_enabled: boolean;
};

export type Practitioner = {
  practitioner_id: string;
  name: string;
  speciality: string;
  primary_location_name?: string;
};

export type AppointmentType = {
  appointment_type_id: string;
  name: string;
  duration_minutes: number;
};

export type AvailabilitySlot = {
  slot_id: string;
  practitioner_id: string;
  appointment_type_id: string;
  starts_at: string;
  practitioner_name?: string;
  location_name?: string;
};

export type BookingPreview = {
  clinic_key: string;
  adapter: string;
  action: string;
  payload: Record<string, string>;
};

export type StubPayloadRecord = {
  action: string;
  adapter: string;
  call_sid?: string;
  payload: Record<string, string>;
};

export type ClinikoStatus = {
  adapter: string;
  mode: string;
  configured: boolean;
  base_url: string;
  business_id: string;
  write_enabled: boolean;
  notes: string[];
};

export type TwilioStatus = {
  phone_number: string;
  voice_webhook_url: string;
  media_stream_websocket_url: string;
  stream_status_callback_url: string;
  ready_for_live_calls: boolean;
  public_webhook_configured: boolean;
  secure_media_stream: boolean;
  notes: string[];
};

export type CallSessionRecord = {
  call_sid: string;
  from_number: string;
  to_number: string;
  stream_sid: string;
  clinic_key: string;
  state: string;
  transcript_events: Array<{ speaker: string; text: string }>;
  inbound_audio_chunk_count: number;
  outbound_audio_chunk_count: number;
  action_required: boolean;
  priority: 'low' | 'medium' | 'high';
  caller_name: string;
  captured_intent: string;
  status_summary: string;
};

export type ActionQueueItem = {
  item_id: string;
  label: string;
  status: string;
  workflow_status: 'new' | 'reviewed' | 'done';
  summary: string;
  priority: 'low' | 'medium' | 'high';
  source: 'call_session' | 'stub_payload';
  action_required: boolean;
  related_call_sid: string;
};

export const demoApi = {
  getClinic: () => getJson<DemoClinic>('/demo/clinic'),
  getSetupProfile: () => getJson<SetupProfile>('/demo/setup-profile'),
  updateSetupProfile: (body: SetupProfile) => putJson<SetupProfile>('/demo/setup-profile', body),
  getPractitioners: () => getJson<Practitioner[]>('/demo/practitioners'),
  getAppointmentTypes: () => getJson<AppointmentType[]>('/demo/appointment-types'),
  getAvailability: () => getJson<AvailabilitySlot[]>('/demo/availability'),
  getClinikoStatus: () => getJson<ClinikoStatus>('/demo/cliniko-status'),
  getTwilioStatus: () => getJson<TwilioStatus>('/demo/twilio-status'),
  getStubPayloads: () => getJson<StubPayloadRecord[]>('/demo/stub-payloads'),
  getCallSessions: () => getJson<CallSessionRecord[]>('/demo/call-sessions'),
  getCallSession: (callSid: string) => getJson<CallSessionRecord>(`/demo/call-sessions/${encodeURIComponent(callSid)}`),
  getActionQueue: () => getJson<ActionQueueItem[]>('/demo/action-queue'),
  updateActionQueueItem: (itemId: string, workflowStatus: 'new' | 'reviewed' | 'done') =>
    putJson<ActionQueueItem>(`/demo/action-queue/${encodeURIComponent(itemId)}`, {
      workflow_status: workflowStatus,
    }),
  resetDemoState: () => postEmpty('/demo/reset'),
  simulateCall: (body: {
    scenario:
      | 'new_booking'
      | 'reschedule'
      | 'cancel_and_reschedule'
      | 'late_arrival'
      | 'who_should_i_see'
      | 'callback_request';
    caller_name: string;
    phone_number: string;
  }) => postJson<CallSessionRecord>('/demo/simulate-call', body),
  createBookingPreview: (body: {
    clinic_key: string;
    patient_name: string;
    patient_phone: string;
    practitioner_id: string;
    appointment_type_id: string;
    starts_at: string;
    mode: string;
  }) => postJson<BookingPreview>('/demo/booking-preview', body),
};
