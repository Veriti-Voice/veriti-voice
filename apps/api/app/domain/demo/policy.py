from __future__ import annotations

from datetime import datetime
from typing import Any

from app.core.config import Settings
from app.core.store import store
from app.domain.voice.session import VoiceSessionContext
from app.integrations.cliniko.stub import (
    get_stub_appointment_types,
    get_stub_availability,
    get_stub_practitioners,
)
from app.schemas.demo import DemoSetupProfile, SimulatedCallRequest


def load_demo_setup_profile(settings: Settings, *, clinic_key: str = "demo-clinic") -> DemoSetupProfile:
    existing = store.get_setup_profile(clinic_key)
    if existing:
        return DemoSetupProfile.model_validate(existing)

    profile = DemoSetupProfile(
        clinic_key=clinic_key,
        clinic_name=settings.demo_clinic_name,
        fallback_number=settings.demo_fallback_number,
        cliniko_mode=settings.cliniko_mode,
    )
    store.upsert_setup_profile(profile.clinic_key, profile.model_dump())
    return profile


def save_demo_setup_profile(profile: DemoSetupProfile) -> DemoSetupProfile:
    stored = store.upsert_setup_profile(profile.clinic_key, profile.model_dump())
    return DemoSetupProfile.model_validate(stored)


def build_voice_session_context(profile: DemoSetupProfile) -> VoiceSessionContext:
    supported_actions = list_supported_actions(profile)
    known_practitioners = tuple(
        practitioner.name for practitioner in get_stub_practitioners()
    ) if profile.cliniko_mode == "stub" else ()
    known_locations = tuple(
        sorted({slot.location_name for slot in get_stub_availability() if slot.location_name})
    ) if profile.cliniko_mode == "stub" else ()
    return VoiceSessionContext(
        clinic_key=profile.clinic_key,
        clinic_name=profile.clinic_name,
        welcome_message=profile.welcome_message,
        supported_actions=supported_actions,
        known_practitioners=known_practitioners,
        known_locations=known_locations,
        after_hours_enabled=profile.after_hours_enabled,
        routing_support_enabled=profile.routing_support_enabled,
        sms_confirmations_enabled=profile.sms_confirmations_enabled,
        fallback_number=profile.fallback_number,
    )


def list_supported_actions(profile: DemoSetupProfile) -> tuple[str, ...]:
    supported_actions: list[str] = []
    if profile.allow_new_bookings:
        supported_actions.append("book new appointments")
    if profile.allow_reschedules:
        supported_actions.append("change existing bookings")
    if profile.allow_cancellations:
        supported_actions.append("cancel appointments")
    if profile.capture_late_arrivals:
        supported_actions.append("capture late-arrival notices")
    if profile.routing_support_enabled:
        supported_actions.append("help callers decide who to see")
    if profile.sms_confirmations_enabled:
        supported_actions.append("send SMS follow-ups")

    if not supported_actions:
        supported_actions.append("capture a callback request for the clinic team")

    return tuple(supported_actions)


def resolve_simulated_scenario(
    profile: DemoSetupProfile,
    request: SimulatedCallRequest,
) -> dict[str, Any]:
    scenarios = {
        "new_booking": _new_booking_scenario(profile, request),
        "reschedule": _reschedule_scenario(profile, request),
        "cancel_and_reschedule": _cancel_and_reschedule_scenario(profile, request),
        "late_arrival": _late_arrival_scenario(profile, request),
        "who_should_i_see": _who_should_i_see_scenario(profile, request),
        "callback_request": _callback_request_scenario(profile, request),
    }
    return scenarios[request.scenario]


