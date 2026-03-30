from __future__ import annotations

import asyncio
import os
import sys
from typing import List

from app.core.config import get_settings
from app.domain.demo.policy import build_voice_session_context, load_demo_setup_profile
from app.domain.voice.factory import build_voice_session
from app.domain.voice.session import VoiceEvent, VoiceEventType


async def main() -> int:
    settings = get_settings()
    profile = load_demo_setup_profile(settings)
    context = build_voice_session_context(profile)

    probe_text = os.getenv(
        "VERITI_GEMINI_PROBE_TEXT",
        "Please introduce yourself and briefly explain what this clinic assistant can help with.",
    )
    max_events = int(os.getenv("VERITI_GEMINI_PROBE_MAX_EVENTS", "20"))

    print(f"Gemini transport mode: {settings.gemini_live_transport}")
    print(f"Gemini model: {settings.gemini_model}")
    print(f"Clinic profile: {profile.clinic_name}")

    if settings.gemini_live_transport == "stub":
        print("Transport is set to stub; this probe will not hit the live Gemini service.")
    if settings.gemini_live_transport == "live" and not settings.gemini_api_key:
        print("GEMINI_API_KEY is required when GEMINI_LIVE_TRANSPORT=live.", file=sys.stderr)
        return 2

    session = build_voice_session(settings, context=context)

    try:
        await session.connect()
        first_event = await asyncio.wait_for(session.receive_event(), timeout=10)
        print_event("connect", first_event)

        await session.send_text(probe_text)

        received: List[VoiceEvent] = []
        while len(received) < max_events:
            event = await asyncio.wait_for(session.receive_event(), timeout=15)
            received.append(event)
            print_event("event", event)

            if event.event_type == VoiceEventType.ERROR:
                return 1
            if event.event_type == VoiceEventType.TURN_COMPLETE:
                return 0

        print("Probe timed out before turn completion.", file=sys.stderr)
        return 1
    except asyncio.TimeoutError:
        print("Probe timed out waiting for Gemini Live events.", file=sys.stderr)
        return 1
    finally:
        await session.close()


def print_event(label: str, event: VoiceEvent) -> None:
    payload = dict(event.payload)
    if "audio_bytes" in payload:
        payload["audio_bytes"] = f"<{len(payload['audio_bytes'])} bytes>"
    print(f"[{label}] {event.event_type.value}: {payload}")


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
