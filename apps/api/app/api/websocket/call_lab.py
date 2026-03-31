from __future__ import annotations

import asyncio
import base64
import contextlib
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.core.store import store
from app.domain.calls.session_manager import CallSessionManager
from app.domain.demo.policy import (
    build_voice_session_context,
    infer_call_lab_outcome,
    load_demo_setup_profile,
)
from app.domain.voice.factory import build_voice_session
from app.domain.voice.session import VoiceEvent, VoiceEventType

router = APIRouter()
call_session_manager = CallSessionManager()


@router.websocket("/ws/call-lab")
async def call_lab_stream(websocket: WebSocket) -> None:
    await websocket.accept()

    settings = get_settings()
    call_sid = websocket.query_params.get("callSid") or f"call-lab-{uuid.uuid4().hex[:8]}"
    clinic_key = websocket.query_params.get("clinic", "demo-clinic")
    caller_name = websocket.query_params.get("callerName", "Call Lab Tester").strip() or "Call Lab Tester"
    profile = load_demo_setup_profile(settings, clinic_key=clinic_key)

    call_session_manager.bootstrap(
        call_sid,
        to_number=profile.fallback_number,
        clinic_key=clinic_key,
    )
    call_session_manager.annotate(
        call_sid,
        status_summary=f"Call Lab session bootstrapped for {profile.clinic_name}.",
        captured_intent="call_lab",
        caller_name=caller_name,
    )

    voice_session = build_voice_session(
        settings,
        context=build_voice_session_context(profile),
    )
    event_pump_task: asyncio.Task[None] | None = None
    audio_activity_open = False
    try:
        await voice_session.connect()
        initial_event = await voice_session.receive_event()
        call_session_manager.add_transcript_event(
            call_sid,
            "assistant",
            initial_event.payload.get("text", "Voice session connected."),
        )
        await websocket.send_json(
            {
                "type": "session_bootstrapped",
                "callSid": call_sid,
                "provider": settings.voice_provider,
                "voiceEvent": {
                    "eventType": initial_event.event_type.value,
                    "payload": _serialize_voice_event(initial_event),
                },
            }
        )
        event_pump_task = asyncio.create_task(
            _forward_call_lab_events(
                websocket=websocket,
                voice_session=voice_session,
                call_sid=call_sid,
            )
        )
    except Exception as exc:
        call_session_manager.add_transcript_event(
            call_sid,
            "system",
            f"Call Lab failed to initialise: {exc}",
            priority="high",
            action_required=True,
        )
        with contextlib.suppress(Exception):
            await websocket.send_json(
                {
                    "type": "voice_event",
                    "callSid": call_sid,
                    "voiceEvent": {
                        "eventType": VoiceEventType.ERROR.value,
                        "payload": {
                            "message": f"Call Lab failed to initialise: {exc}",
                        },
                    },
                }
            )
        with contextlib.suppress(Exception):
            await voice_session.close()
        await websocket.close(code=1011)
        return

    try:
        while True:
            raw = await websocket.receive_text()
            envelope = json.loads(raw)
            event = str(envelope.get("event", "")).strip()

            if event == "start":
                call_session_manager.add_transcript_event(
                    call_sid,
                    "system",
                    "Call Lab browser session started.",
                )
                await websocket.send_json(
                    {
                        "type": "call_started",
                        "callSid": call_sid,
                    }
                )
                continue

            if event == "text" and str(envelope.get("text", "")).strip():
                await voice_session.send_text(str(envelope["text"]).strip())
                continue

            if event == "audio_chunk":
                audio = envelope.get("audio", {}) or {}
                payload = str(audio.get("payload", "")).strip()
                if payload:
                    try:
                        if not audio_activity_open:
                            await voice_session.start_activity()
                            audio_activity_open = True
                        audio_bytes = base64.b64decode(payload)
                        await voice_session.send_audio(audio_bytes)
                        call_session_manager.increment_audio_chunks(call_sid)
                    except Exception:
                        pass
                continue

            if event == "audio_commit":
                if audio_activity_open:
                    await voice_session.end_activity()
                    audio_activity_open = False
                await websocket.send_json(
                    {
                        "type": "input_committed",
                        "callSid": call_sid,
                    }
                )
                continue

            if event == "interrupt":
                if audio_activity_open:
                    await voice_session.end_activity()
                    audio_activity_open = False
                call_session_manager.add_transcript_event(
                    call_sid,
                    "system",
                    "Call Lab interruption requested.",
                    priority="medium",
                    action_required=False,
                )
                await websocket.send_json({"type": "clear_playback", "callSid": call_sid})
                continue

            if event == "stop":
                if audio_activity_open:
                    await voice_session.end_activity()
                    audio_activity_open = False
                existing_session = call_session_manager.get_session(call_sid)
                transcript_text = " ".join(
                    item.get("text", "")
                    for item in (existing_session.transcript_events if existing_session else [])
                    if item.get("speaker") == "caller"
                )
                full_transcript_text = " ".join(
                    item.get("text", "")
                    for item in (existing_session.transcript_events if existing_session else [])
                )
                outcome = infer_call_lab_outcome(
                    profile,
                    transcript_text=transcript_text,
                    full_transcript_text=full_transcript_text,
                    caller_name=caller_name,
                )
                call_session_manager.annotate(
                    call_sid,
                    captured_intent=outcome.get("intent", "call_lab"),
                    status_summary=outcome["summary"],
                    priority=outcome["priority"],
                    action_required=outcome["action_required"],
                )
                payloads = outcome.get("stub_payloads")
                if payloads:
                    for raw_payload in payloads:
                        payload = dict(raw_payload)
                        payload["call_sid"] = call_sid
                        store.append_stub_payload("demo-clinic", payload)
                elif outcome["stub_payload"] is not None:
                    payload = dict(outcome["stub_payload"])
                    payload["call_sid"] = call_sid
                    store.append_stub_payload("demo-clinic", payload)
                if event_pump_task is not None:
                    event_pump_task.cancel()
                    with contextlib.suppress(asyncio.CancelledError):
                        await event_pump_task
                    event_pump_task = None
                session = call_session_manager.complete(call_sid)
                await voice_session.close()
                await websocket.send_json(
                    {
                        "type": "call_stopped",
                        "callSession": session.model_dump() if session else {"call_sid": call_sid},
                    }
                )
                break

            await websocket.send_json(
                {
                    "type": "ignored_event",
                    "callSid": call_sid,
                    "event": event,
                }
            )

    except WebSocketDisconnect:
        if event_pump_task is not None:
            event_pump_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await event_pump_task
        await voice_session.close()
    except Exception as exc:
        call_session_manager.add_transcript_event(
            call_sid,
            "system",
            f"Call Lab websocket error: {exc}",
            priority="high",
            action_required=True,
        )
        if event_pump_task is not None:
            event_pump_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await event_pump_task
        await voice_session.close()
        await websocket.close(code=1011)


