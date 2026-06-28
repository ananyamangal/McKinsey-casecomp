"""Aggregate import of all ORM models so `Base.metadata` is fully populated.

Import this module (or anything from it) before calling
`Base.metadata.create_all()` or running Alembic autogenerate.
"""

from __future__ import annotations

from app.db.models.ai import Agent, AgentAction
from app.db.models.crm import Customer, Vehicle
from app.db.models.finance import Invoice, Payment
from app.db.models.maintenance import PredictedMaintenance
from app.db.models.inventory import (
    InventoryItem,
    InventoryTransaction,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
)
from app.db.models.operations import (
    Appointment,
    ServiceBay,
    Technician,
    WorkOrder,
    WorkOrderItem,
)
from app.db.models.organization import Dealership, Role, User, user_roles
from app.db.models.telematics import Notification, TelematicsEvent
from app.db.models.workflow import (
    AgentExecution,
    AuditLog,
    WorkflowExecution,
    WorkflowStep,
)

__all__ = [
    "Dealership",
    "Role",
    "User",
    "user_roles",
    "Customer",
    "Vehicle",
    "Appointment",
    "WorkOrder",
    "WorkOrderItem",
    "ServiceBay",
    "Technician",
    "InventoryItem",
    "InventoryTransaction",
    "Supplier",
    "PurchaseOrder",
    "PurchaseOrderItem",
    "Invoice",
    "Payment",
    "Notification",
    "TelematicsEvent",
    "AgentExecution",
    "WorkflowExecution",
    "WorkflowStep",
    "AuditLog",
    "Agent",
    "AgentAction",
    "PredictedMaintenance",
]
