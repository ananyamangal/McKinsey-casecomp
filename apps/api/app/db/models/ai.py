"""AI layer persistence: Agent (mission-control metrics) + AgentAction.

These model the *operational metrics* of the three agents (Aria, Vault,
Cipher) plus a flat feed of actions they have taken. AI decisions are recorded
separately on ``AgentExecution`` (see ``workflow.py``); these tables back the
``/agents`` and ``/agents/actions`` contract endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    pass


class Agent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agents"

    dealership_id: Mapped[str | None] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), nullable=True, index=True
    )
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # aria|vault|cipher
    name: Mapped[str] = mapped_column(String(128))
    domain: Mapped[str] = mapped_column(String(128))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="active")  # active|idle|paused|degraded
    autonomous: Mapped[bool] = mapped_column(Boolean, default=True)
    confidence_pct: Mapped[int] = mapped_column(Integer, default=85)  # 0-100 (serialized /100)
    health_pct: Mapped[int] = mapped_column(Integer, default=98)
    running_tasks: Mapped[int] = mapped_column(Integer, default=0)
    queued_decisions: Mapped[int] = mapped_column(Integer, default=0)
    current_workflow: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_decision: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_action_at: Mapped[datetime | None] = mapped_column(nullable=True)
    cpu_pct: Mapped[int] = mapped_column(Integer, default=0)
    memory_pct: Mapped[int] = mapped_column(Integer, default=0)
    actions_today: Mapped[int] = mapped_column(Integer, default=0)
    success_rate_pct: Mapped[int] = mapped_column(Integer, default=95)


class AgentAction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agent_actions"

    dealership_id: Mapped[str | None] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), nullable=True, index=True
    )
    agent_key: Mapped[str] = mapped_column(String(64), index=True)
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="success")  # success|failed|pending
    module: Mapped[str] = mapped_column(String(128))
