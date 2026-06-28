"""Workflow definitions + registry.

A ``WorkflowDefinition`` is a declarative, ordered list of ``StepDefinition``s.
Each step references a handler from ``app.workflows.steps`` (AI-free business
logic). The engine consumes these definitions; nothing here knows about AI.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from app.workflows import steps

StepHandler = Callable[[dict[str, Any]], dict[str, Any]]


@dataclass(frozen=True, slots=True)
class StepDefinition:
    key: str
    name: str
    handler: StepHandler
    requires_approval: bool = False
    max_attempts: int = 3


@dataclass(frozen=True, slots=True)
class WorkflowDefinition:
    key: str
    name: str
    description: str
    steps: list[StepDefinition] = field(default_factory=list)

    def step_keys(self) -> list[str]:
        return [s.key for s in self.steps]


# --- Flagship workflow: proactive predictive service ------------------------
PROACTIVE_SERVICE = WorkflowDefinition(
    key="proactive_service",
    name="Proactive Service",
    description=(
        "End-to-end predictive maintenance flow triggered when a vehicle's "
        "telematics indicate imminent brake wear. Runs entirely as manual, "
        "AI-free business steps sequenced by the Workflow Engine."
    ),
    steps=[
        StepDefinition("detect_brake_wear", "Detect Brake Wear", steps.detect_brake_wear),
        StepDefinition("check_inventory", "Check Inventory", steps.check_inventory),
        StepDefinition(
            "check_workshop_availability",
            "Check Workshop Availability",
            steps.check_workshop_availability,
        ),
        StepDefinition("generate_estimate", "Generate Estimate", steps.generate_estimate),
        StepDefinition(
            "customer_approval",
            "Customer Approval",
            steps.customer_approval,
            requires_approval=True,
        ),
        StepDefinition(
            "create_purchase_order", "Create Purchase Order", steps.create_purchase_order
        ),
        StepDefinition("reserve_parts", "Reserve Parts", steps.reserve_parts),
        StepDefinition("book_appointment", "Book Appointment", steps.book_appointment),
        StepDefinition("service_completed", "Service Completed", steps.service_completed),
        StepDefinition("invoice_generated", "Invoice Generated", steps.invoice_generated),
        StepDefinition("erp_sync", "ERP Sync", steps.erp_sync),
    ],
)


REGISTRY: dict[str, WorkflowDefinition] = {
    PROACTIVE_SERVICE.key: PROACTIVE_SERVICE,
}


def get_definition(key: str) -> WorkflowDefinition:
    if key not in REGISTRY:
        raise KeyError(f"Unknown workflow definition: {key!r}")
    return REGISTRY[key]


def list_definitions() -> list[WorkflowDefinition]:
    return list(REGISTRY.values())
