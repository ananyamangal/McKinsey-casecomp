"""Workflow engine persistence + AI execution audit + AuditLog.

These tables are the durable backbone of the (AI-free) Workflow Engine.
`AgentExecution` records every AI *decision* separately from execution, keeping
the two layers cleanly decoupled.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.models.enums import (
    AgentExecutionStatus,
    StepStatus,
    WorkflowStatus,
)
from app.db.models.types import JSONType

if TYPE_CHECKING:
    pass


class WorkflowExecution(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single run of a WorkflowDefinition, driven manually by the engine."""

    __tablename__ = "workflow_executions"

    dealership_id: Mapped[str | None] = mapped_column(
        ForeignKey("dealerships.id", ondelete="SET NULL"), nullable=True, index=True
    )
    definition_key: Mapped[str] = mapped_column(String(128), index=True)
    status: Mapped[WorkflowStatus] = mapped_column(
        Enum(WorkflowStatus), default=WorkflowStatus.pending, index=True
    )
    current_step_index: Mapped[int] = mapped_column(Integer, default=0)
    context: Mapped[dict] = mapped_column(JSONType, default=dict)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Optional provenance: which AgentExecution proposed this run (if any).
    triggered_by_agent_execution_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    steps: Mapped[list["WorkflowStep"]] = relationship(
        back_populates="execution",
        cascade="all, delete-orphan",
        order_by="WorkflowStep.index",
    )


class WorkflowStep(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workflow_steps"

    execution_id: Mapped[str] = mapped_column(
        ForeignKey("workflow_executions.id", ondelete="CASCADE"), index=True
    )
    index: Mapped[int] = mapped_column(Integer)
    key: Mapped[str] = mapped_column(String(128))
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[StepStatus] = mapped_column(Enum(StepStatus), default=StepStatus.pending)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    output: Mapped[dict] = mapped_column(JSONType, default=dict)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    execution: Mapped["WorkflowExecution"] = relationship(back_populates="steps")


class AgentExecution(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Audit record of one AI agent evaluation/decision.

    The AI layer ONLY decides; if it triggers a workflow, the resulting
    WorkflowExecution id is recorded here for traceability.
    """

    __tablename__ = "agent_executions"

    dealership_id: Mapped[str | None] = mapped_column(
        ForeignKey("dealerships.id", ondelete="SET NULL"), nullable=True, index=True
    )
    agent_key: Mapped[str] = mapped_column(String(64), index=True)
    domain: Mapped[str] = mapped_column(String(64))
    status: Mapped[AgentExecutionStatus] = mapped_column(
        Enum(AgentExecutionStatus), default=AgentExecutionStatus.evaluated
    )
    decision_should_execute: Mapped[bool] = mapped_column(Boolean, default=False)
    workflow_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    confidence: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    context: Mapped[dict] = mapped_column(JSONType, default=dict)
    triggered_execution_id: Mapped[str | None] = mapped_column(String(36), nullable=True)


class AuditLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    dealership_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(128))  # user email, "system", "agent:aria"
    action: Mapped[str] = mapped_column(String(128), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    data: Mapped[dict] = mapped_column(JSONType, default=dict)
