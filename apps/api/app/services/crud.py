"""Thin reusable CRUD/query helpers so routers stay declarative."""

from __future__ import annotations

from typing import Sequence, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


def paginate(
    db: Session,
    model: type[ModelT],
    *,
    limit: int,
    offset: int,
    dealership_id: str | None = None,
) -> tuple[Sequence[ModelT], int]:
    """Return (items, total) for a model, optionally scoped to a dealership."""
    stmt = select(model)
    count_stmt = select(func.count()).select_from(model)
    if dealership_id is not None and hasattr(model, "dealership_id"):
        stmt = stmt.where(model.dealership_id == dealership_id)  # type: ignore[attr-defined]
        count_stmt = count_stmt.where(model.dealership_id == dealership_id)  # type: ignore[attr-defined]

    total = db.scalar(count_stmt) or 0
    items = db.scalars(stmt.limit(limit).offset(offset)).all()
    return items, total


def create(db: Session, instance: ModelT) -> ModelT:
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


def get_or_404(db: Session, model: type[ModelT], pk: str) -> ModelT:
    from fastapi import HTTPException, status

    obj = db.get(model, pk)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{model.__name__} not found")
    return obj
