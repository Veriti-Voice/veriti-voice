from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class DemoSetupProfile(BaseModel):
    clinic_key: str = "demo-clinic"
    clinic_name: str
    fallback_number: str
    cliniko_mode: str = "stub"
    welcome_message: str = (
        "Thanks for calling. Veriti Voice can help with bookings, changes, "
        "cancellations, late arrivals, and routing to the right clinician."
    )
    after_hours_enabled: bool = True
    allow_new_bookings: bool = True
    allow_reschedules: bool = True
    allow_cancellations: bool = True
    capture_late_arrivals: bool = True
    routing_support_enabled: bool = True
    sms_confirmations_enabled: bool = True


class ActionQueueItem(BaseModel):
    item_id: str
    label: str
    status: str
    workflow_status: Literal["new", "reviewed", "done"] = "new"
    summary: str
    priority: Literal["low", "medium", "high"] = "low"
    source: Literal["call_session", "stub_payload"] = "call_session"
    action_required: bool = False
    related_call_sid: str = ""


class TwilioConnectionStatus(BaseModel):
    phone_number: str = ""
    voice_webhook_url: str
    media_stream_websocket_url: str
    stream_status_callback_url: str
    ready_for_live_calls: bool = False
    public_webhook_configured: bool = False
    secure_media_stream: bool = False
    notes: list[str] = Field(default_factory=list)


class QueueItemUpdateRequest(BaseModel):
    workflow_status: Literal["new", "reviewed", "done"]


class SimulatedCallRequest(BaseModel):
    scenario: Literal[
        "new_booking",
        "reschedule",
        "cancel_and_reschedule",
        "late_arrival",
        "who_should_i_see",
        "callback_request",
    ]
    caller_name: str = "Taylor Morgan"
    phone_number: str = Field(default="+61412345678")
