from pathlib import Path
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]
API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(API_ROOT / ".env"), str(REPO_ROOT / ".env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    veriti_env: str = Field(default="development", alias="VERITI_ENV")
    veriti_public_base_url: str = Field(
        default="http://localhost:8000", alias="VERITI_PUBLIC_BASE_URL"
    )
    veriti_allowed_origins: str = Field(
        default="http://localhost:5173", alias="VERITI_ALLOWED_ORIGINS"
    )

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(
        default="gemini-3.1-flash-live-preview", alias="GEMINI_MODEL"
    )
    gemini_live_transport: str = Field(default="auto", alias="GEMINI_LIVE_TRANSPORT")
    gemini_live_voice_name: str = Field(default="", alias="GEMINI_LIVE_VOICE_NAME")
    gemini_live_endpoint: str = Field(
        default=(
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
        ),
        alias="GEMINI_LIVE_ENDPOINT",
    )
    gemini_live_max_output_tokens: int = Field(
        default=1024, alias="GEMINI_LIVE_MAX_OUTPUT_TOKENS"
    )
    voice_provider: str = Field(default="gemini", alias="VOICE_PROVIDER")

    twilio_account_sid: str = Field(default="", alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str = Field(default="", alias="TWILIO_AUTH_TOKEN")
    twilio_phone_number: str = Field(default="", alias="TWILIO_PHONE_NUMBER")
    twilio_webhook_base_url: str = Field(
        default="http://localhost:8000", alias="TWILIO_WEBHOOK_BASE_URL"
    )

    database_url: str = Field(
        default="sqlite:///./veriti_voice.db", alias="DATABASE_URL"
    )

    demo_mode_enabled: bool = Field(default=True, alias="DEMO_MODE_ENABLED")
    demo_clinic_name: str = Field(default="Harbour Physio", alias="DEMO_CLINIC_NAME")
    demo_fallback_number: str = Field(
        default="+61290000000", alias="DEMO_FALLBACK_NUMBER"
    )
    cliniko_mode: str = Field(default="stub", alias="CLINIKO_MODE")
    cliniko_api_key: str = Field(default="", alias="CLINIKO_API_KEY")
    cliniko_account_url: str = Field(default="", alias="CLINIKO_ACCOUNT_URL")
    cliniko_base_url: str = Field(default="", alias="CLINIKO_BASE_URL")
    cliniko_business_id: str = Field(default="", alias="CLINIKO_BUSINESS_ID")
    cliniko_write_enabled: bool = Field(default=False, alias="CLINIKO_WRITE_ENABLED")
    cliniko_user_agent: str = Field(
        default="Veriti Voice Overflow (engineering@veritivoice.dev)",
        alias="CLINIKO_USER_AGENT",
    )

    @property
    def is_development(self) -> bool:
        return self.veriti_env.lower() == "development"

    @property
    def allowed_origins(self) -> List[str]:
        return [item.strip() for item in self.veriti_allowed_origins.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
