from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class Practitioner(BaseModel):
    practitioner_id: str
    name: str
    speciality: str
    primary_location_name: str = ""


class AppointmentType(BaseModel):
    appointment_type_id: str
    name: str
    duration_minutes: int


class AvailabilitySlot(BaseModel):
    slot_id: str
    practitioner_id: str
    appointment_type_id: str
    starts_at: str
    practitioner_name: str = ""
    location_name: str = ""


class BookingRequest(BaseModel):
    clinic_key: str = "demo-clinic"
    patient_name: str
    patient_phone: str
    practitioner_id: str
    appointment_type_id: str
    starts_at: str
    practitioner_name: str = ""
    appointment_type_name: str = ""
    location_name: str = ""
    mode: str = Field(default="stub")


class BookingPreview(BaseModel):
    clinic_key: str
    adapter: str
    action: str
    payload: dict
    status: str = "preview_only"
    will_write: bool = False
    external_id: Optional[str] = None
    notes: list[str] = Field(default_factory=list)


class ClinikoConnectionStatus(BaseModel):
    adapter: str
    mode: str
    configured: bool
    base_url: str = ""
    business_id: str = ""
    write_enabled: bool = False
    notes: list[str] = Field(default_factory=list)
