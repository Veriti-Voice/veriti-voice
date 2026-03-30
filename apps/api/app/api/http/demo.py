from __future__ import annotations

import uuid
from typing import Dict, List, Optional, Union

from fastapi import APIRouter, HTTPException, Response

from app.core.config import get_settings
from app.core.store import store
from app.domain.calls.session_manager import CallSessionManager
from app.domain.demo.policy import (
    load_demo_setup_profile,
    resolve_simulated_scenario,
    save_demo_setup_profile,
)
from app.integrations.cliniko.factory import build_cliniko_adapter
from app.integrations.twilio.twiml import assess_twilio_readiness
from app.schemas.cliniko import BookingRequest
from app.schemas.demo import (
    ActionQueueItem,
    DemoSetupProfile,
    QueueItemUpdateRequest,
    SimulatedCallRequest,
    TwilioConnectionStatus,
)

router = APIRouter(prefix="/demo", tags=["demo"])
call_session_manager = CallSessionManager()


@router.get("/clinic")
async def get_demo_clinic() -> Dict[str, Union[str, bool]]:
    profile = load_demo_setup_profile(get_settings())
    return {
        "clinic_key": profile.clinic_key,
        "clinic_name": profile.clinic_name,
        "fallback_number": profile.fallback_number,
        "demo_mode_enabled": get_settings().demo_mode_enabled,
        "cliniko_mode": profile.cliniko_mode,
    }


@router.get("/setup-profile")
async def get_setup_profile() -> dict:
    return load_demo_setup_profile(get_settings()).model_dump()


@router.put("/setup-profile")
async def update_setup_profile(profile: DemoSetupProfile) -> dict:
    return save_demo_setup_profile(profile).model_dump()


@router.get("/practitioners")
async def get_demo_practitioners() -> List[dict]:
    adapter = build_cliniko_adapter(get_settings())
    return [item.model_dump() for item in await adapter.list_practitioners("demo-clinic")]


@router.get("/appointment-types")
async def get_demo_appointment_types() -> List[dict]:
    adapter = build_cliniko_adapter(get_settings())
    return [
        item.model_dump()
        for item in await adapter.list_appointment_types("demo-clinic")
    ]


@router.get("/availability")
async def get_demo_availability(practitioner_id: Optional[str] = None) -> List[dict]:
    adapter = build_cliniko_adapter(get_settings())
    return [
        item.model_dump()
        for item in await adapter.list_availability(
            "demo-clinic", practitioner_id=practitioner_id
        )
    ]


@router.post("/booking-preview")
async def create_booking_preview(request: BookingRequest) -> dict:
    adapter = build_cliniko_adapter(get_settings())
    preview = await adapter.preview_booking(request)
    return preview.model_dump()


@router.get("/cliniko-status")
async def get_cliniko_status() -> dict:
    adapter = build_cliniko_adapter(get_settings())
    status = await adapter.get_status()
    return status.model_dump()


@router.get("/twilio-status")
async def get_twilio_status() -> dict:
    settings = get_settings()
    status = TwilioConnectionStatus.model_validate(
        assess_twilio_readiness(
            webhook_base_url=settings.twilio_webhook_base_url,
            public_base_url=settings.veriti_public_base_url,
            phone_number=settings.twilio_phone_number,
        )
    )
    return status.model_dump()


@router.get("/stub-payloads")
async def list_stub_payloads() -> List[dict]:
    return store.list_stub_payloads("demo-clinic")


@router.get("/call-sessions")
async def list_call_sessions() -> List[dict]:
    return [item.model_dump() for item in call_session_manager.list_sessions()]


