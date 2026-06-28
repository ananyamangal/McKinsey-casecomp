"""Mock SAP ERP adapter."""

from __future__ import annotations

import uuid
from typing import Any

from app.integrations.base import AdapterResponse, ERPAdapter


class MockSAPAdapter(ERPAdapter):
    provider = "sap"

    def sync_purchase_order(self, po: dict[str, Any]) -> AdapterResponse:
        self._log("sync_purchase_order", number=po.get("number"))
        ref = f"SAP-PO-{uuid.uuid4().hex[:8].upper()}"
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="sync_purchase_order",
            external_ref=ref,
            data={"document_number": ref, "status": "POSTED"},
        )

    def sync_invoice(self, invoice: dict[str, Any]) -> AdapterResponse:
        self._log("sync_invoice", number=invoice.get("number"))
        ref = f"SAP-INV-{uuid.uuid4().hex[:8].upper()}"
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="sync_invoice",
            external_ref=ref,
            data={"document_number": ref, "ledger": "AR", "status": "POSTED"},
        )
