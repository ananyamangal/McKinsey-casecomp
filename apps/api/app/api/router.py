"""Aggregate API v1 router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    activity,
    agents,
    auth,
    customers,
    dashboard,
    finance,
    health,
    inventory,
    notifications,
    operations,
    purchase_orders,
    suppliers,
    vehicles,
    workflows,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(customers.router)
api_router.include_router(vehicles.router)
api_router.include_router(operations.router)
api_router.include_router(inventory.router)
api_router.include_router(suppliers.router)
api_router.include_router(purchase_orders.router)
api_router.include_router(finance.router)
api_router.include_router(dashboard.router)
api_router.include_router(notifications.router)
api_router.include_router(activity.router)
api_router.include_router(agents.router)
api_router.include_router(workflows.router)