def infer_call_lab_outcome(
    profile: DemoSetupProfile,
    *,
    transcript_text: str,
    full_transcript_text: str = "",
    caller_name: str = "Call Lab Tester",
    phone_number: str = "+61400000000",
) -> dict[str, Any]:
    normalized = transcript_text.lower()

    if any(term in normalized for term in ("running late", "late for", "be late", "behind")):
        scenario = "late_arrival"
    elif any(term in normalized for term in ("cancel", "call me back", "next two options")):
        scenario = "cancel_and_reschedule"
    elif any(term in normalized for term in ("reschedule", "move my appointment", "change my appointment")):
        scenario = "reschedule"
    elif any(term in normalized for term in ("who should i see", "who would be best", "physio or chiro", "which practitioner")):
        scenario = "who_should_i_see"
    elif any(term in normalized for term in ("book", "appointment", "consult", "availability")):
        scenario = "new_booking"
    elif any(term in normalized for term in ("call me back", "referral", "rebate", "insurance")):
        scenario = "callback_request"
    else:
        return {
            "summary": "General clinic enquiry handled in Call Lab. Staff review may still be useful.",
            "priority": "medium",
            "action_required": False,
            "caller_text": transcript_text.strip()[:280] or "General enquiry.",
            "assistant_text": "",
            "stub_payload": None,
            "intent": "general_enquiry",
        }

    request = SimulatedCallRequest(
        scenario=scenario,
        caller_name=caller_name,
        phone_number=phone_number,
    )
    outcome = resolve_simulated_scenario(profile, request)
    if scenario == "new_booking" and outcome.get("stub_payload") is not None:
        outcome["stub_payload"] = _build_demo_booking_payload(
            caller_name=caller_name,
            phone_number=phone_number,
            transcript_text=full_transcript_text or transcript_text,
        )
        payload = outcome["stub_payload"]["payload"]
        outcome["summary"] = (
            f"New appointment captured with {payload.get('practitioner_name', 'the clinic team')} "
            f"at {payload.get('location_name', profile.clinic_name)}."
        )
    if scenario == "cancel_and_reschedule":
        booking_payload = _build_demo_booking_payload(
            caller_name=caller_name,
            phone_number=phone_number,
            transcript_text=full_transcript_text or transcript_text,
        )
        payload = booking_payload["payload"]
        outcome["summary"] = (
            f"Appointment cancelled and rebooked with {payload.get('practitioner_name', 'the clinic team')} "
            f"at {payload.get('location_name', profile.clinic_name)} for "
            f"{_format_demo_slot_label(payload.get('starts_at', 'pending slot'))}."
        )
        outcome["action_required"] = False
        outcome["priority"] = "medium"
        outcome["stub_payloads"] = [
            {
                "action": "cancel_booking",
                "adapter": "stub",
                "payload": {
                    "patient_name": caller_name,
                    "patient_phone": phone_number,
                    "practitioner_name": payload.get("practitioner_name", ""),
                    "location_name": payload.get("location_name", ""),
                    "source": "veriti-voice-overflow-simulated-call",
                },
            },
            {
                "action": "reschedule_booking",
                "adapter": "stub",
                "payload": {
                    "patient_name": caller_name,
                    "patient_phone": phone_number,
                    "practitioner_id": payload.get("practitioner_id", ""),
                    "practitioner_name": payload.get("practitioner_name", ""),
                    "appointment_type_id": payload.get("appointment_type_id", ""),
                    "appointment_type_name": payload.get("appointment_type_name", ""),
                    "location_name": payload.get("location_name", ""),
                    "starts_at": payload.get("starts_at", ""),
                    "source": "veriti-voice-overflow-simulated-call",
                },
            },
        ]
        outcome["stub_payload"] = outcome["stub_payloads"][-1]
    outcome["intent"] = scenario
    return outcome


def _new_booking_scenario(profile: DemoSetupProfile, request: SimulatedCallRequest) -> dict[str, Any]:
    if profile.allow_new_bookings:
        demo_payload = _build_demo_booking_payload(
            caller_name=request.caller_name,
            phone_number=request.phone_number,
        )
        return {
            "summary": "New appointment captured and ready to push into Cliniko.",
            "priority": "low",
            "action_required": False,
            "caller_text": "I need Ian Pau's next available appointment at St Leonards.",
            "assistant_text": (
                f"I've prepared a booking request with {demo_payload['payload']['practitioner_name']} "
                f"at {demo_payload['payload']['location_name']} for "
                f"{_format_demo_slot_label(demo_payload['payload']['starts_at'])}."
            ),
            "stub_payload": demo_payload,
        }

    return {
        "summary": "Caller wants a new appointment, but self-serve booking is disabled and needs staff follow-up.",
        "priority": "medium",
        "action_required": True,
        "caller_text": "I need the next available initial consult with Jordan.",
        "assistant_text": (
            "I've captured the booking request, but this clinic has manual booking review enabled, "
            "so the team will call back with options."
        ),
        "stub_payload": None,
    }


