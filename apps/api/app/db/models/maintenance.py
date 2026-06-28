"""Predicted maintenance forecasts (per vehicle component)."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    pass


class PredictedMaintenance(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "predicted_maintenance"

    vehicle_id: Mapped[str] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), index=True
    )
    component: Mapped[str] = mapped_column(String(128))
    remaining_pct: Mapped[int] = mapped_column(Integer, default=0)
    predicted_due: Mapped[date] = mapped_column()
    estimated_cost_minor: Mapped[int] = mapped_column(Integer, default=0)
    confidence_pct: Mapped[int] = mapped_column(Integer, default=80)  # 0-100 (serialized /100)
