"""Notification routes — list (newest first) + read / read-all mutations."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from app.api.deps import CurrentUser, DbSession
from app.db.models.telematics import Notification
from app.services import serialize

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = db.scalars(
        select(Notification)
        .where(Notification.dealership_id == current_user.dealership_id)
        .order_by(Notification.created_at.desc())
    ).all()
    return [serialize.serialize_notification(n) for n in rows]


@router.post("/read-all")
def read_all(db: DbSession, current_user: CurrentUser) -> dict:
    result = db.execute(
        update(Notification)
        .where(
            Notification.dealership_id == current_user.dealership_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    db.commit()
    return {"updated": result.rowcount or 0}


@router.post("/{notification_id}/read")
def read_one(db: DbSession, current_user: CurrentUser, notification_id: str) -> dict:
    n = db.get(Notification, notification_id)
    if n is None or n.dealership_id != current_user.dealership_id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return serialize.serialize_notification(n)
