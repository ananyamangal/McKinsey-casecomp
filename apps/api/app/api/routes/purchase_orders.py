"""Purchase order routes — paginated list + approve/reject mutations."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.enums import PurchaseOrderStatus
from app.db.models.inventory import PurchaseOrder
from app.services import serialize
from app.services.listing import ListParams, list_params, list_response, paginate_query

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])

_SORT_MAP = {
    "number": PurchaseOrder.number,
    "status": PurchaseOrder.status,
    "createdAt": PurchaseOrder.created_at,
}

# Frontend filter values map to backend enum values.
_FE_TO_BE_STATUS = {
    "draft": "draft",
    "pending_approval": "submitted",
    "approved": "confirmed",
    "partially_received": "partially_received",
    "received": "received",
    "cancelled": "cancelled",
}


@router.get("")
def list_purchase_orders(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
    status: Annotated[str | None, Query()] = None,
) -> dict:
    scope = current_user.dealership_id
    stmt = select(PurchaseOrder).where(PurchaseOrder.dealership_id == scope)
    be_status = _FE_TO_BE_STATUS.get(status) if status else None
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[PurchaseOrder.number],
        sort_map=_SORT_MAP,
        filters={"status": be_status},
        filter_map={"status": PurchaseOrder.status},
        default_sort=PurchaseOrder.created_at,
    )
    items = [serialize.serialize_purchase_order(po) for po in rows]
    return list_response(items, params, total)


def _get_po(db, current_user, po_id: str) -> PurchaseOrder:
    po = db.get(PurchaseOrder, po_id)
    if po is None or po.dealership_id != current_user.dealership_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.post("/{po_id}/approve")
def approve_po(db: DbSession, current_user: CurrentUser, po_id: str) -> dict:
    po = _get_po(db, current_user, po_id)
    po.status = PurchaseOrderStatus.confirmed  # -> frontend "approved"
    db.commit()
    db.refresh(po)
    return serialize.serialize_purchase_order(po)


@router.post("/{po_id}/reject")
def reject_po(db: DbSession, current_user: CurrentUser, po_id: str) -> dict:
    po = _get_po(db, current_user, po_id)
    po.status = PurchaseOrderStatus.cancelled
    db.commit()
    db.refresh(po)
    return serialize.serialize_purchase_order(po)
