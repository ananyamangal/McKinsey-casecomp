"""Mock Dealer Management System adapter."""

from __future__ import annotations

import uuid
from typing import Any

from app.integrations.base import AdapterResponse, DMSAdapter


class MockDMSAdapter(DMSAdapter):
    provider = "dms"

    def upsert_work_order(self, work_order: dict[str, Any]) -> AdapterResponse:
        self._log("upsert_work_order", number=work_order.get("number"))
        ref = f"DMS-WO-{uuid.uuid4().hex[:8].upper()}"
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="upsert_work_order",
            external_ref=ref,
            data={"dms_id": ref, "synced": True},
        )

    def get_vehicle(self, vin: str) -> AdapterResponse:
        self._log("get_vehicle", vin=vin)
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="get_vehicle",
            data={
                "vin": vin,
                "make": "Tata",
                "model": "Nexon EV",
                "year": 2023,
                "warranty_active": True,
            },
        )
