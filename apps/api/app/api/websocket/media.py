from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.domain.calls.session_manager import CallSessionManager
from app.domain.demo.policy import build_voice_session_context, load_demo_setup_profile
from app.domain.voice.audio import (
    GEMINI_OUTPUT_SAMPLE_RATE,
    chunk_telephony_audio,
    gemini_output_to_twilio,
    twilio_to_gemini_input,
)
from app.domain.voice.factory import build_voice_session
from app.domain.voice.session import VoiceEvent, VoiceEventType
from app.integrations.twilio.media import (
    build_clear_event,
    build_mark_event,
    build_media_event,
    decode_audio_payload,
)
from app.schemas.calls import MediaStreamEnvelope

router = APIRouter()
call_session_manager = CallSessionManager()


@router.websocket("/ws/media")
async def media_stream(websocket: WebSocket) -> None:
    await websocket.accept()

    settings = get_settings()
    debug_mode = websocket.query_params.get("debug") == "1"
    debug_text = websocket.query_params.get("debugText", "").strip()
    call_sid = websocket.query_params.get("callSid") or f"call-{uuid.uuid4().hex[:8]}"
    from_number = websocket.query_params.get("from", "")
    to_number = websocket.query_params.get("to", "")
    clinic_key = websocket.query_params.get("clinic", "demo-clinic")
    profile = load_demo_setup_profile(settings, clinic_key=clinic_key)

    call_session_manager.bootstrap(
        call_sid,
        from_number=from_number,
        to_number=to_number,
        clinic_key=clinic_key,
    )
    call_session_manager.annotate(
        call_sid,
        status_summary=f"Voice session bootstrapped for {profile.clinic_name}.",
        captured_intent="voice_demo",
    )

    voice_session = build_voice_session(
        settings,
        context=build_voice_session_context(profile),
    )
    active_stream_sid = ""
    await voice_session.connect()
    initial_event = await voice_session.receive_event()
    call_session_manager.add_transcript_event(
        call_sid,
        "assistant",
        initial_event.payload.get("text", "Voice session connected."),
    )
    if debug_mode:
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

    try:
        while True:
            raw = await websocket.receive_text()
            envelope = MediaStreamEnvelope.model_validate(json.loads(raw))

            if envelope.event == "start":
                stream_sid = envelope.streamSid or (
                    envelope.start.get("streamSid", "") if envelope.start else ""
                )
                active_stream_sid = stream_sid
                session = call_session_manager.bootstrap(
                    call_sid,
                    from_number=from_number,
                    to_number=to_number,
                    stream_sid=stream_sid,
                    clinic_key=clinic_key,
                )
                call_session_manager.add_transcript_event(
                    call_sid,
                    "system",
                    "Twilio media stream started.",
                )
                if debug_mode:
                    await websocket.send_json(
                        {
                            "type": "stream_started",
                            "callSession": session.model_dump(),
                        }
                    )
                elif stream_sid:
                    await websocket.send_json(
                        build_mark_event(stream_sid, "veriti-stream-started")
                    )
                continue

            if envelope.event == "media" and envelope.media:
                payload = envelope.media.get("payload", "")
                try:
                    twilio_audio_bytes = decode_audio_payload(payload)
                except Exception:
                    twilio_audio_bytes = b""

                provider_audio_bytes = twilio_to_gemini_input(twilio_audio_bytes)
                await voice_session.send_audio(provider_audio_bytes)
                if debug_mode and debug_text:
                    await voice_session.send_text(debug_text)
                session = call_session_manager.increment_audio_chunks(call_sid)
                stream_sid = envelope.streamSid or session.stream_sid if session else ""
                if stream_sid:
                    active_stream_sid = stream_sid

                await _drain_voice_turn(
                    websocket=websocket,
                    voice_session=voice_session,
                    call_sid=call_sid,
                    stream_sid=stream_sid,
                    session=session,
                    debug_mode=debug_mode,
                    twilio_audio_bytes=twilio_audio_bytes,
                    provider_audio_bytes=provider_audio_bytes,
                )
                continue

            if debug_mode and envelope.event == "veriti_text" and (envelope.text or "").strip():
                await voice_session.send_text(envelope.text.strip())
                session = call_session_manager.increment_audio_chunks(call_sid)
                await _drain_voice_turn(
                    websocket=websocket,
                    voice_session=voice_session,
                    call_sid=call_sid,
                    stream_sid=active_stream_sid,
                    session=session,
                    debug_mode=debug_mode,
                    twilio_audio_bytes=b"",
                    provider_audio_bytes=b"",
                )
                continue

            if envelope.event == "mark":
                if debug_mode:
                    await websocket.send_json({"type": "mark_ack", "callSid": call_sid})
                continue

            if envelope.event == "stop":
                session = call_session_manager.complete(call_sid)
                await voice_session.close()
                if debug_mode:
                    await websocket.send_json(
                        {
                            "type": "stream_stopped",
                            "callSession": session.model_dump() if session else {"call_sid": call_sid},
                        }
                    )
                break

            if debug_mode:
                await websocket.send_json(
                    {
                        "type": "ignored_event",
                        "callSid": call_sid,
                        "event": envelope.event,
                    }
                )

    except WebSocketDisconnect:
        await voice_session.close()
    except Exception as exc:
        call_session_manager.add_transcript_event(
            call_sid,
            "system",
            f"Media websocket error: {exc}",
            priority="high",
            action_required=True,
        )
        await voice_session.close()
        await websocket.close(code=1011)


