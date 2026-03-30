from __future__ import annotations

import asyncio
import base64
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from app.core.config import Settings
from app.core.store import store
from app.schemas.cliniko import (
    AppointmentType,
    AvailabilitySlot,
    BookingPreview,
    BookingRequest,
    ClinikoConnectionStatus,
    Practitioner,
)


class LiveClinikoAdapter:
    adapter_name = "live"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._base_url = _resolve_base_url(settings)

    async def list_practitioners(self, clinic_key: str) -> list[Practitioner]:
        business_id = await self._resolve_business_id()
        response = await self._request_json(f"/businesses/{business_id}/practitioners")
        practitioners = response.get("practitioners", response.get("data", []))
        return [self._parse_practitioner(item) for item in practitioners]

    async def list_appointment_types(self, clinic_key: str) -> list[AppointmentType]:
        response = await self._request_json("/appointment_types")
        appointment_types = response.get("appointment_types", response.get("data", []))
        return [self._parse_appointment_type(item) for item in appointment_types]

    async def list_availability(
        self, clinic_key: str, practitioner_id: Optional[str] = None
    ) -> list[AvailabilitySlot]:
        practitioners = await self.list_practitioners(clinic_key)
        appointment_types = await self.list_appointment_types(clinic_key)

        if not practitioners or not appointment_types:
            return []

        selected_practitioners = (
            [item for item in practitioners if item.practitioner_id == practitioner_id]
            if practitioner_id
            else practitioners[:2]
        )

        business_id = await self._resolve_business_id()
        from_date = datetime.now(timezone.utc).date()
        to_date = from_date + timedelta(days=6)
        slots: list[AvailabilitySlot] = []

        for practitioner in selected_practitioners:
            for appointment_type in appointment_types[:3]:
                try:
                    response = await self._request_json(
                        (
                            f"/businesses/{business_id}/practitioners/{practitioner.practitioner_id}"
                            f"/appointment_types/{appointment_type.appointment_type_id}/available_times"
                        ),
                        query={
                            "from": from_date.isoformat(),
                            "to": to_date.isoformat(),
                            "per_page": "10",
                        },
                    )
                except RuntimeError:
                    continue

                available_times = response.get("available_times", response.get("data", []))
                for index, item in enumerate(available_times[:4]):
                    starts_at = item.get("appointment_start") or item.get("starts_at")
                    if not starts_at:
                        continue
                    slots.append(
                        AvailabilitySlot(
                            slot_id=(
                                f"{practitioner.practitioner_id}-{appointment_type.appointment_type_id}-{index}"
                            ),
                            practitioner_id=practitioner.practitioner_id,
                            appointment_type_id=appointment_type.appointment_type_id,
                            starts_at=str(starts_at),
                        )
                    )

        return slots

    async def preview_booking(self, request: BookingRequest) -> BookingPreview:
        business_id = await self._resolve_business_id()
        patient_payload = _build_patient_payload(request)
        booking_payload = {
            "business_id": business_id,
            "practitioner_id": request.practitioner_id,
            "appointment_type_id": request.appointment_type_id,
            "starts_at": request.starts_at,
            "source": "veriti-voice-overflow-live-preview",
        }

        preview_payload = {
            "patient": patient_payload,
            "appointment": booking_payload,
        }
        notes = [f"Live Cliniko adapter pointed at {self._base_url}."]

        if not self._settings.cliniko_write_enabled:
            store.append_stub_payload(
                request.clinic_key,
                {
                    "action": "create_booking_preview",
                    "adapter": self.adapter_name,
                    "payload": preview_payload,
                },
            )
            return BookingPreview(
                clinic_key=request.clinic_key,
                adapter=self.adapter_name,
                action="create_booking",
                payload=preview_payload,
                status="preview_only",
                will_write=False,
                notes=notes
                + [
                    "Cliniko live mode is connected, but writes are disabled.",
                    "No patient or appointment was created.",
                ],
            )

        patient_response = await self._request_json(
            "/patients",
            method="POST",
            body=patient_payload,
        )
        patient_id = str(patient_response.get("id", ""))
        appointment_payload = {
            **booking_payload,
            "patient_id": patient_id,
        }
        appointment_response = await self._request_json(
            "/individual_appointments",
            method="POST",
            body=appointment_payload,
        )
        appointment_id = str(appointment_response.get("id", ""))

        store.append_stub_payload(
            request.clinic_key,
            {
                "action": "create_booking",
                "adapter": self.adapter_name,
                "payload": {
                    **preview_payload,
                    "patient_id": patient_id,
                    "appointment_id": appointment_id,
                },
            },
        )

        return BookingPreview(
            clinic_key=request.clinic_key,
            adapter=self.adapter_name,
            action="create_booking",
            payload={
                **preview_payload,
                "patient_id": patient_id,
                "appointment_id": appointment_id,
            },
            status="created",
            will_write=True,
            external_id=appointment_id,
            notes=notes + ["Patient and appointment were created in Cliniko."],
        )

    async def get_status(self) -> ClinikoConnectionStatus:
        configured = bool(self._settings.cliniko_api_key and self._base_url)
        notes: list[str] = []
        if not configured:
            notes.append("Cliniko live mode is not fully configured.")
        if configured and not self._settings.cliniko_write_enabled:
            notes.append("Cliniko writes are disabled; booking preview stays read-only.")
        return ClinikoConnectionStatus(
            adapter=self.adapter_name,
            mode="live",
            configured=configured,
            base_url=self._base_url,
            business_id=self._settings.cliniko_business_id,
            write_enabled=self._settings.cliniko_write_enabled,
            notes=notes,
        )

    async def _resolve_business_id(self) -> str:
        if self._settings.cliniko_business_id:
            return self._settings.cliniko_business_id

        response = await self._request_json("/businesses")
        businesses = response.get("businesses", response.get("data", []))
        if not businesses:
            raise RuntimeError("Cliniko returned no businesses.")
        business_id = str(businesses[0].get("id", ""))
        if not business_id:
            raise RuntimeError("Cliniko business id missing from response.")
        return business_id

    async def _request_json(
        self,
        path: str,
        *,
        method: str = "GET",
        query: Optional[dict[str, str]] = None,
        body: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        return await asyncio.to_thread(
            _request_json_sync,
            self._base_url,
            self._settings.cliniko_api_key,
            self._settings.cliniko_user_agent,
            path,
            method,
            query,
            body,
        )

    def _parse_practitioner(self, item: dict[str, Any]) -> Practitioner:
        first_name = str(item.get("first_name", "")).strip()
        last_name = str(item.get("last_name", "")).strip()
        full_name = " ".join(part for part in [first_name, last_name] if part).strip()
        speciality = (
            str(item.get("label") or item.get("title") or "Practitioner").strip()
            or "Practitioner"
        )
        return Practitioner(
            practitioner_id=str(item.get("id", "")),
            name=full_name or str(item.get("name", "Unknown Practitioner")),
            speciality=speciality,
        )

    def _parse_appointment_type(self, item: dict[str, Any]) -> AppointmentType:
        return AppointmentType(
            appointment_type_id=str(item.get("id", "")),
            name=str(item.get("name", "Appointment")),
            duration_minutes=int(
                item.get("appointment_duration_in_minutes")
                or item.get("appointment_duration")
                or item.get("duration_in_minutes")
                or 30
            ),
        )


def _request_json_sync(
    base_url: str,
    api_key: str,
    user_agent: str,
    path: str,
    method: str,
    query: Optional[dict[str, str]],
    body: Optional[dict[str, Any]],
) -> dict[str, Any]:
    if not api_key:
        raise RuntimeError("CLINIKO_API_KEY is required for live Cliniko mode.")
    if not base_url:
        raise RuntimeError("CLINIKO base URL is missing.")

    url = f"{base_url}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"

    credentials = base64.b64encode(f"{api_key}:".encode("utf-8")).decode("ascii")
    headers = {
        "Accept": "application/json",
        "Authorization": f"Basic {credentials}",
        "User-Agent": user_agent,
    }

    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    request = Request(url, data=data, headers=headers, method=method.upper())
    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Cliniko HTTP {exc.code}: {detail or exc.reason}") from exc
    except URLError as exc:
        raise RuntimeError(f"Cliniko connection error: {exc.reason}") from exc

    if not raw:
        return {}
    payload = json.loads(raw)
    if isinstance(payload, dict):
        return payload
    return {"data": payload}


def _resolve_base_url(settings: Settings) -> str:
    if settings.cliniko_base_url:
        return settings.cliniko_base_url.rstrip("/")

    account_url = settings.cliniko_account_url.strip()
    if not account_url:
        return ""

    host = urlparse(account_url).hostname or ""
    parts = host.split(".")
    if len(parts) < 3:
        return ""

    shard = parts[-3] if parts[-3].startswith(("au", "us", "eu", "ca", "uk")) else parts[-2]
    if shard == "cliniko":
        return ""
    return f"https://api.{shard}.cliniko.com/v1"


def _build_patient_payload(request: BookingRequest) -> dict[str, Any]:
    first_name, last_name = _split_name(request.patient_name)
    return {
        "first_name": first_name,
        "last_name": last_name,
        "patient_phone_numbers": [
            {
                "label": "Mobile",
                "number": request.patient_phone,
            }
        ],
    }


def _split_name(name: str) -> tuple[str, str]:
    parts = [part for part in name.strip().split() if part]
    if not parts:
        return "Unknown", "Patient"
    if len(parts) == 1:
        return parts[0], "Patient"
    return parts[0], " ".join(parts[1:])
