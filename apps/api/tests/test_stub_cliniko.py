import asyncio

from app.integrations.cliniko.stub import StubClinikoAdapter
from app.schemas.cliniko import BookingRequest


def test_stub_adapter_lists_seed_data() -> None:
    adapter = StubClinikoAdapter()

    practitioners = asyncio.run(adapter.list_practitioners("demo-clinic"))
    appointment_types = asyncio.run(adapter.list_appointment_types("demo-clinic"))
    availability = asyncio.run(adapter.list_availability("demo-clinic"))

    assert len(practitioners) >= 1
    assert len(appointment_types) >= 1
    assert len(availability) >= 1


def test_stub_booking_preview_returns_payload() -> None:
    adapter = StubClinikoAdapter()

    preview = asyncio.run(
        adapter.preview_booking(
            BookingRequest(
                patient_name="Taylor Morgan",
                patient_phone="+61412345678",
                practitioner_id="prac-001",
                appointment_type_id="appt-001",
                starts_at="2026-03-30T09:00:00+11:00",
            )
        )
    )

    assert preview.adapter == "stub"
    assert preview.action == "create_booking"
    assert preview.payload["patient_name"] == "Taylor Morgan"
