"""Service operations: Appointment, WorkOrder(+items), ServiceBay, Technician."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.models.enums import (
    AppointmentStatus,
    ServiceBayStatus,
    WorkOrderStatus,
)

if TYPE_CHECKING:
    from app.db.models.crm import Customer, Vehicle
    from app.db.models.finance import Invoice
    from app.db.models.inventory import InventoryItem
    from app.db.models.organization import Dealership


class Technician(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "technicians"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    full_name: Mapped[str] = mapped_column(String(255))
    specialization: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    utilization_pct: Mapped[int] = mapped_column(Integer, default=0)
    rating_x10: Mapped[int] = mapped_column(Integer, default=45)  # rating * 10 (0-50)
    jobs_completed_today: Mapped[int] = mapped_column(Integer, default=0)

    dealership: Mapped["Dealership"] = relationship(back_populates="technicians")
    work_orders: Mapped[list["WorkOrder"]] = relationship(back_populates="technician")


class ServiceBay(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "service_bays"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(64))
    status: Mapped[ServiceBayStatus] = mapped_column(
        Enum(ServiceBayStatus), default=ServiceBayStatus.available
    )
    # Live occupancy snapshot (seeded columns; serializer maps to camelCase).
    current_technician_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    current_technician_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_vehicle_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    current_vehicle_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_work_order_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    current_work_order_no: Mapped[str | None] = mapped_column(String(32), nullable=True)
    job_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    progress_pct: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eta_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parts_ready: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="service_bay")


class Appointment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "appointments"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"))
    service_bay_id: Mapped[str | None] = mapped_column(
        ForeignKey("service_bays.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_start: Mapped[datetime | None] = mapped_column(nullable=True)
    scheduled_end: Mapped[datetime | None] = mapped_column(nullable=True)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus), default=AppointmentStatus.requested
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    customer: Mapped["Customer"] = relationship(back_populates="appointments")
    vehicle: Mapped["Vehicle"] = relationship(back_populates="appointments")
    service_bay: Mapped["ServiceBay | None"] = relationship(back_populates="appointments")
    work_order: Mapped["WorkOrder | None"] = relationship(back_populates="appointment")


class WorkOrder(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "work_orders"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"))
    appointment_id: Mapped[str | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    technician_id: Mapped[str | None] = mapped_column(
        ForeignKey("technicians.id", ondelete="SET NULL"), nullable=True
    )
    number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[WorkOrderStatus] = mapped_column(
        Enum(WorkOrderStatus), default=WorkOrderStatus.draft
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Monetary amounts in integer minor units (paise / cents).
    labor_amount_minor: Mapped[int] = mapped_column(Integer, default=0)
    parts_amount_minor: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    customer: Mapped["Customer"] = relationship(back_populates="work_orders")
    vehicle: Mapped["Vehicle"] = relationship(back_populates="work_orders")
    appointment: Mapped["Appointment | None"] = relationship(back_populates="work_order")
    technician: Mapped["Technician | None"] = relationship(back_populates="work_orders")
    items: Mapped[list["WorkOrderItem"]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )
    invoice: Mapped["Invoice | None"] = relationship(back_populates="work_order")

    @property
    def total_amount_minor(self) -> int:
        return self.labor_amount_minor + self.parts_amount_minor


class WorkOrderItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "work_order_items"

    work_order_id: Mapped[str] = mapped_column(
        ForeignKey("work_orders.id", ondelete="CASCADE"), index=True
    )
    inventory_item_id: Mapped[str | None] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price_minor: Mapped[int] = mapped_column(Integer, default=0)
    is_labor: Mapped[bool] = mapped_column(Boolean, default=False)

    work_order: Mapped["WorkOrder"] = relationship(back_populates="items")
    inventory_item: Mapped["InventoryItem | None"] = relationship()

    @property
    def line_total_minor(self) -> int:
        return self.quantity * self.unit_price_minor
