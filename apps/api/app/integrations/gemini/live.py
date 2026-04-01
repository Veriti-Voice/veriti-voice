from __future__ import annotations

import base64
import json
from typing import Any, Iterable, List

from app.core.config import Settings
from app.domain.voice.audio import GEMINI_INPUT_SAMPLE_RATE, GEMINI_OUTPUT_SAMPLE_RATE
from app.domain.voice.session import VoiceEvent, VoiceEventType, VoiceSessionContext

GEMINI_LIVE_ENDPOINT = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)


def build_connect_headers(settings: Settings) -> dict[str, str]:
    return {"x-goog-api-key": settings.gemini_api_key}


def build_setup_message(settings: Settings, context: VoiceSessionContext) -> dict[str, Any]:
    generation_config: dict[str, Any] = {
        "responseModalities": ["AUDIO"],
    }
    if settings.gemini_live_max_output_tokens:
        generation_config["maxOutputTokens"] = settings.gemini_live_max_output_tokens
    if settings.gemini_live_voice_name:
        generation_config["speechConfig"] = {
            "voiceConfig": {
                "prebuiltVoiceConfig": {
                    "voiceName": settings.gemini_live_voice_name,
                }
            }
        }

    if context.activity_mode == "automatic":
        realtime_input_config: dict[str, Any] = {
            "automaticActivityDetection": {
                "disabled": False,
                "startOfSpeechSensitivity": settings.gemini_live_vad_start_sensitivity,
                "endOfSpeechSensitivity": settings.gemini_live_vad_end_sensitivity,
                "prefixPaddingMs": settings.gemini_live_vad_prefix_padding_ms,
                "silenceDurationMs": settings.gemini_live_vad_silence_duration_ms,
            },
            "activityHandling": settings.gemini_live_activity_handling,
            "turnCoverage": settings.gemini_live_turn_coverage,
        }
    else:
        realtime_input_config = {
            "automaticActivityDetection": {
                "disabled": True,
            }
        }

    return {
        "setup": {
            "model": normalize_model_name(settings.gemini_model),
            "generationConfig": generation_config,
            "systemInstruction": {
                "parts": [
                    {
                        "text": build_system_instruction(context),
                    }
                ]
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "realtimeInputConfig": realtime_input_config,
        }
    }


def build_realtime_audio_message(audio_bytes: bytes) -> dict[str, Any]:
    return {
        "realtimeInput": {
            "audio": {
                "mimeType": f"audio/pcm;rate={GEMINI_INPUT_SAMPLE_RATE}",
                "data": base64.b64encode(audio_bytes).decode("ascii"),
            }
        }
    }


def build_activity_start_message() -> dict[str, Any]:
    return {
        "realtimeInput": {
            "activityStart": {},
        }
    }


def build_activity_end_message() -> dict[str, Any]:
    return {
        "realtimeInput": {
            "activityEnd": {},
        }
    }


def build_audio_stream_end_message() -> dict[str, Any]:
    return {
        "realtimeInput": {
            "audioStreamEnd": True,
        }
    }


def build_realtime_text_message(text: str) -> dict[str, Any]:
    return {
        "realtimeInput": {
            "text": text,
        }
    }


def parse_server_message(message: dict[str, Any]) -> List[VoiceEvent]:
    events: List[VoiceEvent] = []

    if message.get("setupComplete") is not None:
        events.append(
            VoiceEvent(
                event_type=VoiceEventType.OUTPUT_TRANSCRIPT,
                payload={
                    "text": "Gemini Live transport connected.",
                    "transport": "live",
                },
            )
        )
        return events

    server_content = message.get("serverContent")
    if server_content:
        input_transcription = server_content.get("inputTranscription")
        if input_transcription and input_transcription.get("text"):
            events.append(
                VoiceEvent(
                    event_type=VoiceEventType.INPUT_TRANSCRIPT,
                    payload={"text": input_transcription["text"]},
                )
            )

        output_transcription = server_content.get("outputTranscription")
        if output_transcription and output_transcription.get("text"):
            events.append(
                VoiceEvent(
                    event_type=VoiceEventType.OUTPUT_TRANSCRIPT,
                    payload={"text": output_transcription["text"]},
                )
            )

        model_turn = server_content.get("modelTurn", {})
        for part in model_turn.get("parts", []):
            inline_data = part.get("inlineData")
            if inline_data and inline_data.get("data"):
                events.append(
                    VoiceEvent(
                        event_type=VoiceEventType.AUDIO_CHUNK,
                        payload={
                            "audio_bytes": base64.b64decode(inline_data["data"]),
                            "size_bytes": len(base64.b64decode(inline_data["data"])),
                            "codec": inline_data.get(
                                "mimeType",
                                f"audio/pcm;rate={GEMINI_OUTPUT_SAMPLE_RATE}",
                            ),
                            "sample_rate_hz": _sample_rate_from_mime_type(
                                inline_data.get("mimeType", "")
                            )
                            or GEMINI_OUTPUT_SAMPLE_RATE,
                            "format": "pcm16le",
                        },
                    )
                )
            if part.get("text"):
                events.append(
                    VoiceEvent(
                        event_type=VoiceEventType.OUTPUT_TRANSCRIPT,
                        payload={"text": part["text"]},
                    )
                )

        if server_content.get("interrupted"):
            events.append(
                VoiceEvent(
                    event_type=VoiceEventType.INTERRUPTION,
                    payload={"status": "interrupted"},
                )
            )

        if server_content.get("turnComplete"):
            events.append(
                VoiceEvent(
                    event_type=VoiceEventType.TURN_COMPLETE,
                    payload={"status": "live_turn_complete"},
                )
            )

    tool_call = message.get("toolCall")
    if tool_call:
        events.append(
            VoiceEvent(
                event_type=VoiceEventType.TOOL_CALL,
                payload=tool_call,
            )
        )

    return events


def normalize_model_name(model_name: str) -> str:
    if model_name.startswith("models/"):
        return model_name
    return f"models/{model_name}"


def build_system_instruction(context: VoiceSessionContext) -> str:
    lines = [
        f"You are Veriti Voice for {context.clinic_name}.",
        "Speak naturally, warmly, and concisely.",
    ]
    if context.supported_actions:
        lines.append(f"Your enabled actions are: {', '.join(context.supported_actions)}.")
    if context.known_practitioners:
        lines.append(
            "When speaking about bookings or availability, prefer these practitioner names: "
            f"{', '.join(context.known_practitioners)}."
        )
    if context.known_locations:
        lines.append(
            "When speaking about clinic locations or appointment availability, prefer these "
            f"location names: {', '.join(context.known_locations)}."
        )
    if not context.routing_support_enabled:
        lines.append("Do not provide clinical triage advice; escalate those questions to staff.")
    if context.after_hours_enabled:
        lines.append("This clinic supports after-hours overflow handling.")
    if context.sms_confirmations_enabled:
        lines.append("You may mention SMS confirmations and follow-ups when relevant.")
    if context.fallback_number:
        lines.append(f"If escalation is needed, use the clinic fallback number {context.fallback_number}.")
    if context.welcome_message:
        lines.append(f"Preferred greeting guidance: {context.welcome_message}")
    return " ".join(lines)


def dumps_message(message: dict[str, Any]) -> str:
    return json.dumps(message)


def _sample_rate_from_mime_type(mime_type: str) -> int | None:
    marker = "rate="
    if marker not in mime_type:
        return None
    value = mime_type.split(marker, 1)[1]
    digits = []
    for char in value:
        if char.isdigit():
            digits.append(char)
        else:
            break
    if not digits:
        return None
    return int("".join(digits))
