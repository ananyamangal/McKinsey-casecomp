"""Shared Python enums used across SQLAlchemy models.

Stored via SQLAlchemy `Enum(...)`. Values are stored as the *names* by default;
we keep names and values aligned and lowercase for readability in the DB.
"""

from __future__ import annotations

import enum


class AppointmentStatus(str, enum.Enum):
    requested = "requested"
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class WorkOrderStatus(str, enum.Enum):
    draft = "draft"
    open = "open"
    awaiting_parts = "awaiting_parts"
    in_progress = "in_progress"
    completed = "completed"
    invoiced = "invoiced"
    cancelled = "cancelled"


class ServiceBayStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"


class InventoryTransactionType(str, enum.Enum):
    receipt = "receipt"          # parts received from supplier
    issue = "issue"              # parts consumed by a work order
    reservation = "reservation"  # parts soft-reserved for a work order
    adjustment = "adjustment"    # manual stock correction
    return_ = "return"


class PurchaseOrderStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    confirmed = "confirmed"
    partially_received = "partially_received"
    received = "received"
    cancelled = "cancelled"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    issued = "issued"
    paid = "paid"
    partially_paid = "partially_paid"
    void = "void"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    upi = "upi"
    bank_transfer = "bank_transfer"
    wallet = "wallet"


class NotificationChannel(str, enum.Enum):
    whatsapp = "whatsapp"
    sms = "sms"
    email = "email"
    in_app = "in_app"


class NotificationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"


class WorkflowStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    waiting_approval = "waiting_approval"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class StepStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    waiting_approval = "waiting_approval"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"


class AgentExecutionStatus(str, enum.Enum):
    evaluated = "evaluated"
    triggered = "triggered"
    skipped = "skipped"
    error = "error"
