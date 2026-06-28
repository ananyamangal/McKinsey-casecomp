"""Workflow step handlers — PURE, MANUAL-EXECUTABLE BUSINESS LOGIC.

Every function here is AI-free. Each one is a plain callable that:
  * receives the mutable workflow ``context`` dict,
  * performs a deterministic business operation (using adapters / mock services),
  * returns an output dict (merged back into context by the engine),
  * raises an exception to fail the step (the engine handles retry/persistence).

A human operator could call any of these directly today. The Workflow Engine
simply sequences and persists them; the AI layer only decides *when* to start
the workflow.
"""

from __future__ import annotations

import logging
import random
from typing import Any

from app.integrations.registry import (
    get_dms_adapter,
    get_erp_adapter,
    get_messaging_adapter,
)

logger = logging.getLogger("halo.workflows.steps")

# A step handler takes the context and returns an output dict.
StepContext = dict[str, Any]


def _ref(prefix: str) -> str:
    return f"{prefix}-{random.randint(10000, 99999)}"


def detect_brake_wear(ctx: StepContext) -> dict[str, Any]:
    """Confirm the maintenance condition from the latest telematics reading."""
    brake_life = int(ctx.get("brake_life_pct", 18))
    needs_service = brake_life < 25
    return {
        "condition": "brake_wear",
        "brake_life_pct": brake_life,
        "needs_service": needs_service,
        "recommended_part_sku": "BRK-PAD-001",
        "recommended_qty": 1,
    }


def check_inventory(ctx: StepContext) -> dict[str, Any]:
    """Check parts availability for the recommended SKU (mock)."""
    sku = ctx.get("recommended_part_sku", "BRK-PAD-001")
    qty_needed = int(ctx.get("recommended_qty", 1))
    on_hand = int(ctx.get("_mock_on_hand", 0))
    in_stock = on_hand >= qty_needed
    return {
        "sku": sku,
        "qty_needed": qty_needed,
        "qty_on_hand": on_hand,
        "in_stock": in_stock,
        "needs_purchase": not in_stock,
    }


def check_workshop_availability(ctx: StepContext) -> dict[str, Any]:
    """Find the next free service bay + technician (mock)."""
    return {
        "service_bay": "BAY-2",
        "technician": "Ramesh Kumar",
        "next_slot": "2026-07-02T10:00:00+05:30",
        "available": True,
    }


def generate_estimate(ctx: StepContext) -> dict[str, Any]:
    """Build a customer estimate. Amounts in integer minor units (paise)."""
    parts_minor = 280_000  # ₹2,800
    labor_minor = 90_000   # ₹900
    tax_minor = int((parts_minor + labor_minor) * 0.18)
    total_minor = parts_minor + labor_minor + tax_minor
    return {
        "estimate_id": _ref("EST"),
        "parts_minor": parts_minor,
        "labor_minor": labor_minor,
        "tax_minor": tax_minor,
        "total_minor": total_minor,
        "currency": "INR",
    }


def customer_approval(ctx: StepContext) -> dict[str, Any]:
    """Send the estimate and record the human approval result.

    The engine pauses this step (requires_approval=True) until a human resumes
    it; by the time this handler runs the approval has been granted.
    """
    adapter = get_messaging_adapter("whatsapp")
    phone = ctx.get("customer_phone", "+910000000000")
    total = ctx.get("total_minor", 0) / 100
    resp = adapter.send(
        to=phone,
        body=f"Your service estimate is INR {total:,.2f}. Reply YES to approve.",
    )
    return {
        "approved": True,
        "approved_by": ctx.get("approved_by", "customer"),
        "notification_ref": resp.external_ref,
    }


def create_purchase_order(ctx: StepContext) -> dict[str, Any]:
    """Raise a PO with the supplier and sync to ERP (mock)."""
    if not ctx.get("needs_purchase", False):
        return {"skipped": True, "reason": "parts already in stock"}
    erp = get_erp_adapter("sap")
    number = _ref("PO")
    sync = erp.sync_purchase_order(
        {"number": number, "sku": ctx.get("sku"), "qty": ctx.get("qty_needed", 1)}
    )
    return {
        "purchase_order_number": number,
        "erp_ref": sync.external_ref,
        "status": "submitted",
    }


def reserve_parts(ctx: StepContext) -> dict[str, Any]:
    """Soft-reserve parts against the work order (mock)."""
    return {
        "reserved": True,
        "sku": ctx.get("sku", "BRK-PAD-001"),
        "qty": ctx.get("qty_needed", 1),
        "reservation_ref": _ref("RES"),
    }


def book_appointment(ctx: StepContext) -> dict[str, Any]:
    """Book the service appointment in the chosen bay (mock)."""
    return {
        "appointment_id": _ref("APT"),
        "service_bay": ctx.get("service_bay", "BAY-2"),
        "technician": ctx.get("technician", "Ramesh Kumar"),
        "slot": ctx.get("next_slot"),
        "status": "scheduled",
    }


def service_completed(ctx: StepContext) -> dict[str, Any]:
    """Mark the work order complete and sync to the DMS (mock)."""
    dms = get_dms_adapter("dms")
    number = _ref("WO")
    sync = dms.upsert_work_order({"number": number, "status": "completed"})
    return {
        "work_order_number": number,
        "dms_ref": sync.external_ref,
        "status": "completed",
    }


def invoice_generated(ctx: StepContext) -> dict[str, Any]:
    """Generate the customer invoice (mock)."""
    return {
        "invoice_number": _ref("INV"),
        "total_minor": ctx.get("total_minor", 0),
        "currency": "INR",
        "status": "issued",
    }


def erp_sync(ctx: StepContext) -> dict[str, Any]:
    """Final post of the invoice to the ERP ledger (mock)."""
    erp = get_erp_adapter("sap")
    sync = erp.sync_invoice(
        {"number": ctx.get("invoice_number"), "total_minor": ctx.get("total_minor", 0)}
    )
    return {"erp_invoice_ref": sync.external_ref, "synced": True}
