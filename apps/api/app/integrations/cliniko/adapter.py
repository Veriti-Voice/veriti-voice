from __future__ import annotations

from typing import Optional, Protocol

from app.schemas.cliniko import (
    AppointmentType,
    AvailabilitySlot,
    BookingPreview,
    BookingRequest,
    ClinikoConnectionStatus,
    Practitioner,
)


class ClinikoAdapter(Protocol):
    adapter_name: str

    async def list_practitioners(self, clinic_key: str) -> list[Practitioner]:
        ...

    async def list_appointment_types(self, clinic_key: str) -> list[AppointmentType]:
        ...

    async def list_availability(
        self, clinic_key: str, practitioner_id: Optional[str] = None
    ) -> list[AvailabilitySlot]:
        ...

    async def preview_booking(self, request: BookingRequest) -> BookingPreview:
        ...

    async def get_status(self) -> ClinikoConnectionStatus:
        ...