def _serialize_voice_event(event: VoiceEvent) -> dict:
    payload = dict(event.payload)
    if "audio_bytes" in payload:
        payload["audio_bytes"] = f"<{len(payload['audio_bytes'])} bytes>"
    return payload


async def _drain_voice_turn(
    *,
    websocket: WebSocket,
    voice_session,
    call_sid: str,
    stream_sid: str,
    session,
    debug_mode: bool,
    twilio_audio_bytes: bytes,
    provider_audio_bytes: bytes,
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
        elif event.event_type == VoiceEventType.INTERRUPTION and stream_sid:
            call_session_manager.add_transcript_event(
                call_sid,
                "system",
                "Interruption detected; clearing outbound audio buffer.",
                priority="medium",
                action_required=False,
            )
            await websocket.send_json(build_clear_event(stream_sid))
        elif (
            event.event_type == VoiceEventType.AUDIO_CHUNK
            and stream_sid
            and event.payload.get("audio_bytes")
        ):
            provider_output_bytes = event.payload["audio_bytes"]
            provider_output_rate = int(
                event.payload.get("sample_rate_hz", GEMINI_OUTPUT_SAMPLE_RATE)
            )
            twilio_output_bytes = gemini_output_to_twilio(
                provider_output_bytes,
                sample_rate=provider_output_rate,
            )
            audio_frames = chunk_telephony_audio(twilio_output_bytes)
            call_session_manager.increment_outbound_audio_chunks(
                call_sid, len(audio_frames)
            )
            for audio_frame in audio_frames:
                await websocket.send_json(
                    build_media_event(stream_sid, audio_frame)
                )
        elif event.event_type == VoiceEventType.TURN_COMPLETE:
            if debug_mode:
                await websocket.send_json(
                    {
                        "type": "media_ack",
                        "callSid": call_sid,
                        "twilioAudioBytes": len(twilio_audio_bytes),
                        "providerAudioBytes": len(provider_audio_bytes),
                        "audioChunkCount": (
                            session.inbound_audio_chunk_count if session else 0
                        ),
                        "voiceEvent": {
                            "eventType": event.event_type.value,
                            "payload": _serialize_voice_event(event),
                        },
                    }
                )
            elif stream_sid:
                await websocket.send_json(
                    build_mark_event(stream_sid, "veriti-turn-complete")
                )
            break

        if debug_mode and event.event_type != VoiceEventType.TURN_COMPLETE:
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
