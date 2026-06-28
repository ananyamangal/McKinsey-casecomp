"""Tenancy + identity models: Dealership, User, Role."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.crm import Customer, Vehicle
    from app.db.models.operations import Technician

# Many-to-many association between users and roles.
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Dealership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "dealerships"

    name: Mapped[str] = mapped_column(String(255), index=True)
    legal_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="IN")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[list["User"]] = relationship(back_populates="dealership")
    customers: Mapped[list["Customer"]] = relationship(back_populates="dealership")
    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="dealership")
    technicians: Mapped[list["Technician"]] = relationship(back_populates="dealership")


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    users: Mapped[list["User"]] = relationship(secondary=user_roles, back_populates="roles")


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    dealership_id: Mapped[str | None] = mapped_column(
        ForeignKey("dealerships.id", ondelete="SET NULL"), nullable=True, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    dealership: Mapped["Dealership | None"] = relationship(back_populates="users")
    roles: Mapped[list["Role"]] = relationship(secondary=user_roles, back_populates="users")

    @property
    def role_keys(self) -> list[str]:
        return [r.key for r in self.roles]
