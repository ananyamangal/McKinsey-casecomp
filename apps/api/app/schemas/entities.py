"""Read/write schemas for core business entities."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

_from_attrs = ConfigDict(from_attributes=True)


# --- Customer ---------------------------------------------------------------
class CustomerBase(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    city: str | None = None


class CustomerCreate(CustomerBase):
    dealership_id: str


class CustomerOut(CustomerBase):
    model_config = _from_attrs
    id: str
    dealership_id: str
    is_active: bool


# --- Vehicle ----------------------------------------------------------------
class VehicleBase(BaseModel):
    vin: str
    make: str
    model: str
    year: int
    registration_no: str | None = None
    odometer_km: int = 0
    brake_life_pct: int = 100
    battery_health_pct: int = 100


class VehicleCreate(VehicleBase):
    dealership_id: str
    customer_id: str


class VehicleOut(VehicleBase):
    model_config = _from_attrs
    id: str
    dealership_id: str
    customer_id: str


# --- Inventory --------------------------------------------------------------
class InventoryItemBase(BaseModel):
    sku: str
    name: str
    category: str | None = None
    unit_cost_minor: int = 0
    unit_price_minor: int = 0
    quantity_on_hand: int = 0
    quantity_reserved: int = 0
    reorder_point: int = 5


class InventoryItemCreate(InventoryItemBase):
    dealership_id: str
    supplier_id: str | None = None


class InventoryItemOut(InventoryItemBase):
    model_config = _from_attrs
    id: str
    dealership_id: str
    supplier_id: str | None = None


# --- WorkOrder --------------------------------------------------------------
class WorkOrderItemOut(BaseModel):
    model_config = _from_attrs
    id: str
    description: str
    quantity: int
    unit_price_minor: int
    is_labor: bool


class WorkOrderOut(BaseModel):
    model_config = _from_attrs
    id: str
    number: str
    status: str
    dealership_id: str
    customer_id: str
    vehicle_id: str
    labor_amount_minor: int
    parts_amount_minor: int
    currency: str
    summary: str | None = None
    items: list[WorkOrderItemOut] = []


class WorkOrderCreate(BaseModel):
    dealership_id: str
    customer_id: str
    vehicle_id: str
    summary: str | None = None


# --- Workflow ---------------------------------------------------------------
class WorkflowStepOut(BaseModel):
    model_config = _from_attrs
    id: str
    index: int
    key: str
    name: str
    status: str
    requires_approval: bool
    attempts: int
    output: dict
    error: str | None = None


class WorkflowExecutionOut(BaseModel):
    model_config = _from_attrs
    id: str
    definition_key: str
    status: str
    current_step_index: int
    context: dict
    error: str | None = None
    dealership_id: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    steps: list[WorkflowStepOut] = []


class WorkflowStartRequest(BaseModel):
    definition_key: str = "proactive_service"
    context: dict = {}
    dealership_id: str | None = None


class WorkflowApproveRequest(BaseModel):
    approved_by: str = "owner"


class WorkflowDefinitionOut(BaseModel):
    key: str
    name: str
    description: str
    steps: list[str]


# --- Agents -----------------------------------------------------------------
class AgentOut(BaseModel):
    key: str
    domain: str
    decision_engine: str


class AgentEvaluateRequest(BaseModel):
    agent_key: str
    context: dict = {}
    dealership_id: str | None = None
    execute: bool = False  # if True, trigger proposed workflows


class ProposedActionOut(BaseModel):
    workflow_key: str
    context: dict
    confidence: int
    rationale: str
    triggered_execution_id: str | None = None


class AgentEvaluateResponse(BaseModel):
    agent_key: str
    should_execute: bool
    proposed_actions: list[ProposedActionOut]
