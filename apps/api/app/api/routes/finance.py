"""Finance routes — invoices, payments, summary."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.finance import Invoice, Payment
from app.services import analytics, serialize
from app.services.listing import ListParams, list_params, list_response, paginate_query

router = APIRouter(tags=["finance"])

_INV_SORT_MAP = {
    "number": Invoice.number,
    "status": Invoice.status,
    "total": Invoice.total_minor,
    "createdAt": Invoice.created_at,
}

_FE_TO_BE_INV_STATUS = {
    "draft": "draft",
    "issued": "issued",
    "partially_paid": "partially_paid",
    "paid": "paid",
    "void": "void",
    # "overdue" is derived; no direct backend column -> filtered in-page.
}


@router.get("/finance/summary")
def finance_summary(db: DbSession, current_user: CurrentUser) -> dict:
    return analytics.build_finance_summary(db, current_user.dealership_id)


@router.get("/invoices")
def list_invoices(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
    status: Annotated[str | None, Query()] = None,
) -> dict:
    scope = current_user.dealership_id
    stmt = select(Invoice).where(Invoice.dealership_id == scope)
    be_status = _FE_TO_BE_INV_STATUS.get(status) if status else None
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[Invoice.number],
        sort_map=_INV_SORT_MAP,
        filters={"status": be_status},
        filter_map={"status": Invoice.status},
        default_sort=Invoice.created_at,
    )
    items = [serialize.serialize_invoice(i) for i in rows]
    if status == "overdue":
        items = [i for i in items if i["status"] == "overdue"]
        total = len(items)
    return list_response(items, params, total)


@router.get("/payments")
def list_payments(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
) -> dict:
    scope = current_user.dealership_id
    stmt = (
        select(Payment)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .where(Invoice.dealership_id == scope)
    )
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[Invoice.number],
        sort_map={"createdAt": Payment.created_at, "amount": Payment.amount_minor},
        default_sort=Payment.created_at,
    )
    items = [serialize.serialize_payment(p) for p in rows]
    return list_response(items, params, total)