async def _forward_call_lab_events(
    *,
    websocket: WebSocket,
    voice_session,
    call_sid: str,
) -> None:
    while True:
        event = await voice_session.receive_event()
        if event.event_type == VoiceEventType.INPUT_TRANSCRIPT:
            call_session_manager.add_transcript_event(
                call_sid,
                "caller",
                event.payload.get("text", ""),
            )
        elif event.event_type == VoiceEventType.OUTPUT_TRANSCRIPT:
            call_session_manager.add_transcript_event(
                call_sid,
                "assistant",
                event.payload.get("text", ""),
            )
        elif event.event_type == VoiceEventType.INTERRUPTION:
            call_session_manager.add_transcript_event(
                call_sid,
                "system",
                "Provider interruption detected in Call Lab.",
                priority="medium",
                action_required=False,
            )
            await websocket.send_json({"type": "clear_playback", "callSid": call_sid})
        elif event.event_type == VoiceEventType.AUDIO_CHUNK and event.payload.get("audio_bytes"):
            audio_bytes = event.payload["audio_bytes"]
            call_session_manager.increment_outbound_audio_chunks(call_sid, 1)
            await websocket.send_json(
                {
                    "type": "audio_chunk",
                    "callSid": call_sid,
                    "audio": {
                        "payload": base64.b64encode(audio_bytes).decode("ascii"),
                        "sampleRateHz": int(event.payload.get("sample_rate_hz", 24000)),
                        "format": event.payload.get("format", "pcm16le"),
                    },
                }
            )
        elif event.event_type == VoiceEventType.TURN_COMPLETE:
            await websocket.send_json(
                {
                    "type": "turn_complete",
                    "callSid": call_sid,
                    "voiceEvent": {
                        "eventType": event.event_type.value,
                        "payload": _serialize_voice_event(event),
                    },
                }
            )
            continue

        if event.event_type != VoiceEventType.TURN_COMPLETE:
            await websocket.send_json(
                {
                    "type": "voice_event",
                    "callSid": call_sid,
                    "voiceEvent": {
                        "eventType": event.event_type.value,
                        "payload": _serialize_voice_event(event),
                    },
                }
            )


def _serialize_voice_event(event: VoiceEvent) -> dict:
    payload = dict(event.payload)
    if "audio_bytes" in payload:
        payload["audio_bytes"] = f"<{len(payload['audio_bytes'])} bytes>"
    return payload
