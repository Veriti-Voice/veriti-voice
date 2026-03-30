from app.domain.calls.session_manager import CallSessionManager
from app.domain.calls.state import CallSessionState


def test_bootstrap_creates_connecting_session() -> None:
    manager = CallSessionManager()

    session = manager.bootstrap(
        "call-test-001",
        from_number="+61400000001",
        to_number="+61290000000",
        clinic_key="demo-clinic",
    )

    assert session.call_sid == "call-test-001"
    assert session.state == CallSessionState.CONNECTING.value


def test_audio_chunk_increment_moves_session_active() -> None:
    manager = CallSessionManager()
    manager.bootstrap("call-test-002")

    session = manager.increment_audio_chunks("call-test-002")

    assert session is not None
    assert session.inbound_audio_chunk_count == 1
    assert session.state == CallSessionState.ACTIVE.value


def test_outbound_audio_chunk_increment_tracks_assistant_frames() -> None:
    manager = CallSessionManager()
    manager.bootstrap("call-test-003")

    session = manager.increment_outbound_audio_chunks("call-test-003", 4)

    assert session is not None
    assert session.outbound_audio_chunk_count == 4
