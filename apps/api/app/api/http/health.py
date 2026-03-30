from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthcheck() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.veriti_env,
        "voice_model": settings.gemini_model,
        "voice_provider": settings.voice_provider,
        "gemini_live_transport": settings.gemini_live_transport,
    }
