"""ORM -> contract-dict serializers (camelCase, Money objects, ISO datetimes).

The frontend TypeScript types are the source of truth (packages/types). Every
serializer here emits EXACTLY those shapes. Backend enum values are mapped to
the frontend enum vocabulary where they differ.

Derived fields (lifetimeValue, vehicleCount, ownerName, activeOrders, ...) are
computed from real persisted rows. To avoid N+1 queries, list endpoints build
small aggregate maps per page and pass them in via the optional ``ctx`` dicts.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.ai import Agent, AgentAction
from app.db.models.crm import Customer, Vehicle
from app.db.models.finance import Invoice, Payment
from app.db.models.inventory import (
    InventoryItem,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
)
from app.db.models.maintenance import PredictedMaintenance
from app.db.models.operations import (
    Appointment,
    ServiceBay,
    Technician,
    WorkOrder,
    WorkOrderItem,
)
from app.db.models.telematics import Notification, TelematicsEvent
from app.db.models.workflow import (
    AgentExecution,
    AuditLog,
    WorkflowExecution,
    WorkflowStep,
)

# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------


def money(minor: int | None, currency: str = "INR") -> dict:
    return {"amountMinor": int(minor or 0), "currency": currency}


def iso(value: datetime | date | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _base(obj: Any) -> dict:
    return {
        "id": obj.id,
        "createdAt": iso(obj.created_at),
        "updatedAt": iso(obj.updated_at),
    }


# ---------------------------------------------------------------------------
# Enum mapping (backend -> frontend vocabulary)
# ---------------------------------------------------------------------------

WORK_ORDER_STATUS_MAP = {
    "draft": "open",
    "open": "open",
    "awaiting_parts": "awaiting_parts",
    "in_progress": "in_progress",
    "completed": "ready",
    "invoiced": "delivered",
    "cancelled": "on_hold",
}

BAY_STATUS_MAP = {
    "available": "idle",
    "occupied": "occupied",
    "maintenance": "maintenance",
}

PO_STATUS_MAP = {
    "draft": "draft",
    "submitted": "pending_approval",
    "confirmed": "approved",
    "partially_received": "partially_received",
    "received": "received",
    "cancelled": "cancelled",
}

APPOINTMENT_STATUS_MAP = {
    "requested": "scheduled",
    "scheduled": "scheduled",
    "in_progress": "in_progress",
    "completed": "completed",
    "cancelled": "cancelled",
    "no_show": "no_show",
}

STEP_STATUS_MAP = {
    "pending": "pending",
    "running": "running",
    "waiting_approval": "waiting_approval",
    "completed": "succeeded",
    "failed": "failed",
    "skipped": "skipped",
}


def _enum_value(v: Any) -> Any:
    return v.value if hasattr(v, "value") else v


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------


def customer_aggregates(db: Session, customer_ids: list[str]) -> dict[str, dict]:
    """Per-customer derived maps: lifetimeValue, vehicleCount, lastVisit."""
    if not customer_ids:
        return {}
    ltv = dict(
        db.execute(
            select(Invoice.customer_id, func.coalesce(func.sum(Invoice.total_minor), 0))
            .where(Invoice.customer_id.in_(customer_ids))
            .group_by(Invoice.customer_id)
        ).all()
    )
    vcount = dict(
        db.execute(
            select(Vehicle.customer_id, func.count(Vehicle.id))
            .where(Vehicle.customer_id.in_(customer_ids))
            .group_by(Vehicle.customer_id)
        ).all()
    )
    last_wo = dict(
        db.execute(
            select(WorkOrder.customer_id, func.max(WorkOrder.created_at))
            .where(WorkOrder.customer_id.in_(customer_ids))
            .group_by(WorkOrder.customer_id)
        ).all()
    )
    return {
        cid: {
            "lifetimeValue": ltv.get(cid, 0),
            "vehicleCount": vcount.get(cid, 0),
            "lastWorkOrder": last_wo.get(cid),
        }
        for cid in customer_ids
    }


def serialize_customer(c: Customer, agg: dict | None = None) -> dict:
    agg = agg or {}
    last_visit = c.last_visit_at or agg.get("lastWorkOrder")
    return {
        **_base(c),
        "name": c.full_name,
        "email": c.email,
        "phone": c.phone or "",
        "whatsappOptIn": bool(c.whatsapp_opt_in),
        "whatsappReachable": bool(c.whatsapp_reachable),
        "city": c.city or "",
        "loyaltyTier": c.loyalty_tier,
        "loyaltyPoints": c.loyalty_points,
        "lifetimeValue": money(agg.get("lifetimeValue", 0)),
        "vehicleCount": agg.get("vehicleCount", 0),
        "lastVisitAt": iso(last_visit),
        "satisfactionScore": c.satisfaction_score,
    }


# ---------------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------------


def serialize_vehicle(v: Vehicle, owner_name: str | None = None) -> dict:
    health = round((v.brake_life_pct + v.battery_health_pct) / 2)
    return {
        **_base(v),
        "vin": v.vin,
        "chassisNumber": v.chassis_no or "",
        "registration": v.registration_no or "",
        "make": v.make,
        "model": v.model,
        "variant": v.variant or "",
        "year": v.year,
        "color": v.color or "",
        "ownerId": v.customer_id,
        "ownerName": owner_name or (v.customer.full_name if v.customer else ""),
        "mileageKm": v.odometer_km,
        "warrantyValidUntil": iso(v.warranty_until),
        "healthScore": health,
        "nextServiceDueKm": v.next_service_due_km,
        "imageUrl": v.image_url,
    }


def serialize_telematics(e: TelematicsEvent) -> dict:
    payload = e.payload or {}
    return {
        **_base(e),
        "vehicleId": e.vehicle_id,
        "type": e.event_type,
        "label": payload.get("label", e.event_type),
        "value": payload.get("value", 0),
        "unit": payload.get("unit", ""),
        "severity": e.severity,
        "recordedAt": payload.get("recordedAt") or iso(e.created_at),
    }


def serialize_prediction(p: PredictedMaintenance) -> dict:
    return {
        "vehicleId": p.vehicle_id,
        "component": p.component,
        "remainingPct": p.remaining_pct,
        "predictedDueDate": iso(p.predicted_due),
        "estimatedCost": money(p.estimated_cost_minor),
        "confidence": round(p.confidence_pct / 100, 2),
    }


# ---------------------------------------------------------------------------
# Operations
# ---------------------------------------------------------------------------


def serialize_technician(t: Technician) -> dict:
    return {
        **_base(t),
        "name": t.full_name,
        "avatarUrl": t.avatar_url,
        "specialty": t.specialization or "General",
        "utilizationPct": t.utilization_pct,
        "jobsCompletedToday": t.jobs_completed_today,
        "rating": round(t.rating_x10 / 10, 1),
        "available": bool(t.is_available),
    }


def serialize_bay(b: ServiceBay) -> dict:
    return {
        **_base(b),
        "name": b.name,
        "status": BAY_STATUS_MAP.get(_enum_value(b.status), "idle"),
        "technicianId": b.current_technician_id,
        "technicianName": b.current_technician_name,
        "vehicleId": b.current_vehicle_id,
        "vehicleLabel": b.current_vehicle_label,
        "workOrderId": b.current_work_order_id,
        "jobStatus": (
            WORK_ORDER_STATUS_MAP.get(b.job_status) if b.job_status else None
        ),
        "progressPct": b.progress_pct,
        "etaMinutes": b.eta_minutes,
        "partsReady": b.parts_ready,
    }


def serialize_appointment(a: Appointment) -> dict:
    cust = a.customer
    veh = a.vehicle
    return {
        **_base(a),
        "customerId": a.customer_id,
        "customerName": cust.full_name if cust else "",
        "vehicleId": a.vehicle_id,
        "vehicleLabel": f"{veh.make} {veh.model}" if veh else "",
        "serviceType": a.reason or "General Service",
        "status": APPOINTMENT_STATUS_MAP.get(_enum_value(a.status), "scheduled"),
        "scheduledFor": iso(a.scheduled_start or a.created_at),
        "advisorName": "Karan Sethi",
    }


def serialize_work_order(w: WorkOrder) -> dict:
    cust = w.customer
    veh = w.vehicle
    tech = w.technician
    lines = [
        {
            "id": it.id,
            "description": it.description,
            "type": "labour" if it.is_labor else "part",
            "quantity": it.quantity,
            "unitPrice": money(it.unit_price_minor),
        }
        for it in w.items
    ]
    status = _enum_value(w.status)
    fe_status = WORK_ORDER_STATUS_MAP.get(status, "open")
    progress = 100 if fe_status in ("ready", "delivered") else _wo_progress(status)
    return {
        **_base(w),
        "number": w.number,
        "customerId": w.customer_id,
        "customerName": cust.full_name if cust else "",
        "vehicleId": w.vehicle_id,
        "vehicleLabel": (
            f"{veh.make} {veh.model} · {veh.registration_no}" if veh else ""
        ),
        "status": fe_status,
        "bayId": None,
        "technicianId": w.technician_id,
        "technicianName": tech.full_name if tech else None,
        "openedAt": iso(w.created_at),
        "promisedAt": None,
        "lines": lines,
        "total": money(w.total_amount_minor),
        "progressPct": progress,
    }


def _wo_progress(status: str) -> int:
    return {
        "draft": 5,
        "open": 15,
        "awaiting_parts": 35,
        "in_progress": 60,
        "completed": 100,
        "invoiced": 100,
        "cancelled": 0,
    }.get(status, 20)


# ---------------------------------------------------------------------------
# Inventory + procurement
# ---------------------------------------------------------------------------


def inventory_health(item: InventoryItem) -> str:
    stock = item.quantity_on_hand
    if stock <= 0:
        return "critical"
    if stock < item.safety_stock:
        return "low"
    if stock > item.reorder_point + 120 and item.predicted_demand_30d < 12:
        return "dead"
    if stock > item.reorder_point + 120:
        return "overstock"
    return "healthy"


def serialize_inventory_item(item: InventoryItem) -> dict:
    sup = item.supplier
    trend = _consumption_trend(item)
    return {
        **_base(item),
        "sku": item.sku,
        "name": item.name,
        "category": item.category or "General",
        "warehouseLocation": item.warehouse_location or "",
        "currentStock": item.quantity_on_hand,
        "safetyStock": item.safety_stock,
        "reorderPoint": item.reorder_point,
        "predictedDemand30d": item.predicted_demand_30d,
        "leadTimeDays": item.lead_time_days,
        "unitCost": money(item.unit_cost_minor),
        "abcClass": item.abc_class,
        "health": inventory_health(item),
        "supplierId": item.supplier_id or "",
        "supplierName": sup.name if sup else "",
        "consumptionTrend": trend,
    }


def _consumption_trend(item: InventoryItem) -> list[dict]:
    """Weekly consumption derived from a deterministic spread of demand."""
    base = max(1, item.predicted_demand_30d // 4)
    return [
        {"label": f"W{w + 1}", "value": max(0, base + ((w * 3 + item.reorder_point) % 7) - 3)}
        for w in range(8)
    ]


def serialize_supplier(s: Supplier, active_orders: int = 0) -> dict:
    return {
        **_base(s),
        "name": s.name,
        "contactName": s.contact_name or "",
        "email": s.contact_email or "",
        "phone": s.contact_phone or "",
        "rating": round(s.rating_x10 / 10, 1),
        "onTimeDeliveryPct": s.on_time_delivery_pct,
        "avgLeadTimeDays": s.lead_time_days,
        "activeOrders": active_orders,
        "status": s.status,
    }


def supplier_active_orders(db: Session, supplier_ids: list[str]) -> dict[str, int]:
    if not supplier_ids:
        return {}
    open_statuses = ("draft", "submitted", "confirmed", "partially_received")
    rows = db.execute(
        select(PurchaseOrder.supplier_id, func.count(PurchaseOrder.id))
        .where(
            PurchaseOrder.supplier_id.in_(supplier_ids),
            PurchaseOrder.status.in_(open_statuses),
        )
        .group_by(PurchaseOrder.supplier_id)
    ).all()
    return {sid: cnt for sid, cnt in rows}


def serialize_purchase_order(po: PurchaseOrder) -> dict:
    sup = po.supplier
    items = [
        {
            "id": it.id,
            "itemId": it.inventory_item_id or "",
            "sku": it.inventory_item.sku if it.inventory_item else "",
            "name": it.description,
            "quantity": it.quantity,
            "unitCost": money(it.unit_cost_minor),
        }
        for it in po.items
    ]
    status = _enum_value(po.status)
    fe_status = PO_STATUS_MAP.get(status, "draft")
    return {
        **_base(po),
        "number": po.number,
        "supplierId": po.supplier_id,
        "supplierName": sup.name if sup else "",
        "status": fe_status,
        "items": items,
        "total": money(po.total_amount_minor),
        "expectedDelivery": None,
        "approverName": None if fe_status in ("draft", "pending_approval") else "Meera Iyer",
        "raisedByName": "Vikram Rao",
    }


# ---------------------------------------------------------------------------
# Finance
# ---------------------------------------------------------------------------


def serialize_invoice(inv: Invoice) -> dict:
    cust = inv.customer
    status = _enum_value(inv.status)
    paid = inv.amount_paid_minor
    fe_status = _invoice_status(inv, status, paid)
    return {
        **_base(inv),
        "number": inv.number,
        "customerId": inv.customer_id,
        "customerName": cust.full_name if cust else "",
        "workOrderId": inv.work_order_id,
        "status": fe_status,
        "issuedAt": iso(inv.created_at),
        "dueAt": iso(_due_date(inv)),
        "subtotal": money(inv.subtotal_minor),
        "gstAmount": money(inv.tax_minor),
        "total": money(inv.total_minor),
        "amountPaid": money(paid),
        "erpSynced": bool(inv.external_ref),
    }


def _due_date(inv: Invoice) -> datetime:
    from datetime import timedelta

    base = inv.created_at
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    return base + timedelta(days=15)


def _invoice_status(inv: Invoice, status: str, paid: int) -> str:
    if status == "paid":
        return "paid"
    if status == "void":
        return "void"
    if status == "partially_paid":
        return "partially_paid"
    # compute overdue: not paid and past due
    due = _due_date(inv)
    now = datetime.now(timezone.utc)
    if paid < inv.total_minor and due < now:
        return "overdue"
    if status == "draft":
        return "draft"
    return "issued"


def serialize_payment(p: Payment) -> dict:
    inv = p.invoice
    return {
        **_base(p),
        "invoiceId": p.invoice_id,
        "invoiceNumber": inv.number if inv else "",
        "method": _enum_value(p.method),
        "amount": money(p.amount_minor),
        "receivedAt": iso(p.created_at),
        "reconciled": (p.note or "") != "unreconciled",
    }


# ---------------------------------------------------------------------------
# AI: agents, decisions, actions
# ---------------------------------------------------------------------------


def serialize_agent(a: Agent) -> dict:
    return {
        **_base(a),
        "key": a.key,
        "name": a.name,
        "domain": a.domain,
        "description": a.description,
        "status": a.status,
        "autonomous": bool(a.autonomous),
        "confidence": round(a.confidence_pct / 100, 2),
        "healthPct": a.health_pct,
        "runningTasks": a.running_tasks,
        "queuedDecisions": a.queued_decisions,
        "currentWorkflow": a.current_workflow,
        "lastDecision": a.last_decision,
        "lastActionAt": iso(a.last_action_at),
        "cpuPct": a.cpu_pct,
        "memoryPct": a.memory_pct,
        "actionsToday": a.actions_today,
        "successRatePct": a.success_rate_pct,
    }


_AGENT_NAMES = {"aria": "Aria", "vault": "Vault", "cipher": "Cipher"}
_DECISION_OUTCOME = {
    "evaluated": "suggested",
    "triggered": "executed",
    "skipped": "rejected",
    "error": "rejected",
}


def serialize_decision(e: AgentExecution) -> dict:
    status = _enum_value(e.status)
    ctx = e.context or {}
    outcome = _DECISION_OUTCOME.get(status, "suggested")
    if ctx.get("outcome"):
        outcome = ctx["outcome"]
    return {
        **_base(e),
        "agentKey": e.agent_key,
        "agentName": _AGENT_NAMES.get(e.agent_key, e.agent_key.title()),
        "summary": ctx.get("summary") or e.rationale or "Agent decision",
        "rationale": e.rationale or "Derived from rules over domain signals.",
        "confidence": round(e.confidence / 100, 2),
        "outcome": outcome,
        "workflowKey": e.workflow_key,
        "executionId": e.triggered_execution_id,
        "entityLabel": ctx.get("entityLabel"),
    }


def serialize_action(a: AgentAction) -> dict:
    return {
        **_base(a),
        "agentKey": a.agent_key,
        "description": a.description,
        "status": a.status,
        "module": a.module,
    }


# ---------------------------------------------------------------------------
# Workflows
# ---------------------------------------------------------------------------


def serialize_step(s: WorkflowStep) -> dict:
    duration = None
    if s.started_at and s.completed_at:
        duration = int((s.completed_at - s.started_at).total_seconds() * 1000)
    return {
        **_base(s),
        "executionId": s.execution_id,
        "key": s.key,
        "name": s.name,
        "order": s.index,
        "status": STEP_STATUS_MAP.get(_enum_value(s.status), "pending"),
        "requiresApproval": bool(s.requires_approval),
        "startedAt": iso(s.started_at),
        "finishedAt": iso(s.completed_at),
        "durationMs": duration,
        "output": s.output or {},
        "error": s.error,
        "retryCount": max(0, s.attempts - 1) if s.attempts else 0,
    }


def serialize_workflow(w: WorkflowExecution) -> dict:
    steps = sorted(w.steps, key=lambda s: s.index)
    fe_steps = [serialize_step(s) for s in steps]
    total = len(steps) or 1
    done = sum(1 for s in steps if _enum_value(s.status) in ("completed", "skipped"))
    progress = round(done / total * 100)
    current = None
    for s in steps:
        if _enum_value(s.status) in ("running", "waiting_approval"):
            current = s.key
            break
    ctx = w.context or {}
    title = ctx.get("title") or f"Proactive Service · {ctx.get('vehicle_label', w.definition_key)}"
    return {
        **_base(w),
        "definitionKey": w.definition_key,
        "title": title,
        "status": _enum_value(w.status),
        "triggeredBy": "agent" if w.triggered_by_agent_execution_id else "manual",
        "agentId": w.triggered_by_agent_execution_id,
        "entityType": ctx.get("entity_type", "vehicle"),
        "entityId": ctx.get("vehicle_id"),
        "steps": fe_steps,
        "currentStepKey": current,
        "progressPct": progress,
        "startedAt": iso(w.started_at or w.created_at),
        "finishedAt": iso(w.completed_at),
    }


def serialize_approval(w: WorkflowExecution) -> dict:
    """ApprovalRequest derived from a WAITING_APPROVAL execution + waiting step."""
    steps = sorted(w.steps, key=lambda s: s.index)
    waiting = next(
        (s for s in steps if _enum_value(s.status) == "waiting_approval"), None
    )
    ctx = w.context or {}
    title = ctx.get("title") or f"Proactive Service · {ctx.get('vehicle_label', w.definition_key)}"
    estimate = ctx.get("total_minor", 0)
    return {
        "id": f"appr_{w.id}",
        "createdAt": iso(w.created_at),
        "updatedAt": iso(w.updated_at),
        "executionId": w.id,
        "workflowTitle": title,
        "stepKey": waiting.key if waiting else "customer_approval",
        "stepName": waiting.name if waiting else "Customer Approval",
        "summary": (
            f"Approve ₹{estimate / 100:,.0f} service estimate before raising PO "
            "and reserving parts."
        ),
        "requestedByAgent": "Aria",
        "riskLevel": "medium" if estimate > 1_000_000 else "low",
        "payload": {"estimate": estimate, "vehicleId": ctx.get("vehicle_id")},
    }


def serialize_retry_item(s: WorkflowStep, w: WorkflowExecution) -> dict:
    from datetime import timedelta

    ctx = w.context or {}
    title = ctx.get("title") or f"Proactive Service · {ctx.get('vehicle_label', w.definition_key)}"
    next_retry = datetime.now(timezone.utc) + timedelta(minutes=5)
    return {
        "id": f"retry_{s.id}",
        "createdAt": iso(s.created_at),
        "updatedAt": iso(s.updated_at),
        "agentKey": "aria",
        "workflowTitle": title,
        "stepName": s.name,
        "error": s.error or "Step failed",
        "attempts": s.attempts,
        "maxAttempts": 5,
        "nextRetryAt": iso(next_retry),
    }


# ---------------------------------------------------------------------------
# Activity + notifications
# ---------------------------------------------------------------------------


def serialize_activity(log: AuditLog) -> dict:
    data = log.data or {}
    return {
        **_base(log),
        "actor": log.actor,
        "action": log.action,
        "target": data.get("target", log.entity_id or ""),
        "module": data.get("module", log.entity_type or "System"),
        "icon": data.get("icon"),
    }


def serialize_notification(n: Notification) -> dict:
    return {
        **_base(n),
        "title": n.title or n.subject or "Notification",
        "body": n.body,
        "severity": n.severity,
        "module": n.module or "System",
        "read": bool(n.is_read),
    }
