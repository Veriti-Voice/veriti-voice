from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


class VoiceEventType(str, Enum):
    AUDIO_CHUNK = "audio_chunk"
    INPUT_TRANSCRIPT = "input_transcript"
    OUTPUT_TRANSCRIPT = "output_transcript"
    TOOL_CALL = "tool_call"
    INTERRUPTION = "interruption"
    TURN_COMPLETE = "turn_complete"
    ERROR = "error"


@dataclass
class VoiceEvent:
    event_type: VoiceEventType
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class VoiceSessionContext:
    clinic_key: str = "demo-clinic"
    clinic_name: str = "Demo Clinic"
    welcome_message: str = ""
    supported_actions: tuple[str, ...] = ()
    known_practitioners: tuple[str, ...] = ()
    known_locations: tuple[str, ...] = ()
    after_hours_enabled: bool = True
    routing_support_enabled: bool = True
    sms_confirmations_enabled: bool = True
    fallback_number: str = ""


class VoiceSession(Protocol):
    async def connect(self) -> None:
        ...

    async def start_activity(self) -> None:
        ...

    async def send_audio(self, chunk: bytes) -> None:
        ...

    async def end_activity(self) -> None:
        ...

    async def send_text(self, text: str) -> None:
        ...

    async def receive_event(self) -> VoiceEvent:
        ...

    async def close(self) -> None:
        ...
