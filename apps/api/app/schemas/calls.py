from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


class CallSessionRecord(BaseModel):
    call_sid: str
    from_number: str = ""
    to_number: str = ""
    stream_sid: str = ""
    clinic_key: str = "demo-clinic"
    state: str = "ringing"
    transcript_events: list[dict[str, str]] = Field(default_factory=list)
    inbound_audio_chunk_count: int = 0
    outbound_audio_chunk_count: int = 0
    action_required: bool = False
    priority: Literal["low", "medium", "high"] = "low"
    caller_name: str = ""
    captured_intent: str = ""
    status_summary: str = ""


class MediaStreamEnvelope(BaseModel):
    event: str
    sequenceNumber: Optional[str] = None
    streamSid: Optional[str] = None
    text: Optional[str] = None
    start: Optional[Dict[str, Any]] = None
    media: Optional[Dict[str, Any]] = None
    stop: Optional[Dict[str, Any]] = None
