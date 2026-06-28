"""Activity feed (from AuditLog), newest first."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.workflow import AuditLog
from app.services import serialize

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("")
def list_activity(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = db.scalars(
        select(AuditLog)
        .where(AuditLog.dealership_id == current_user.dealership_id)
        .order_by(AuditLog.created_at.desc())
        .limit(50)
    ).all()
    return [serialize.serialize_activity(a) for a in rows]