@router.get("/call-sessions/{call_sid}")
async def get_call_session(call_sid: str) -> dict:
    session = call_session_manager.get_session(call_sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Call session not found.")
    return session.model_dump()


@router.get("/action-queue")
async def list_action_queue() -> List[dict]:
    queue_items = _build_action_queue()
    return [item.model_dump() for item in queue_items]


@router.put("/action-queue/{item_id}")
async def update_action_queue_item(item_id: str, request: QueueItemUpdateRequest) -> dict:
    store.upsert_queue_item_status(item_id, request.workflow_status)
    queue_items = _build_action_queue()
    for item in queue_items:
        if item.item_id == item_id:
            return item.model_dump()
    raise HTTPException(status_code=404, detail="Queue item not found.")


@router.post("/simulate-call")
async def simulate_call(request: SimulatedCallRequest) -> dict:
    profile = load_demo_setup_profile(get_settings())
    scenario = resolve_simulated_scenario(profile, request)
    call_sid = f"sim-{uuid.uuid4().hex[:10]}"

    call_session_manager.bootstrap(
        call_sid,
        from_number=request.phone_number,
        to_number=profile.fallback_number,
        clinic_key="demo-clinic",
    )
    call_session_manager.annotate(
        call_sid,
        caller_name=request.caller_name,
        captured_intent=request.scenario,
        status_summary=scenario["summary"],
        priority=scenario["priority"],
        action_required=scenario["action_required"],
    )
    call_session_manager.add_transcript_event(call_sid, "caller", scenario["caller_text"])
    call_session_manager.add_transcript_event(
        call_sid,
        "assistant",
        scenario["assistant_text"],
        priority=scenario["priority"],
        action_required=scenario["action_required"],
    )

    if scenario["stub_payload"] is not None:
        payload = dict(scenario["stub_payload"])
        payload["call_sid"] = call_sid
        store.append_stub_payload("demo-clinic", payload)

    session = call_session_manager.complete(call_sid)
    return session.model_dump() if session else {"call_sid": call_sid}


@router.post("/reset", status_code=204)
async def reset_demo_state() -> Response:
    store.reset()
    return Response(status_code=204)
def _build_action_queue() -> List[ActionQueueItem]:
    sessions = call_session_manager.list_sessions()
    payloads = store.list_stub_payloads("demo-clinic")
    items: List[ActionQueueItem] = []

    for session in sessions:
        caller_display = session.caller_name or session.from_number or "Unknown caller"
        label = _humanize_intent(session.captured_intent) if session.captured_intent else "Handled call"
        summary = session.status_summary or f"{caller_display} completed a handled call."
        items.append(
            ActionQueueItem(
                item_id=session.call_sid,
                label=label,
                status=_build_queue_status_label(
                    workflow_status=_resolve_queue_item_workflow_status(session.call_sid),
                    base_status="Action needed" if session.action_required else "Logged",
                ),
                workflow_status=_resolve_queue_item_workflow_status(session.call_sid),
                summary=summary,
                priority=session.priority,
                source="call_session",
                action_required=session.action_required,
                related_call_sid=session.call_sid,
            )
        )

    for index, payload in enumerate(payloads):
        action = str(payload.get("action", "booking_preview"))
        related_call_sid = str(payload.get("call_sid", ""))
        preview_payload = payload.get("payload", {})
        patient_name = str(preview_payload.get("patient_name", "Unknown patient"))
        starts_at = str(preview_payload.get("starts_at", "pending slot"))
        items.append(
            ActionQueueItem(
                item_id=f"payload-{index}",
                label=_humanize_intent(action),
                status=_build_queue_status_label(
                    workflow_status=_resolve_queue_item_workflow_status(f"payload-{index}"),
                    base_status="Stub payload ready",
                ),
                workflow_status=_resolve_queue_item_workflow_status(f"payload-{index}"),
                summary=f"{patient_name} payload prepared for {starts_at}.",
                priority="low",
                source="stub_payload",
                related_call_sid=related_call_sid,
            )
        )

    return sorted(
        items,
        key=lambda item: (
            _priority_rank(item.priority),
            _workflow_rank(item.workflow_status),
            0 if item.action_required else 1,
            item.item_id,
        ),
    )


def _priority_rank(priority: str) -> int:
    order = {"high": 0, "medium": 1, "low": 2}
    return order.get(priority, 3)


def _workflow_rank(workflow_status: str) -> int:
    order = {"new": 0, "reviewed": 1, "done": 2}
    return order.get(workflow_status, 3)


def _resolve_queue_item_workflow_status(item_id: str) -> str:
    return store.get_queue_item_status(item_id) or "new"


def _build_queue_status_label(*, workflow_status: str, base_status: str) -> str:
    prefix = {
        "new": "New",
        "reviewed": "Reviewed",
        "done": "Done",
    }.get(workflow_status, "New")
    if workflow_status == "done":
        return prefix
    return f"{prefix} · {base_status}"


def _humanize_intent(value: str) -> str:
    return value.replace("_", " ").strip().title()
