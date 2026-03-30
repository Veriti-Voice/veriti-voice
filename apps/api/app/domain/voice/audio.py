from __future__ import annotations

import audioop
import math
import struct
from typing import List

PCM_SAMPLE_WIDTH = 2
TWILIO_SAMPLE_RATE = 8000
GEMINI_INPUT_SAMPLE_RATE = 16000
GEMINI_OUTPUT_SAMPLE_RATE = 24000
TWILIO_MEDIA_FRAME_SIZE = 160


def twilio_mulaw_to_pcm16(audio_bytes: bytes) -> bytes:
    if not audio_bytes:
        return b""
    return audioop.ulaw2lin(audio_bytes, PCM_SAMPLE_WIDTH)


def pcm16_to_twilio_mulaw(audio_bytes: bytes) -> bytes:
    if not audio_bytes:
        return b""
    return audioop.lin2ulaw(audio_bytes, PCM_SAMPLE_WIDTH)


def resample_pcm16(audio_bytes: bytes, *, source_rate: int, target_rate: int) -> bytes:
    if not audio_bytes or source_rate == target_rate:
        return audio_bytes
    converted, _ = audioop.ratecv(
        audio_bytes,
        PCM_SAMPLE_WIDTH,
        1,
        source_rate,
        target_rate,
        None,
    )
    return converted


def twilio_to_gemini_input(audio_bytes: bytes) -> bytes:
    """
    Convert Twilio media stream audio to Gemini's recommended input format.

    Twilio Media Streams send 8kHz mu-law payloads. Gemini Live best-practices
    in our reference notes recommend 16-bit PCM at 16kHz for input.
    """

    if not audio_bytes:
        return b""
    pcm_8k = twilio_mulaw_to_pcm16(audio_bytes)
    return resample_pcm16(
        pcm_8k,
        source_rate=TWILIO_SAMPLE_RATE,
        target_rate=GEMINI_INPUT_SAMPLE_RATE,
    )


def gemini_output_to_twilio(audio_bytes: bytes, *, sample_rate: int = GEMINI_OUTPUT_SAMPLE_RATE) -> bytes:
    """
    Convert provider PCM output into Twilio-compatible 8kHz mu-law audio.
    """

    if not audio_bytes:
        return b""
    pcm_8k = resample_pcm16(
        audio_bytes,
        source_rate=sample_rate,
        target_rate=TWILIO_SAMPLE_RATE,
    )
    return pcm16_to_twilio_mulaw(pcm_8k)


def synthesize_stub_provider_audio(
    text: str,
    *,
    sample_rate: int = GEMINI_OUTPUT_SAMPLE_RATE,
    tone_ms: int = 180,
    pause_ms: int = 60,
    max_segments: int = 6,
) -> bytes:
    """
    Create short PCM16 provider-style audio for stub assistant turns.

    This mirrors the Gemini Live contract we documented: PCM16 audio out at
    24kHz. The websocket edge still converts this to Twilio's 8kHz mu-law.
    """

    words = max(1, min(max_segments, len(text.split()) or 1))
    segments: List[bytes] = []

    for index in range(words):
        frequency = 440 + (index % 3) * 110
        segments.append(
            _tone_to_pcm16(
                frequency=frequency,
                duration_ms=tone_ms,
                sample_rate=sample_rate,
            )
        )
        if index < words - 1:
            segments.append(_silence_pcm16(duration_ms=pause_ms, sample_rate=sample_rate))

    return b"".join(segments)


def synthesize_stub_telephony_audio(
    text: str,
    *,
    sample_rate: int = GEMINI_OUTPUT_SAMPLE_RATE,
    tone_ms: int = 180,
    pause_ms: int = 60,
    max_segments: int = 6,
) -> bytes:
    """
    Create short mu-law telephony audio for stub assistant turns.

    This is intentionally simple: it generates a sequence of short tones so the
    Twilio media path can exercise real outbound audio frames before the live
    Gemini audio bridge exists.
    """

    provider_audio = synthesize_stub_provider_audio(
        text,
        sample_rate=sample_rate,
        tone_ms=tone_ms,
        pause_ms=pause_ms,
        max_segments=max_segments,
    )
    return gemini_output_to_twilio(provider_audio, sample_rate=sample_rate)


def chunk_telephony_audio(audio_bytes: bytes, *, frame_size: int = TWILIO_MEDIA_FRAME_SIZE) -> List[bytes]:
    if not audio_bytes:
        return []
    return [audio_bytes[i : i + frame_size] for i in range(0, len(audio_bytes), frame_size)]


def _tone_to_pcm16(*, frequency: int, duration_ms: int, sample_rate: int) -> bytes:
    sample_count = max(1, int(sample_rate * duration_ms / 1000))
    amplitude = 12000
    pcm_frames = bytearray()

    for index in range(sample_count):
        value = int(amplitude * math.sin(2 * math.pi * frequency * index / sample_rate))
        pcm_frames.extend(struct.pack("<h", value))

    return bytes(pcm_frames)


def _silence_pcm16(*, duration_ms: int, sample_rate: int) -> bytes:
    sample_count = max(1, int(sample_rate * duration_ms / 1000))
    pcm_frames = b"\x00\x00" * sample_count
    return pcm_frames
