"""Customer + Vehicle (CRM / asset) models."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.operations import Appointment, WorkOrder
    from app.db.models.organization import Dealership
    from app.db.models.telematics import TelematicsEvent


class Customer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "customers"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    whatsapp_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    whatsapp_reachable: Mapped[bool] = mapped_column(Boolean, default=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Loyalty / CRM attributes (persisted + seeded; lifetime value is derived from invoices).
    loyalty_tier: Mapped[str] = mapped_column(String(16), default="bronze")
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0)
    satisfaction_score: Mapped[int] = mapped_column(Integer, default=80)  # 0-100
    last_visit_at: Mapped[date | None] = mapped_column(nullable=True)

    dealership: Mapped["Dealership"] = relationship(back_populates="customers")
    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="customer")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="customer")
    work_orders: Mapped[list["WorkOrder"]] = relationship(back_populates="customer")


class Vehicle(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vehicles"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), index=True
    )
    vin: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    chassis_no: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    registration_no: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    make: Mapped[str] = mapped_column(String(64))
    model: Mapped[str] = mapped_column(String(64))
    variant: Mapped[str | None] = mapped_column(String(64), nullable=True)
    color: Mapped[str | None] = mapped_column(String(48), nullable=True)
    year: Mapped[int] = mapped_column(Integer)
    odometer_km: Mapped[int] = mapped_column(Integer, default=0)
    # Telematics-derived health (0-100). Updated by AIS-140 ingestion, NOT by AI.
    brake_life_pct: Mapped[int] = mapped_column(Integer, default=100)
    battery_health_pct: Mapped[int] = mapped_column(Integer, default=100)
    next_service_due: Mapped[date | None] = mapped_column(nullable=True)
    next_service_due_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    warranty_until: Mapped[date | None] = mapped_column(nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    dealership: Mapped["Dealership"] = relationship(back_populates="vehicles")
    customer: Mapped["Customer"] = relationship(back_populates="vehicles")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="vehicle")
    work_orders: Mapped[list["WorkOrder"]] = relationship(back_populates="vehicle")
    telematics_events: Mapped[list["TelematicsEvent"]] = relationship(back_populates="vehicle")