def _reschedule_scenario(profile: DemoSetupProfile, request: SimulatedCallRequest) -> dict[str, Any]:
    if profile.allow_reschedules:
        return {
            "summary": "Reschedule request captured and new preferred slot identified.",
            "priority": "medium",
            "action_required": False,
            "caller_text": "Can you move my follow-up to tomorrow afternoon?",
            "assistant_text": "I found a replacement slot and prepared the reschedule request.",
            "stub_payload": {
                "action": "reschedule_booking",
                "adapter": "stub",
                "payload": {
                    "patient_name": request.caller_name,
                    "patient_phone": request.phone_number,
                    "practitioner_id": "prac-001",
                    "appointment_type_id": "appt-002",
                    "starts_at": "2026-03-30T11:30:00+11:00",
                    "source": "veriti-voice-overflow-simulated-call",
                },
            },
        }

    return {
        "summary": "Caller wants to reschedule, but manual staff review is required.",
        "priority": "medium",
        "action_required": True,
        "caller_text": "Can you move my follow-up to tomorrow afternoon?",
        "assistant_text": "I've logged the reschedule request for the clinic team to confirm manually.",
        "stub_payload": None,
    }


def _cancel_and_reschedule_scenario(
    profile: DemoSetupProfile, request: SimulatedCallRequest
) -> dict[str, Any]:
    if profile.allow_cancellations:
        return {
            "summary": "Caller cancelled and wants the clinic to offer a new time.",
            "priority": "medium",
            "action_required": True,
            "caller_text": "I need to cancel today, but please call me back with the next two options.",
            "assistant_text": "I recorded the cancellation and flagged a reschedule callback for the clinic team.",
            "stub_payload": {
                "action": "cancel_booking",
                "adapter": "stub",
                "payload": {
                    "patient_name": request.caller_name,
                    "patient_phone": request.phone_number,
                    "source": "veriti-voice-overflow-simulated-call",
                },
            },
            "stub_payloads": [
                {
                    "action": "cancel_booking",
                    "adapter": "stub",
                    "payload": {
                        "patient_name": request.caller_name,
                        "patient_phone": request.phone_number,
                        "source": "veriti-voice-overflow-simulated-call",
                    },
                }
            ],
        }

    return {
        "summary": "Caller needs to cancel and reschedule, but cancellation automation is disabled.",
        "priority": "high",
        "action_required": True,
        "caller_text": "I need to cancel today, but please call me back with the next two options.",
        "assistant_text": "I've captured the request for urgent staff follow-up because cancellations are manual right now.",
        "stub_payload": None,
    }


def _late_arrival_scenario(profile: DemoSetupProfile, request: SimulatedCallRequest) -> dict[str, Any]:
    if profile.capture_late_arrivals:
        return {
            "summary": "Patient reported they will be 15 minutes late and needs front-desk follow-up.",
            "priority": "high",
            "action_required": True,
            "caller_text": "I'm running about 15 minutes late for my appointment.",
            "assistant_text": "I captured the late-arrival notice and flagged it for immediate review.",
            "stub_payload": None,
        }

    return {
        "summary": "Late-arrival automation is disabled, so the call has been escalated for manual handling.",
        "priority": "high",
        "action_required": True,
        "caller_text": "I'm running about 15 minutes late for my appointment.",
        "assistant_text": "I couldn't process the late-arrival automatically, so I've escalated it for the front desk.",
        "stub_payload": None,
    }


