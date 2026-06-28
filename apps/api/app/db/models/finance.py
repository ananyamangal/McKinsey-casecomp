"""Finance: Invoice, Payment."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.models.enums import InvoiceStatus, PaymentMethod

if TYPE_CHECKING:
    from app.db.models.crm import Customer
    from app.db.models.operations import WorkOrder


class Invoice(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "invoices"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"))
    work_order_id: Mapped[str | None] = mapped_column(
        ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), default=InvoiceStatus.draft)
    subtotal_minor: Mapped[int] = mapped_column(Integer, default=0)
    tax_minor: Mapped[int] = mapped_column(Integer, default=0)
    total_minor: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    external_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)

    customer: Mapped["Customer"] = relationship()
    work_order: Mapped["WorkOrder | None"] = relationship(back_populates="invoice")
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )

    @property
    def amount_paid_minor(self) -> int:
        return sum(p.amount_minor for p in self.payments)


class Payment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    invoice_id: Mapped[str] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), index=True
    )
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod))
    amount_minor: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    invoice: Mapped["Invoice"] = relationship(back_populates="payments")
