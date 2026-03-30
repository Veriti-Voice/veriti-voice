import asyncio

from app.core.config import Settings
from app.domain.demo.policy import build_voice_session_context, resolve_simulated_scenario
from app.domain.voice.session import VoiceSessionContext
from app.integrations.gemini.adapter import GeminiLiveVoiceSession
from app.schemas.demo import DemoSetupProfile, SimulatedCallRequest


def test_new_booking_escalates_when_self_serve_booking_disabled() -> None:
    profile = DemoSetupProfile(
        clinic_name="Harbour Physio",
        fallback_number="+61290000000",
        allow_new_bookings=False,
    )

    outcome = resolve_simulated_scenario(
        profile,
        SimulatedCallRequest(scenario="new_booking"),
    )

    assert outcome["action_required"] is True
    assert outcome["priority"] == "medium"
    assert outcome["stub_payload"] is None


def test_voice_session_context_only_includes_enabled_actions() -> None:
    profile = DemoSetupProfile(
        clinic_name="Harbour Physio",
        fallback_number="+61290000000",
        allow_new_bookings=False,
        allow_reschedules=True,
        allow_cancellations=False,
        capture_late_arrivals=True,
        routing_support_enabled=False,
        sms_confirmations_enabled=False,
    )

    context = build_voice_session_context(profile)

    assert "book new appointments" not in context.supported_actions
    assert "change existing bookings" in context.supported_actions
    assert "capture late-arrival notices" in context.supported_actions
    assert "help callers decide who to see" not in context.supported_actions


def test_gemini_stub_uses_context_in_welcome_and_response() -> None:
    context = VoiceSessionContext(
        clinic_name="Harbour Physio",
        welcome_message="Welcome to Harbour Physio.",
        supported_actions=("change existing bookings", "capture late-arrival notices"),
        after_hours_enabled=False,
        routing_support_enabled=False,
        sms_confirmations_enabled=False,
    )

    async def run_session() -> tuple[str, str]:
        session = GeminiLiveVoiceSession(Settings(), context=context)
        await session.connect()
        welcome_event = await session.receive_event()
        await session.send_audio(b"\x00\x00" * 320)
        _input_event = await session.receive_event()
        response_event = await session.receive_event()
        await session.close()
        return (
            welcome_event.payload["text"],
            response_event.payload["text"],
        )

    welcome_text, response_text = asyncio.run(run_session())

    assert "Welcome to Harbour Physio." in welcome_text
    assert "After-hours overflow is enabled" not in welcome_text
    assert "routes after-hours follow-up to the team" in welcome_text
    assert "change existing bookings" in response_text
    assert "Clinical triage questions will be passed to the team." in response_text
