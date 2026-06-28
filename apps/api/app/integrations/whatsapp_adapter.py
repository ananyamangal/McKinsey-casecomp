"""Mock WhatsApp Business messaging adapter."""

from __future__ import annotations

import uuid

from app.integrations.base import AdapterResponse, MessagingAdapter


class MockWhatsAppAdapter(MessagingAdapter):
    provider = "whatsapp"
    channel = "whatsapp"

    def send(self, *, to: str, body: str, subject: str | None = None) -> AdapterResponse:
        self._log("send", to=to)
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="send",
            external_ref=f"wamid.{uuid.uuid4().hex}",
            data={"to": to, "status": "sent", "channel": self.channel},
        )
