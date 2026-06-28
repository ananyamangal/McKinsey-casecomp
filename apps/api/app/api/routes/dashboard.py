"""Dashboard + analytics aggregation routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.services import analytics

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard(db: DbSession, current_user: CurrentUser) -> dict:
    return analytics.build_dashboard(db, current_user.dealership_id)


@router.get("/analytics")
def analytics_view(db: DbSession, current_user: CurrentUser) -> dict:
    return analytics.build_analytics(db, current_user.dealership_id)
