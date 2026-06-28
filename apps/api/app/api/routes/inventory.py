"""Inventory routes — paginated list (+ filters) and summary."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.inventory import InventoryItem
from app.services import analytics, serialize
from app.services.listing import ListParams, list_params, list_response, paginate_query

router = APIRouter(prefix="/inventory", tags=["inventory"])

_SORT_MAP = {
    "sku": InventoryItem.sku,
    "name": InventoryItem.name,
    "category": InventoryItem.category,
    "currentStock": InventoryItem.quantity_on_hand,
    "predictedDemand30d": InventoryItem.predicted_demand_30d,
    "abcClass": InventoryItem.abc_class,
    "createdAt": InventoryItem.created_at,
}


@router.get("/summary")
def inventory_summary(db: DbSession, current_user: CurrentUser) -> dict:
    return analytics.build_inventory_summary(db, current_user.dealership_id)


@router.get("")
def list_inventory(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
    category: Annotated[str | None, Query()] = None,
    health: Annotated[str | None, Query()] = None,
) -> dict:
    scope = current_user.dealership_id
    stmt = select(InventoryItem).where(InventoryItem.dealership_id == scope)
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[InventoryItem.sku, InventoryItem.name, InventoryItem.category],
        sort_map=_SORT_MAP,
        filters={"category": category},
        filter_map={"category": InventoryItem.category},
        default_sort=InventoryItem.name,
    )
    items = [serialize.serialize_inventory_item(i) for i in rows]
    # health is a derived field -> filter in-page.
    if health:
        items = [i for i in items if i["health"] == health]
        total = len(items)
    return list_response(items, params, total)
