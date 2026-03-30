from xml.sax.saxutils import escape


def build_voice_response(
    webhook_base_url: str,
    call_sid: str,
    from_number: str,
    to_number: str,
    host: str,
) -> str:
    stream_url = build_media_stream_url(
        webhook_base_url=webhook_base_url,
        host=host,
        call_sid=call_sid,
        from_number=from_number,
        to_number=to_number,
    )
    status_callback_url = build_stream_status_callback_url(
        webhook_base_url=webhook_base_url,
        host=host,
    )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Hi, you've reached Veriti Voice. This call is handled by an AI assistant and may be recorded.
  </Say>
  <Connect>
    <Stream url="{stream_url}" statusCallback="{status_callback_url}" statusCallbackMethod="POST" />
  </Connect>
  <Pause length="60" />
</Response>
"""


def build_http_base_url(webhook_base_url: str, host: str) -> str:
    base_url = (webhook_base_url or "").rstrip("/")
    if base_url.startswith("http://") or base_url.startswith("https://"):
        return base_url
    if host in {"localhost", "127.0.0.1"}:
        return f"http://{host}:8000"
    return f"https://{host}"


def build_voice_webhook_url(webhook_base_url: str, host: str) -> str:
    return f"{build_http_base_url(webhook_base_url=webhook_base_url, host=host)}/twilio/voice"


def build_stream_base_url(webhook_base_url: str, host: str) -> str:
    http_base_url = build_http_base_url(webhook_base_url=webhook_base_url, host=host)
    if http_base_url.startswith("https://"):
        return "wss://" + http_base_url[len("https://") :]
    if http_base_url.startswith("http://"):
        return "ws://" + http_base_url[len("http://") :]
    return http_base_url


def build_media_stream_url(
    webhook_base_url: str,
    host: str,
    call_sid: str,
    from_number: str,
    to_number: str,
) -> str:
    stream_base_url = build_stream_base_url(webhook_base_url=webhook_base_url, host=host)
    return (
        f"{stream_base_url}/ws/media"
        f"?callSid={escape(call_sid)}&from={escape(from_number)}&to={escape(to_number)}"
    )


def build_stream_status_callback_url(webhook_base_url: str, host: str) -> str:
    return f"{build_http_base_url(webhook_base_url=webhook_base_url, host=host)}/twilio/stream-status"


def assess_twilio_readiness(
    *,
    webhook_base_url: str,
    public_base_url: str,
    phone_number: str,
    host: str = "localhost",
) -> dict[str, object]:
    base_url = (webhook_base_url or public_base_url or "").rstrip("/")
    http_base_url = build_http_base_url(webhook_base_url=base_url, host=host)
    stream_base_url = build_stream_base_url(webhook_base_url=base_url, host=host)
    voice_webhook_url = build_voice_webhook_url(webhook_base_url=base_url, host=host)
    media_stream_websocket_url = build_media_stream_url(
        webhook_base_url=base_url,
        host=host,
        call_sid="demo-call",
        from_number="+61000000000",
        to_number=phone_number or "+61000000001",
    )
    stream_status_callback_url = build_stream_status_callback_url(
        webhook_base_url=base_url,
        host=host,
    )

    notes: list[str] = []
    public_webhook_configured = (
        http_base_url.startswith("https://")
        and "localhost" not in http_base_url
        and "127.0.0.1" not in http_base_url
    )
    secure_media_stream = media_stream_websocket_url.startswith("wss://")

    if not phone_number:
        notes.append("Add a Twilio phone number before trying real prospect calls.")
    if not public_webhook_configured:
        notes.append(
            "Set TWILIO_WEBHOOK_BASE_URL or VERITI_PUBLIC_BASE_URL to a public HTTPS URL so Twilio can reach /twilio/voice."
        )
    if not secure_media_stream:
        notes.append("The media stream must resolve to wss:// for Twilio bidirectional streaming.")
    if public_webhook_configured and secure_media_stream:
        notes.append(
            "Point the Twilio number voice webhook at the generated /twilio/voice URL and keep the stream status callback enabled."
        )

    ready_for_live_calls = bool(phone_number) and public_webhook_configured and secure_media_stream

    return {
        "phone_number": phone_number,
        "voice_webhook_url": voice_webhook_url,
        "media_stream_websocket_url": media_stream_websocket_url,
        "stream_status_callback_url": stream_status_callback_url,
        "ready_for_live_calls": ready_for_live_calls,
        "public_webhook_configured": public_webhook_configured,
        "secure_media_stream": secure_media_stream,
        "notes": notes,
    }
