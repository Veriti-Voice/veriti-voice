import audioop

from app.domain.voice.audio import (
    GEMINI_INPUT_SAMPLE_RATE,
    GEMINI_OUTPUT_SAMPLE_RATE,
    TWILIO_SAMPLE_RATE,
    chunk_telephony_audio,
    gemini_output_to_twilio,
    synthesize_stub_provider_audio,
    synthesize_stub_telephony_audio,
    twilio_to_gemini_input,
)


def test_stub_audio_synthesis_returns_mulaw_bytes() -> None:
    audio_bytes = synthesize_stub_telephony_audio("Testing outbound assistant audio")

    assert len(audio_bytes) > 0
    decoded_pcm = audioop.ulaw2lin(audio_bytes, 2)
    assert len(decoded_pcm) > 0


def test_stub_audio_chunking_splits_into_twilio_friendly_frames() -> None:
    audio_bytes = synthesize_stub_telephony_audio("Testing outbound assistant audio")
    chunks = chunk_telephony_audio(audio_bytes, frame_size=160)

    assert len(chunks) >= 1
    assert all(len(chunk) <= 160 for chunk in chunks)


def test_stub_provider_audio_is_pcm16_at_expected_output_rate() -> None:
    audio_bytes = synthesize_stub_provider_audio("Testing provider audio output")

    assert len(audio_bytes) > 0
    assert len(audio_bytes) % 2 == 0

    sample_count = len(audio_bytes) // 2
    duration_seconds = sample_count / GEMINI_OUTPUT_SAMPLE_RATE

    assert duration_seconds > 0


def test_twilio_input_converts_to_provider_pcm() -> None:
    twilio_audio = synthesize_stub_telephony_audio("Testing inbound conversion")

    provider_audio = twilio_to_gemini_input(twilio_audio)

    assert len(provider_audio) > 0
    assert len(provider_audio) % 2 == 0

    source_ms = len(twilio_audio) / TWILIO_SAMPLE_RATE * 1000
    target_ms = (len(provider_audio) / 2) / GEMINI_INPUT_SAMPLE_RATE * 1000

    assert abs(source_ms - target_ms) < 40


def test_provider_output_converts_to_twilio_mulaw() -> None:
    provider_audio = synthesize_stub_provider_audio("Testing outbound conversion")

    twilio_audio = gemini_output_to_twilio(
        provider_audio, sample_rate=GEMINI_OUTPUT_SAMPLE_RATE
    )

    assert len(twilio_audio) > 0
    decoded_pcm = audioop.ulaw2lin(twilio_audio, 2)
    assert len(decoded_pcm) > 0
