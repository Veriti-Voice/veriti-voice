from __future__ import annotations

from typing import Optional

from app.core.store import store
from app.schemas.cliniko import (
    AppointmentType,
    AvailabilitySlot,
    BookingPreview,
    BookingRequest,
    ClinikoConnectionStatus,
    Practitioner,
)

STUB_PRACTITIONER_DATA = (
    {
        "practitioner_id": "prac-ian-pau",
        "name": "Ian Pau",
        "speciality": "Company Director, Clinical Director & Sports Chiropractor",
        "primary_location_name": "St Leonards",
    },
    {
        "practitioner_id": "prac-sam-behan",
        "name": "Sam Behan",
        "speciality": "Chiropractor",
        "primary_location_name": "Sydney CBD",
    },
    {
        "practitioner_id": "prac-michelle-kim",
        "name": "Michelle Kim",
        "speciality": "Company Director, Clinical Director & Chiropractor",
        "primary_location_name": "Wahroonga",
    },
)

STUB_APPOINTMENT_TYPE_DATA = (
    {
        "appointment_type_id": "appt-001",
        "name": "Initial Consultation",
        "duration_minutes": 45,
    },
    {
        "appointment_type_id": "appt-002",
        "name": "Follow-up Consultation",
        "duration_minutes": 30,
    },
)

STUB_AVAILABILITY_DATA = (
    {
        "slot_id": "slot-ian-001",
        "practitioner_id": "prac-ian-pau",
        "practitioner_name": "Ian Pau",
        "appointment_type_id": "appt-001",
        "location_name": "St Leonards",
        "starts_at": "2026-03-31T10:00:00+11:00",
    },
    {
        "slot_id": "slot-ian-002",
        "practitioner_id": "prac-ian-pau",
        "practitioner_name": "Ian Pau",
        "appointment_type_id": "appt-002",
        "location_name": "St Leonards",
        "starts_at": "2026-03-31T11:30:00+11:00",
    },
    {
        "slot_id": "slot-sam-001",
        "practitioner_id": "prac-sam-behan",
        "practitioner_name": "Sam Behan",
        "appointment_type_id": "appt-001",
        "location_name": "Sydney CBD",
        "starts_at": "2026-04-01T09:30:00+11:00",
    },
    {
        "slot_id": "slot-michelle-001",
        "practitioner_id": "prac-michelle-kim",
        "practitioner_name": "Michelle Kim",
        "appointment_type_id": "appt-001",
        "location_name": "Wahroonga",
        "starts_at": "2026-04-02T08:30:00+11:00",
    },
)


def get_stub_practitioners() -> list[Practitioner]:
    return [Practitioner.model_validate(item) for item in STUB_PRACTITIONER_DATA]


def get_stub_appointment_types() -> list[AppointmentType]:
    return [AppointmentType.model_validate(item) for item in STUB_APPOINTMENT_TYPE_DATA]


def get_stub_availability() -> list[AvailabilitySlot]:
    return [AvailabilitySlot.model_validate(item) for item in STUB_AVAILABILITY_DATA]


class StubClinikoAdapter:
    adapter_name = "stub"

    def __init__(self) -> None:
        self._practitioners = get_stub_practitioners()
        self._appointment_types = get_stub_appointment_types()
        self._availability = get_stub_availability()
        self._practitioner_lookup = {
            practitioner.practitioner_id: practitioner for practitioner in self._practitioners
        }
        self._appointment_lookup = {
            appointment.appointment_type_id: appointment for appointment in self._appointment_types
        }
        self._availability_lookup = {
            (slot.practitioner_id, slot.appointment_type_id, slot.starts_at): slot
            for slot in self._availability
        }

    async def list_practitioners(self, clinic_key: str) -> list[Practitioner]:
        return self._practitioners

    async def list_appointment_types(self, clinic_key: str) -> list[AppointmentType]:
        return self._appointment_types

    async def list_availability(
        self, clinic_key: str, practitioner_id: Optional[str] = None
    ) -> list[AvailabilitySlot]:
        if not practitioner_id:
            return self._availability
        return [slot for slot in self._availability if slot.practitioner_id == practitioner_id]

    async def preview_booking(self, request: BookingRequest) -> BookingPreview:
        practitioner = self._practitioner_lookup.get(request.practitioner_id)
        appointment_type = self._appointment_lookup.get(request.appointment_type_id)
        matched_slot = self._availability_lookup.get(
            (request.practitioner_id, request.appointment_type_id, request.starts_at)
        )
        payload = {
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "practitioner_id": request.practitioner_id,
            "practitioner_name": (
                request.practitioner_name or (practitioner.name if practitioner else "")
            ),
            "appointment_type_id": request.appointment_type_id,
            "appointment_type_name": (
                request.appointment_type_name
                or (appointment_type.name if appointment_type else "")
            ),
            "starts_at": request.starts_at,
            "location_name": (
                request.location_name
                or (matched_slot.location_name if matched_slot else "")
                or (practitioner.primary_location_name if practitioner else "")
            ),
            "source": "veriti-voice-overflow-demo",
        }
        store.append_stub_payload(
            request.clinic_key,
            {
                "action": "create_booking",
                "adapter": self.adapter_name,
                "payload": payload,
            },
        )
        return BookingPreview(
            clinic_key=request.clinic_key,
            adapter=self.adapter_name,
            action="create_booking",
            payload=payload,
            status="preview_only",
            will_write=False,
            notes=["Stub mode only. No data was sent to Cliniko."],
        )

    async def get_status(self) -> ClinikoConnectionStatus:
        return ClinikoConnectionStatus(
            adapter=self.adapter_name,
            mode="stub",
            configured=True,
            write_enabled=False,
            notes=["Stub Cliniko adapter active."],
        )
