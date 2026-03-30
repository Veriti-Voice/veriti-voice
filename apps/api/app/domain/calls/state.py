from enum import Enum


class CallSessionState(str, Enum):
    RINGING = "ringing"
    CONNECTING = "connecting"
    ACTIVE = "active"
    AWAITING_TOOL = "awaiting_tool"
    ESCALATING = "escalating"
    COMPLETED = "completed"
    FAILED = "failed"


ALLOWED_TRANSITIONS: dict[CallSessionState, set[CallSessionState]] = {
    CallSessionState.RINGING: {CallSessionState.CONNECTING, CallSessionState.FAILED},
    CallSessionState.CONNECTING: {CallSessionState.ACTIVE, CallSessionState.FAILED},
    CallSessionState.ACTIVE: {
        CallSessionState.AWAITING_TOOL,
        CallSessionState.ESCALATING,
        CallSessionState.COMPLETED,
        CallSessionState.FAILED,
    },
    CallSessionState.AWAITING_TOOL: {
        CallSessionState.ACTIVE,
        CallSessionState.ESCALATING,
        CallSessionState.FAILED,
    },
    CallSessionState.ESCALATING: {
        CallSessionState.COMPLETED,
        CallSessionState.FAILED,
    },
    CallSessionState.COMPLETED: set(),
    CallSessionState.FAILED: set(),
}


def can_transition(
    current: CallSessionState, target: CallSessionState
) -> bool:
    return target in ALLOWED_TRANSITIONS[current]
