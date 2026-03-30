from __future__ import annotations

import base64
from typing import Any, Dict


def decode_audio_payload(payload: str) -> bytes:
    if not payload:
        return b""
    return base64.b64decode(payload)


def encode_audio_payload(audio_bytes: bytes) -> str:
    if not audio_bytes:
        return ""
    return base64.b64encode(audio_bytes).decode("ascii")


def build_mark_event(stream_sid: str, name: str) -> Dict[str, Any]:
    return {
        "event": "mark",
        "streamSid": stream_sid,
        "mark": {"name": name},
    }


def build_clear_event(stream_sid: str) -> Dict[str, Any]:
    return {
        "event": "clear",
        "streamSid": stream_sid,
    }


def build_media_event(stream_sid: str, audio_bytes: bytes) -> Dict[str, Any]:
    return {
        "event": "media",
        "streamSid": stream_sid,
        "media": {
            "payload": encode_audio_payload(audio_bytes),
        },
    }
