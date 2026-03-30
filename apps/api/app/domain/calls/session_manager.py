from __future__ import annotations

from typing import Optional

from app.core.store import store
from app.domain.calls.state import CallSessionState
from app.schemas.calls import CallSessionRecord


class CallSessionManager:
    def bootstrap(
        self,
        call_sid: str,
        *,
        from_number: str = "",
        to_number: str = "",
        stream_sid: str = "",
        clinic_key: str = "demo-clinic",
    ) -> CallSessionRecord:
        existing = store.get_call_session(call_sid)
        if existing:
            session = CallSessionRecord.model_validate(existing)
            updated = False

            if from_number and not session.from_number:
                session.from_number = from_number
                updated = True
            if to_number and not session.to_number:
                session.to_number = to_number
                updated = True
            if stream_sid and not session.stream_sid:
                session.stream_sid = stream_sid
                updated = True
            if clinic_key and session.clinic_key == "demo-clinic":
                session.clinic_key = clinic_key
                updated = True

            if updated:
                store.upsert_call_session(call_sid, session.model_dump())
            return session

        session = CallSessionRecord(
            call_sid=call_sid,
            from_number=from_number,
            to_number=to_number,
            stream_sid=stream_sid,
            clinic_key=clinic_key,
            state=CallSessionState.CONNECTING.value,
        )
        store.upsert_call_session(call_sid, session.model_dump())
        return session

    def add_transcript_event(
        self, call_sid: str, speaker: str, text: str, *, priority: str = "low", action_required: bool = False
    ) -> Optional[CallSessionRecord]:
        existing = store.get_call_session(call_sid)
        if not existing:
            return None

        session = CallSessionRecord.model_validate(existing)
        session.transcript_events.append({"speaker": speaker, "text": text})
        session.priority = priority
        session.action_required = action_required
        store.upsert_call_session(call_sid, session.model_dump())
        return session

    def increment_audio_chunks(self, call_sid: str) -> Optional[CallSessionRecord]:
        existing = store.get_call_session(call_sid)
        if not existing:
            return None

        session = CallSessionRecord.model_validate(existing)
        session.inbound_audio_chunk_count += 1
        session.state = CallSessionState.ACTIVE.value
        store.upsert_call_session(call_sid, session.model_dump())
        return session

    def increment_outbound_audio_chunks(
        self, call_sid: str, chunk_count: int
    ) -> Optional[CallSessionRecord]:
        existing = store.get_call_session(call_sid)
        if not existing:
            return None

        session = CallSessionRecord.model_validate(existing)
        session.outbound_audio_chunk_count += chunk_count
        store.upsert_call_session(call_sid, session.model_dump())
        return session

    def annotate(
        self,
        call_sid: str,
        *,
        caller_name: Optional[str] = None,
        captured_intent: Optional[str] = None,
        status_summary: Optional[str] = None,
        priority: Optional[str] = None,
        action_required: Optional[bool] = None,
    ) -> Optional[CallSessionRecord]:
        existing = store.get_call_session(call_sid)
        if not existing:
            return None

        session = CallSessionRecord.model_validate(existing)
        if caller_name is not None:
            session.caller_name = caller_name
        if captured_intent is not None:
            session.captured_intent = captured_intent
        if status_summary is not None:
            session.status_summary = status_summary
        if priority is not None:
            session.priority = priority
        if action_required is not None:
            session.action_required = action_required

        store.upsert_call_session(call_sid, session.model_dump())
        return session

    def complete(self, call_sid: str) -> Optional[CallSessionRecord]:
        existing = store.get_call_session(call_sid)
        if not existing:
            return None

        session = CallSessionRecord.model_validate(existing)
        session.state = CallSessionState.COMPLETED.value
        store.upsert_call_session(call_sid, session.model_dump())
        return session

    def fail(self, call_sid: str, *, status_summary: Optional[str] = None) -> Optional[CallSessionRecord]:
        existing = store.get_call_session(call_sid)
        if not existing:
            return None

        session = CallSessionRecord.model_validate(existing)
        session.state = CallSessionState.FAILED.value
        if status_summary is not None:
            session.status_summary = status_summary
        store.upsert_call_session(call_sid, session.model_dump())
        return session

    def list_sessions(self) -> list[CallSessionRecord]:
        return [CallSessionRecord.model_validate(item) for item in store.list_call_sessions()]

    def get_session(self, call_sid: str) -> Optional[CallSessionRecord]:
        existing = store.get_call_session(call_sid)
        if not existing:
            return None
        return CallSessionRecord.model_validate(existing)
