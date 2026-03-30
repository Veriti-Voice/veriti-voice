import base64

from app.integrations.twilio.media import (
    build_clear_event,
    build_mark_event,
    build_media_event,
    decode_audio_payload,
    encode_audio_payload,
)
from app.integrations.twilio.twiml import (
    assess_twilio_readiness,
    build_stream_base_url,
    build_voice_response,
)


def test_audio_payload_round_trip() -> None:
    original = b"hello-audio"

    encoded = encode_audio_payload(original)
    decoded = decode_audio_payload(encoded)

    assert encoded == base64.b64encode(original).decode("ascii")
    assert decoded == original


def test_mark_event_shape() -> None:
    event = build_mark_event("stream-123", "veriti-turn-complete")

    assert event["event"] == "mark"
    assert event["streamSid"] == "stream-123"
    assert event["mark"]["name"] == "veriti-turn-complete"


def test_clear_event_shape() -> None:
    event = build_clear_event("stream-123")

    assert event == {"event": "clear", "streamSid": "stream-123"}


def test_media_event_encodes_audio() -> None:
    event = build_media_event("stream-123", b"demo")

    assert event["event"] == "media"
    assert event["streamSid"] == "stream-123"
    assert event["media"]["payload"] == base64.b64encode(b"demo").decode("ascii")


def test_stream_base_url_uses_wss_for_https() -> None:
    stream_base_url = build_stream_base_url(
        webhook_base_url="https://voice.veriti.example",
        host="localhost",
    )

    assert stream_base_url == "wss://voice.veriti.example"


def test_voice_response_includes_stream_status_callback() -> None:
    twiml = build_voice_response(
        webhook_base_url="https://voice.veriti.example",
        call_sid="call-123",
        from_number="+61400000000",
        to_number="+61290000000",
        host="localhost",
    )

    assert 'statusCallback="https://voice.veriti.example/twilio/stream-status"' in twiml
    assert 'url="wss://voice.veriti.example/ws/media?callSid=call-123' in twiml


def test_assess_twilio_readiness_flags_localhost_as_not_ready() -> None:
    status = assess_twilio_readiness(
        webhook_base_url="http://localhost:8000",
        public_base_url="http://localhost:8000",
        phone_number="",
    )

    assert status["ready_for_live_calls"] is False
    assert status["public_webhook_configured"] is False
    assert status["secure_media_stream"] is False
    assert any("phone number" in note.lower() for note in status["notes"])
