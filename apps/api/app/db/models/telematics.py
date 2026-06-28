"""Telematics + notifications: TelematicsEvent, Notification."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.models.enums import NotificationChannel, NotificationStatus
from app.db.models.types import JSONType

if TYPE_CHECKING:
    from app.db.models.crm import Vehicle


class TelematicsEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Raw AIS-140 / OBD telematics signal. Plain ingestion, no AI."""

    __tablename__ = "telematics_events"

    vehicle_id: Mapped[str] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True)  # e.g. brake_wear, dtc_code
    severity: Mapped[str] = mapped_column(String(16), default="info")  # info|warning|critical
    payload: Mapped[dict] = mapped_column(JSONType, default=dict)

    vehicle: Mapped["Vehicle"] = relationship(back_populates="telematics_events")


class Notification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    dealership_id: Mapped[str] = mapped_column(
        ForeignKey("dealerships.id", ondelete="CASCADE"), index=True
    )
    customer_id: Mapped[str | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel), default=NotificationChannel.in_app
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus), default=NotificationStatus.pending
    )
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    provider_message_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # In-app notification fields (AppNotification contract).
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    severity: Mapped[str] = mapped_column(String(16), default="info")  # info|success|warning|critical
    module: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
