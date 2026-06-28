"""Abstract adapter interfaces for all external integrations.

Every adapter is defined as an ABC; the shipped implementations are `Mock*`
classes returning realistic fake responses. Swapping in a real SAP/Twilio/etc.
adapter means implementing the same interface and registering it in the factory.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("halo.integrations")


@dataclass(slots=True)
class AdapterResponse:
    """Uniform envelope returned by every adapter call."""

    ok: bool
    provider: str
    operation: str
    data: dict[str, Any] = field(default_factory=dict)
    external_ref: str | None = None
    error: str | None = None


class BaseAdapter(ABC):
    """Common base for all integration adapters."""

    provider: str = "base"

    def _log(self, operation: str, **kwargs: Any) -> None:
        logger.info("integration provider=%s op=%s args=%s", self.provider, operation, kwargs)


class ERPAdapter(BaseAdapter):
    """ERP / accounting backbone (e.g. SAP)."""

    @abstractmethod
    def sync_purchase_order(self, po: dict[str, Any]) -> AdapterResponse: ...

    @abstractmethod
    def sync_invoice(self, invoice: dict[str, Any]) -> AdapterResponse: ...


class DMSAdapter(BaseAdapter):
    """Dealer Management System (vehicles, customers, work orders)."""

    @abstractmethod
    def upsert_work_order(self, work_order: dict[str, Any]) -> AdapterResponse: ...

    @abstractmethod
    def get_vehicle(self, vin: str) -> AdapterResponse: ...


class TelematicsAdapter(BaseAdapter):
    """Vehicle telematics ingestion (AIS-140 compliant)."""

    @abstractmethod
    def fetch_latest(self, vehicle_id: str) -> AdapterResponse: ...


class MessagingAdapter(BaseAdapter):
    """Outbound customer messaging (WhatsApp / SMS / Email)."""

    channel: str = "generic"

    @abstractmethod
    def send(self, *, to: str, body: str, subject: str | None = None) -> AdapterResponse: ...
