from __future__ import annotations

import asyncio
import contextlib
import json
from typing import Any

import websockets

from app.core.config import Settings
from app.domain.voice.audio import (
    GEMINI_INPUT_SAMPLE_RATE,
    GEMINI_OUTPUT_SAMPLE_RATE,
    PCM_SAMPLE_WIDTH,
    synthesize_stub_provider_audio,
)
from app.domain.voice.session import (
    VoiceEvent,
    VoiceEventType,
    VoiceSession,
    VoiceSessionContext,
)
from app.integrations.gemini.live import (
    build_activity_end_message,
    build_activity_start_message,
    build_connect_headers,
    build_realtime_audio_message,
    build_realtime_text_message,
    build_setup_message,
    dumps_message,
    parse_server_message,
)


class GeminiLiveVoiceSession(VoiceSession):
    """
    Gemini Live adapter with live transport support and a safe local stub fallback.
    """

    def __init__(self, settings: Settings, *, context: VoiceSessionContext) -> None:
        self._settings = settings
        self._context = context
        self._connected = False
        self._events: asyncio.Queue[VoiceEvent] = asyncio.Queue()
        self._mode = self._resolve_mode()
        self._websocket: Any | None = None
        self._receiver_task: asyncio.Task[None] | None = None
        self._stub_audio_buffer = bytearray()
        self._stub_activity_open = False

    async def connect(self) -> None:
        requested_mode = self._mode
        if requested_mode == "live":
            await self._connect_live()
            return

        if requested_mode == "auto" and self._settings.gemini_api_key:
            try:
                await self._connect_live()
                return
            except Exception as exc:
                await self._push_event(
                    VoiceEvent(
                        event_type=VoiceEventType.OUTPUT_TRANSCRIPT,
                        payload={
                            "text": (
                                "Gemini Live transport was unavailable, so the local stub "
                                "fallback is active."
                            ),
                            "fallback_reason": str(exc),
                        },
                    )
                )

        self._connect_stub()

    async def send_audio(self, chunk: bytes) -> None:
        if not self._connected:
            raise RuntimeError("Gemini session is not connected.")

        if self._websocket is not None:
            await self._websocket.send(dumps_message(build_realtime_audio_message(chunk)))
            return

        if chunk:
            self._stub_audio_buffer.extend(chunk)

    async def start_activity(self) -> None:
        if not self._connected:
            raise RuntimeError("Gemini session is not connected.")

        if self._websocket is not None:
            await self._websocket.send(dumps_message(build_activity_start_message()))
            return

        self._stub_activity_open = True
        self._stub_audio_buffer.clear()

    async def end_activity(self) -> None:
        if not self._connected:
            raise RuntimeError("Gemini session is not connected.")

        if self._websocket is not None:
            await self._websocket.send(dumps_message(build_activity_end_message()))
            return

        await self._flush_stub_audio_turn()

    async def send_text(self, text: str) -> None:
        if not self._connected:
            raise RuntimeError("Gemini session is not connected.")

        if self._websocket is not None:
            await self._websocket.send(dumps_message(build_realtime_text_message(text)))
            return

        await self._emit_stub_turn(
            caller_text=text,
            assistant_text=self._build_assistant_response(text),
        )

    async def receive_event(self) -> VoiceEvent:
        return await self._events.get()

    async def close(self) -> None:
        self._connected = False
        if self._receiver_task is not None:
            self._receiver_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._receiver_task
            self._receiver_task = None
        if self._websocket is not None:
            await self._websocket.close()
            self._websocket = None

    async def _connect_live(self) -> None:
        if not self._settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is required for live transport.")

        self._websocket = await websockets.connect(
            self._settings.gemini_live_endpoint,
            additional_headers=build_connect_headers(self._settings),
            max_size=None,
        )
        await self._websocket.send(
            dumps_message(build_setup_message(self._settings, self._context))
        )
        setup_raw = await self._websocket.recv()
        for event in parse_server_message(_safe_json_loads(setup_raw)):
            await self._push_event(event)
        self._receiver_task = asyncio.create_task(self._receive_loop())
        self._connected = True

    def _connect_stub(self) -> None:
        self._connected = True
        self._push_stub_event(
            VoiceEvent(
                event_type=VoiceEventType.OUTPUT_TRANSCRIPT,
                payload={
                    "text": self._build_welcome_text(),
                    "model": self._settings.gemini_model,
                    "clinic_name": self._context.clinic_name,
                    "transport": "stub",
                },
            )
        )

    async def _receive_loop(self) -> None:
        assert self._websocket is not None
        try:
            async for raw_message in self._websocket:
                for event in parse_server_message(_safe_json_loads(raw_message)):
                    await self._push_event(event)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await self._push_event(
                VoiceEvent(
                    event_type=VoiceEventType.ERROR,
                    payload={"message": str(exc)},
                )
            )

    async def _push_event(self, event: VoiceEvent) -> None:
        await self._events.put(event)

    def _push_stub_event(self, event: VoiceEvent) -> None:
        self._events.put_nowait(event)

    def _resolve_mode(self) -> str:
        mode = self._settings.gemini_live_transport.lower()
        if mode not in {"auto", "live", "stub"}:
            return "auto"
        return mode

    def _build_welcome_text(self) -> str:
        capability_summary = _join_actions(self._context.supported_actions)
        after_hours_note = (
            " After-hours overflow is enabled."
            if self._context.after_hours_enabled
            else " This clinic currently routes after-hours follow-up to the team."
        )

        base = self._context.welcome_message.strip() or (
            f"Thanks for calling {self._context.clinic_name}."
        )
        if capability_summary:
            return f"{base} Right now I can {capability_summary}.{after_hours_note}"
        return f"{base}{after_hours_note}"

    def _build_assistant_response(self, caller_text: str = "") -> str:
        actions = self._context.supported_actions
        lower_caller_text = caller_text.lower()

        if "late" in lower_caller_text:
            return (
                "Thanks for letting us know. I can note that you are running late and pass that "
                "straight to the clinic team."
            )
        if any(term in lower_caller_text for term in ("reschedule", "move", "change", "another time")):
            return (
                "I can help with that. Let me capture the appointment you want to move and the "
                "new time that suits you."
            )
        if any(term in lower_caller_text for term in ("cancel", "can't make it", "cannot make it")):
            return (
                "No problem. I can cancel that booking and offer a follow-up to reschedule if "
                "you would like."
            )
        if any(term in lower_caller_text for term in ("who should", "who do i see", "physio or chiro")):
            return (
                "I can help guide that. Tell me a little about what is bothering you and I will "
                "suggest the best practitioner type for the clinic to review."
            )
        if any(term in lower_caller_text for term in ("book", "appointment", "see someone")):
            return (
                "Absolutely. I can help book an appointment and check which clinician or time "
                "would be the best fit."
            )

        if not actions:
            return (
                f"Thanks for calling {self._context.clinic_name}. "
                "I can capture your callback details and have the clinic team follow up."
            )

        response = (
            f"Thanks for calling {self._context.clinic_name}. "
            f"I can {_join_actions(actions)}."
        )
        if self._context.sms_confirmations_enabled:
            response += " I can also help send confirmation follow-ups."
        if not self._context.routing_support_enabled:
            response += " Clinical triage questions will be passed to the team."
        return response

    async def _flush_stub_audio_turn(self) -> None:
        caller_audio = bytes(self._stub_audio_buffer)
        self._stub_audio_buffer.clear()
        self._stub_activity_open = False
        if not caller_audio:
            return

        caller_audio_ms = int(
            (len(caller_audio) / PCM_SAMPLE_WIDTH) / GEMINI_INPUT_SAMPLE_RATE * 1000
        )
        caller_text = (
            "Caller spoke over the microphone in stub mode "
            f"(~{caller_audio_ms}ms of audio)."
        )
        await self._emit_stub_turn(
            caller_text=caller_text,
            assistant_text=self._build_assistant_response(caller_text),
            caller_audio=caller_audio,
        )

    async def _emit_stub_turn(
        self,
        *,
        caller_text: str,
        assistant_text: str,
        caller_audio: bytes | None = None,
    ) -> None:
        assistant_audio = synthesize_stub_provider_audio(assistant_text)
        await self._push_event(
            VoiceEvent(
                event_type=VoiceEventType.INPUT_TRANSCRIPT,
                payload={
                    "text": caller_text,
                    "codec": f"audio/pcm;rate={GEMINI_INPUT_SAMPLE_RATE}",
                    "sample_rate_hz": GEMINI_INPUT_SAMPLE_RATE,
                    "size_bytes": len(caller_audio or b""),
                },
            )
        )
        await self._push_event(
            VoiceEvent(
                event_type=VoiceEventType.OUTPUT_TRANSCRIPT,
                payload={"text": assistant_text},
            )
        )
        await self._push_event(
            VoiceEvent(
                event_type=VoiceEventType.AUDIO_CHUNK,
                payload={
                    "audio_bytes": assistant_audio,
                    "size_bytes": len(assistant_audio),
                    "codec": f"audio/pcm;rate={GEMINI_OUTPUT_SAMPLE_RATE}",
                    "sample_rate_hz": GEMINI_OUTPUT_SAMPLE_RATE,
                    "format": "pcm16le",
                },
            )
        )
        await self._push_event(
            VoiceEvent(
                event_type=VoiceEventType.TURN_COMPLETE,
                payload={"status": "stub_turn_complete"},
            )
        )


def _join_actions(actions: tuple[str, ...]) -> str:
    if not actions:
        return ""
    if len(actions) == 1:
        return actions[0]
    if len(actions) == 2:
        return f"{actions[0]} and {actions[1]}"
    return f"{', '.join(actions[:-1])}, and {actions[-1]}"


def _safe_json_loads(raw_message: Any) -> dict[str, Any]:
    if isinstance(raw_message, bytes):
        raw_message = raw_message.decode("utf-8")
    return _normalize_message_shape(raw_message)


def _normalize_message_shape(raw_message: str) -> dict[str, Any]:
    payload = json.loads(raw_message)
    if isinstance(payload, dict):
        return payload
    raise ValueError("Unexpected Gemini Live message payload.")
