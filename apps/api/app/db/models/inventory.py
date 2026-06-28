"""Inventory + procurement: InventoryItem, InventoryTransaction, Supplier,
PurchaseOrder(+items)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.models.enums import (
    InventoryTransactionType,
    PurchaseOrderStatus,
)

if TYPE_CHECKING:
    from app.db.models.organization import Dealership


class Supplier(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "suppliers"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255), index=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=3)
    rating_x10: Mapped[int] = mapped_column(Integer, default=45)  # rating * 10 (0-50)
    on_time_delivery_pct: Mapped[int] = mapped_column(Integer, default=90)
    status: Mapped[str] = mapped_column(String(16), default="active")  # active|on_hold|inactive
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    inventory_items: Mapped[list["InventoryItem"]] = relationship(back_populates="supplier")
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="supplier")


class InventoryItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "inventory_items"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    supplier_id: Mapped[str | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )
    sku: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    unit_cost_minor: Mapped[int] = mapped_column(Integer, default=0)
    unit_price_minor: Mapped[int] = mapped_column(Integer, default=0)
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0)
    reorder_point: Mapped[int] = mapped_column(Integer, default=5)
    safety_stock: Mapped[int] = mapped_column(Integer, default=5)
    predicted_demand_30d: Mapped[int] = mapped_column(Integer, default=0)
    abc_class: Mapped[str] = mapped_column(String(1), default="C")  # A|B|C
    warehouse_location: Mapped[str | None] = mapped_column(String(32), nullable=True)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=3)

    dealership: Mapped["Dealership"] = relationship()
    supplier: Mapped["Supplier | None"] = relationship(back_populates="inventory_items")
    transactions: Mapped[list["InventoryTransaction"]] = relationship(
        back_populates="inventory_item", cascade="all, delete-orphan"
    )

    @property
    def quantity_available(self) -> int:
        return self.quantity_on_hand - self.quantity_reserved


class InventoryTransaction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "inventory_transactions"

    inventory_item_id: Mapped[str] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[InventoryTransactionType] = mapped_column(Enum(InventoryTransactionType))
    quantity_delta: Mapped[int] = mapped_column(Integer)
    reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    inventory_item: Mapped["InventoryItem"] = relationship(back_populates="transactions")


class PurchaseOrder(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "purchase_orders"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id", ondelete="RESTRICT"))
    number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        Enum(PurchaseOrderStatus), default=PurchaseOrderStatus.draft
    )
    total_amount_minor: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    external_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)  # ERP/SAP ref

    supplier: Mapped["Supplier"] = relationship(back_populates="purchase_orders")
    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        back_populates="purchase_order", cascade="all, delete-orphan"
    )


class PurchaseOrderItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "purchase_order_items"

    purchase_order_id: Mapped[str] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="CASCADE"), index=True
    )
    inventory_item_id: Mapped[str | None] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_cost_minor: Mapped[int] = mapped_column(Integer, default=0)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")
    inventory_item: Mapped["InventoryItem | None"] = relationship()

    @property
    def line_total_minor(self) -> int:
        return self.quantity * self.unit_cost_minor
