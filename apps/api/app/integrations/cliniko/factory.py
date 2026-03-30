from __future__ import annotations

from app.core.config import Settings
from app.integrations.cliniko.adapter import ClinikoAdapter
from app.integrations.cliniko.live import LiveClinikoAdapter
from app.integrations.cliniko.stub import StubClinikoAdapter


def build_cliniko_adapter(settings: Settings) -> ClinikoAdapter:
    mode = settings.cliniko_mode.lower()
    if mode == "stub":
        return StubClinikoAdapter()
    if mode == "auto":
        if settings.cliniko_api_key and (
            settings.cliniko_base_url or settings.cliniko_account_url
        ):
            return LiveClinikoAdapter(settings)
        return StubClinikoAdapter()
    if mode == "live":
        return LiveClinikoAdapter(settings)
    raise ValueError(f"Unsupported Cliniko mode: {settings.cliniko_mode}")
