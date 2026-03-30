from fastapi import APIRouter, Form, Request, Response

from app.core.config import get_settings
from app.domain.calls.session_manager import CallSessionManager
from app.integrations.twilio.twiml import build_voice_response

router = APIRouter(prefix="/twilio", tags=["twilio"])
call_session_manager = CallSessionManager()


@router.post("/voice")
async def inbound_voice_webhook(
    request: Request,
    call_sid: str = Form(default=""),
    from_number: str = Form(default="", alias="From"),
    to_number: str = Form(default="", alias="To"),
) -> Response:
    settings = get_settings()
    twiml = build_voice_response(
        webhook_base_url=settings.twilio_webhook_base_url,
        call_sid=call_sid,
        from_number=from_number,
        to_number=to_number,
        host=request.url.hostname or "localhost",
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/stream-status", status_code=204)
async def media_stream_status_webhook(
    call_sid: str = Form(default="", alias="CallSid"),
    stream_sid: str = Form(default="", alias="StreamSid"),
    stream_event: str = Form(default="", alias="StreamEvent"),
    stream_error: str = Form(default="", alias="StreamError"),
) -> Response:
    if call_sid:
        call_session_manager.bootstrap(call_sid, stream_sid=stream_sid)
        event_label = stream_event or "stream-event"
        note = f"Twilio media stream {event_label}"
        if stream_error:
            note = f"{note}: {stream_error}"

        call_session_manager.add_transcript_event(
            call_sid,
            "system",
            note,
            priority="high" if stream_error else "low",
            action_required=bool(stream_error),
        )

        if stream_error:
            call_session_manager.annotate(
                call_sid,
                status_summary=f"Twilio media stream error: {stream_error}",
                priority="high",
                action_required=True,
            )
            call_session_manager.fail(
                call_sid,
                status_summary=f"Twilio media stream error: {stream_error}",
            )
        elif stream_event == "stream-stopped":
            call_session_manager.annotate(
                call_sid,
                status_summary="Twilio media stream stopped cleanly.",
            )
            call_session_manager.complete(call_sid)
        elif stream_event == "stream-started":
            call_session_manager.annotate(
                call_sid,
                status_summary="Twilio media stream started.",
            )

    return Response(status_code=204)
