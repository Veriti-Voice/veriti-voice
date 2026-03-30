from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional


class JsonStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._path = self._build_store_path()
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._data = self._load()

    def _build_store_path(self) -> Path:
        api_root = Path(__file__).resolve().parents[2]
        return api_root / "data" / "dev_store.json"

    def _empty(self) -> Dict[str, Any]:
        return {
            "call_sessions": {},
            "queue_item_statuses": {},
            "stub_payloads": {},
            "setup_profiles": {},
        }

    def _load(self) -> Dict[str, Any]:
        if not self._path.exists():
            return self._empty()

        try:
            loaded = json.loads(self._path.read_text(encoding="utf-8"))
            return self._normalize(loaded)
        except Exception:
            return self._empty()

    def _normalize(self, loaded: Dict[str, Any]) -> Dict[str, Any]:
        normalized = self._empty()
        normalized.update(loaded)
        normalized["call_sessions"] = dict(normalized.get("call_sessions", {}))
        normalized["queue_item_statuses"] = dict(normalized.get("queue_item_statuses", {}))
        normalized["stub_payloads"] = dict(normalized.get("stub_payloads", {}))
        normalized["setup_profiles"] = dict(normalized.get("setup_profiles", {}))
        return normalized

    def _save(self) -> None:
        self._path.write_text(
            json.dumps(self._data, indent=2, sort_keys=True),
            encoding="utf-8",
        )

    def reset(self) -> None:
        with self._lock:
            self._data = self._empty()
            self._save()

    def get_call_session(self, call_sid: str) -> Optional[Dict[str, Any]]:
        return self._data["call_sessions"].get(call_sid)

    def upsert_call_session(self, call_sid: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self._data["call_sessions"][call_sid] = payload
            self._save()
            return payload

    def list_call_sessions(self) -> List[Dict[str, Any]]:
        return list(self._data["call_sessions"].values())

    def append_stub_payload(self, clinic_key: str, payload: Dict[str, Any]) -> None:
        with self._lock:
            self._data["stub_payloads"].setdefault(clinic_key, []).append(payload)
            self._save()

    def list_stub_payloads(self, clinic_key: str) -> List[Dict[str, Any]]:
        return list(self._data["stub_payloads"].get(clinic_key, []))

    def get_queue_item_status(self, item_id: str) -> Optional[str]:
        return self._data["queue_item_statuses"].get(item_id)

    def upsert_queue_item_status(self, item_id: str, status: str) -> str:
        with self._lock:
            self._data["queue_item_statuses"][item_id] = status
            self._save()
            return status

    def get_setup_profile(self, clinic_key: str) -> Optional[Dict[str, Any]]:
        return self._data["setup_profiles"].get(clinic_key)

    def upsert_setup_profile(self, clinic_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self._data["setup_profiles"][clinic_key] = payload
            self._save()
            return payload


store = JsonStore()
