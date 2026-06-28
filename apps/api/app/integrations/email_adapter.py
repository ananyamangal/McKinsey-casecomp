"""Mock email messaging adapter."""

from __future__ import annotations

import uuid

from app.integrations.base import AdapterResponse, MessagingAdapter


class MockEmailAdapter(MessagingAdapter):
    provider = "email"
    channel = "email"

    def send(self, *, to: str, body: str, subject: str | None = None) -> AdapterResponse:
        self._log("send", to=to, subject=subject)
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="send",
            external_ref=f"<{uuid.uuid4().hex}@halo.local>",
            data={"to": to, "subject": subject, "status": "accepted", "channel": self.channel},
        )
