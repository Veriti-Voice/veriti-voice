import base64

from app.core.config import Settings
from app.domain.voice.session import VoiceEventType, VoiceSessionContext
from app.integrations.gemini.live import (
    build_audio_stream_end_message,
    build_realtime_audio_message,
    build_setup_message,
    parse_server_message,
)


def test_setup_message_includes_audio_modalities_and_transcriptions() -> None:
    settings = Settings(
        GEMINI_API_KEY="test-key",
        GEMINI_LIVE_VOICE_NAME="Aoede",
    )
    context = VoiceSessionContext(
        clinic_name="Harbour Physio",
        activity_mode="manual",
        welcome_message="Thanks for calling Harbour Physio.",
        supported_actions=("book new appointments", "change existing bookings"),
        fallback_number="+61290000000",
    )

    message = build_setup_message(settings, context)

    assert message["setup"]["model"] == "models/gemini-3.1-flash-live-preview"
    assert message["setup"]["generationConfig"]["responseModalities"] == ["AUDIO"]
    assert message["setup"]["generationConfig"]["speechConfig"]["voiceConfig"][
        "prebuiltVoiceConfig"
    ]["voiceName"] == "Aoede"
    assert message["setup"]["inputAudioTranscription"] == {}
    assert message["setup"]["outputAudioTranscription"] == {}
    assert message["setup"]["realtimeInputConfig"]["automaticActivityDetection"]["disabled"] is True
    assert "book new appointments" in message["setup"]["systemInstruction"]["parts"][0]["text"]


def test_setup_message_includes_automatic_vad_for_call_lab_mode() -> None:
    settings = Settings(
        GEMINI_API_KEY="test-key",
        GEMINI_LIVE_VAD_START_SENSITIVITY="START_SENSITIVITY_HIGH",
        GEMINI_LIVE_VAD_END_SENSITIVITY="END_SENSITIVITY_LOW",
        GEMINI_LIVE_VAD_PREFIX_PADDING_MS=20,
        GEMINI_LIVE_VAD_SILENCE_DURATION_MS=120,
        GEMINI_LIVE_ACTIVITY_HANDLING="START_OF_ACTIVITY_INTERRUPTS",
        GEMINI_LIVE_TURN_COVERAGE="TURN_INCLUDES_ONLY_ACTIVITY",
    )
    context = VoiceSessionContext(
        clinic_name="Harbour Physio",
        activity_mode="automatic",
    )

    message = build_setup_message(settings, context)

    realtime_input_config = message["setup"]["realtimeInputConfig"]
    assert realtime_input_config["automaticActivityDetection"]["disabled"] is False
    assert (
        realtime_input_config["automaticActivityDetection"]["startOfSpeechSensitivity"]
        == "START_SENSITIVITY_HIGH"
    )
    assert (
        realtime_input_config["automaticActivityDetection"]["endOfSpeechSensitivity"]
        == "END_SENSITIVITY_LOW"
    )
    assert realtime_input_config["automaticActivityDetection"]["prefixPaddingMs"] == 20
    assert realtime_input_config["automaticActivityDetection"]["silenceDurationMs"] == 120
    assert realtime_input_config["activityHandling"] == "START_OF_ACTIVITY_INTERRUPTS"
    assert realtime_input_config["turnCoverage"] == "TURN_INCLUDES_ONLY_ACTIVITY"


def test_realtime_audio_message_encodes_pcm_bytes() -> None:
    message = build_realtime_audio_message(b"\x01\x02\x03\x04")

    assert (
        message["realtimeInput"]["audio"]["data"]
        == base64.b64encode(b"\x01\x02\x03\x04").decode("ascii")
    )
    assert message["realtimeInput"]["audio"]["mimeType"] == "audio/pcm;rate=16000"


def test_audio_stream_end_message_marks_realtime_stream_end() -> None:
    message = build_audio_stream_end_message()

    assert message == {"realtimeInput": {"audioStreamEnd": True}}


def test_parse_server_message_extracts_transcripts_audio_and_turn_complete() -> None:
    audio_data = base64.b64encode(b"\x00\x01" * 10).decode("ascii")
    message = {
        "serverContent": {
            "inputTranscription": {"text": "Caller transcript"},
            "outputTranscription": {"text": "Assistant transcript"},
            "modelTurn": {
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": "audio/pcm;rate=24000",
                            "data": audio_data,
                        }
                    }
                ]
            },
            "turnComplete": True,
        }
    }

    events = parse_server_message(message)

    assert [event.event_type for event in events] == [
        VoiceEventType.INPUT_TRANSCRIPT,
        VoiceEventType.OUTPUT_TRANSCRIPT,
        VoiceEventType.AUDIO_CHUNK,
        VoiceEventType.TURN_COMPLETE,
    ]
    assert events[2].payload["sample_rate_hz"] == 24000
    assert events[2].payload["audio_bytes"] == base64.b64decode(audio_data)
