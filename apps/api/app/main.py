from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.http.health import router as health_router
from app.api.http.demo import router as demo_router
from app.api.http.twilio import router as twilio_router
from app.api.websocket.call_lab import router as call_lab_router
from app.api.websocket.media import router as media_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Veriti Voice Overflow API",
        version="0.1.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(twilio_router)
    app.include_router(demo_router)
    app.include_router(call_lab_router)
    app.include_router(media_router)
    return app


app = create_app()
