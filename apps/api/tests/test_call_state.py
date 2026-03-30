from app.domain.calls.state import CallSessionState, can_transition


def test_active_can_move_to_awaiting_tool() -> None:
    assert can_transition(
        CallSessionState.ACTIVE, CallSessionState.AWAITING_TOOL
    )


def test_completed_cannot_move_back_to_active() -> None:
    assert not can_transition(
        CallSessionState.COMPLETED, CallSessionState.ACTIVE
    )
