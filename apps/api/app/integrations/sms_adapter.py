"""Mock SMS messaging adapter."""

from __future__ import annotations

import uuid

from app.integrations.base import AdapterResponse, MessagingAdapter


class MockSMSAdapter(MessagingAdapter):
    provider = "sms"
    channel = "sms"

    def send(self, *, to: str, body: str, subject: str | None = None) -> AdapterResponse:
        self._log("send", to=to)
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="send",
            external_ref=f"SM{uuid.uuid4().hex[:20]}",
            data={"to": to, "status": "queued", "channel": self.channel},
        )
