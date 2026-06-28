"""Supplier routes — paginated list."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.inventory import Supplier
from app.services import serialize
from app.services.listing import ListParams, list_params, list_response, paginate_query

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

_SORT_MAP = {
    "name": Supplier.name,
    "contactName": Supplier.contact_name,
    "onTimeDeliveryPct": Supplier.on_time_delivery_pct,
    "avgLeadTimeDays": Supplier.lead_time_days,
    "status": Supplier.status,
    "createdAt": Supplier.created_at,
}


@router.get("")
def list_suppliers(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
) -> dict:
    scope = current_user.dealership_id
    stmt = select(Supplier).where(Supplier.dealership_id == scope)
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[Supplier.name, Supplier.contact_name, Supplier.contact_email],
        sort_map=_SORT_MAP,
        default_sort=Supplier.name,
    )
    active = serialize.supplier_active_orders(db, [s.id for s in rows])
    items = [serialize.serialize_supplier(s, active.get(s.id, 0)) for s in rows]
    return list_response(items, params, total)