def _who_should_i_see_scenario(
    profile: DemoSetupProfile, request: SimulatedCallRequest
) -> dict[str, Any]:
    if profile.routing_support_enabled:
        return {
            "summary": "Caller asked who to see for lower-back pain and was routed to the physio intake path.",
            "priority": "low",
            "action_required": False,
            "caller_text": "I've got lower-back pain after lifting. Who should I book with?",
            "assistant_text": "Based on the clinic routing rules, I recommended starting with a physiotherapist.",
            "stub_payload": None,
        }

    return {
        "summary": "Caller asked for routing advice, but the clinic has manual triage enabled.",
        "priority": "medium",
        "action_required": True,
        "caller_text": "I've got lower-back pain after lifting. Who should I book with?",
        "assistant_text": "I've captured the triage question and asked the clinic team to call back with guidance.",
        "stub_payload": None,
    }


def _callback_request_scenario(
    profile: DemoSetupProfile, request: SimulatedCallRequest
) -> dict[str, Any]:
    return {
        "summary": "Caller requested a callback about insurance and referral requirements.",
        "priority": "high",
        "action_required": True,
        "caller_text": "Can someone call me back about EPC referrals and rebate eligibility?",
        "assistant_text": (
            f"I've logged a high-priority callback request for {profile.clinic_name} to review."
        ),
        "stub_payload": None,
    }


def _build_demo_booking_payload(
    *,
    caller_name: str,
    phone_number: str,
    transcript_text: str = "",
) -> dict[str, Any]:
    normalized = transcript_text.lower()
    practitioners = get_stub_practitioners()
    appointment_types = get_stub_appointment_types()
    availability = get_stub_availability()

    selected_practitioner = next(
        (practitioner for practitioner in practitioners if practitioner.name.lower() in normalized),
        practitioners[0],
    )
    selected_location = next(
        (
            slot.location_name
            for slot in availability
            if slot.location_name and slot.location_name.lower() in normalized
        ),
        selected_practitioner.primary_location_name,
    )
    selected_appointment_type = next(
        (
            appointment_type
            for appointment_type in appointment_types
            if appointment_type.name.lower().startswith("follow-up")
            and "follow-up" in normalized
        ),
        appointment_types[0],
    )

    matching_slot = next(
        (
            slot
            for slot in availability
            if slot.practitioner_id == selected_practitioner.practitioner_id
            and slot.appointment_type_id == selected_appointment_type.appointment_type_id
            and slot.location_name == selected_location
        ),
        None,
    )
    if matching_slot is None:
        matching_slot = next(
            (
                slot
                for slot in availability
                if slot.practitioner_id == selected_practitioner.practitioner_id
                and slot.location_name == selected_location
            ),
            None,
        )
    if matching_slot is None:
        matching_slot = availability[0]
        selected_practitioner = next(
            (
                practitioner
                for practitioner in practitioners
                if practitioner.practitioner_id == matching_slot.practitioner_id
            ),
            selected_practitioner,
        )
        selected_location = matching_slot.location_name or selected_practitioner.primary_location_name
        selected_appointment_type = next(
            (
                appointment_type
                for appointment_type in appointment_types
                if appointment_type.appointment_type_id == matching_slot.appointment_type_id
            ),
            selected_appointment_type,
        )

    return {
        "action": "create_booking",
        "adapter": "stub",
        "payload": {
            "patient_name": caller_name,
            "patient_phone": phone_number,
            "practitioner_id": selected_practitioner.practitioner_id,
            "practitioner_name": selected_practitioner.name,
            "appointment_type_id": selected_appointment_type.appointment_type_id,
            "appointment_type_name": selected_appointment_type.name,
            "location_name": selected_location,
            "starts_at": matching_slot.starts_at,
            "source": "veriti-voice-overflow-simulated-call",
        },
    }


def _format_demo_slot_label(starts_at: str) -> str:
    try:
        value = datetime.fromisoformat(starts_at)
    except ValueError:
        return starts_at
    return value.strftime("%A %d %B at %I:%M %p")
