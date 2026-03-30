from __future__ import annotations

from app.core.config import Settings
from app.domain.voice.session import VoiceSession, VoiceSessionContext
from app.integrations.gemini.adapter import GeminiLiveVoiceSession


def build_voice_session(
    settings: Settings,
    *,
    context: VoiceSessionContext | None = None,
) -> VoiceSession:
    provider = settings.voice_provider.lower()
    if provider == "gemini":
        return GeminiLiveVoiceSession(settings, context=context or VoiceSessionContext())
    raise ValueError(f"Unsupported voice provider: {settings.voice_provider}")
