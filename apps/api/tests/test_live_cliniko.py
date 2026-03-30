import asyncio
from typing import Optional

from app.core.config import Settings
from app.integrations.cliniko.live import LiveClinikoAdapter, _resolve_base_url
from app.schemas.cliniko import BookingRequest


class FakeLiveClinikoAdapter(LiveClinikoAdapter):
    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)
        self.requests: list[tuple[str, str, Optional[dict]]] = []

    async def _request_json(
        self,
        path: str,
        *,
        method: str = "GET",
        query: Optional[dict[str, str]] = None,
        body: Optional[dict] = None,
    ) -> dict:
        self.requests.append((method, path, body))
        if path == "/businesses":
            return {"businesses": [{"id": 12}]}
        if path == "/businesses/12/practitioners":
            return {
                "practitioners": [
                    {
                        "id": 7,
                        "first_name": "Jordan",
                        "last_name": "Lee",
                        "title": "Physiotherapist",
                    }
                ]
            }
        if path == "/appointment_types":
            return {
                "appointment_types": [
                    {
                        "id": 99,
                        "name": "Initial Consultation",
                        "appointment_duration_in_minutes": 45,
                    }
                ]
            }
        if path.endswith("/available_times"):
            return {
                "available_times": [
                    {"appointment_start": "2026-03-30T09:00:00+11:00"},
                ]
            }
        if path == "/patients":
            return {"id": 555}
        if path == "/individual_appointments":
            return {"id": 777}
        return {}


def test_resolve_base_url_from_account_url() -> None:
    settings = Settings(
        CLINIKO_ACCOUNT_URL="https://your-clinic.au2.cliniko.com",
    )

    assert _resolve_base_url(settings) == "https://api.au2.cliniko.com/v1"


def test_live_adapter_preview_is_safe_when_writes_disabled() -> None:
    adapter = FakeLiveClinikoAdapter(
        Settings(
            CLINIKO_MODE="live",
            CLINIKO_API_KEY="secret",
            CLINIKO_BASE_URL="https://api.au2.cliniko.com/v1",
            CLINIKO_WRITE_ENABLED=False,
        )
    )

    preview = asyncio.run(
        adapter.preview_booking(
            BookingRequest(
                patient_name="Taylor Morgan",
                patient_phone="+61412345678",
                practitioner_id="7",
                appointment_type_id="99",
                starts_at="2026-03-30T09:00:00+11:00",
            )
        )
    )

    assert preview.adapter == "live"
    assert preview.will_write is False
    assert preview.status == "preview_only"
    assert preview.payload["appointment"]["business_id"] == "12"
    assert all(path != "/patients" for _, path, _ in adapter.requests)


def test_live_adapter_creates_records_when_writes_enabled() -> None:
    adapter = FakeLiveClinikoAdapter(
        Settings(
            CLINIKO_MODE="live",
            CLINIKO_API_KEY="secret",
            CLINIKO_BASE_URL="https://api.au2.cliniko.com/v1",
            CLINIKO_WRITE_ENABLED=True,
        )
    )

    preview = asyncio.run(
        adapter.preview_booking(
            BookingRequest(
                patient_name="Taylor Morgan",
                patient_phone="+61412345678",
                practitioner_id="7",
                appointment_type_id="99",
                starts_at="2026-03-30T09:00:00+11:00",
            )
        )
    )

    assert preview.status == "created"
    assert preview.will_write is True
    assert preview.external_id == "777"
    assert any(path == "/patients" for _, path, _ in adapter.requests)
    assert any(path == "/individual_appointments" for _, path, _ in adapter.requests)
