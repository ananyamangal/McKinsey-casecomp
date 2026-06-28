"""Operations routes — bays, technicians, appointments, work-orders."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.db.models.operations import (
    Appointment,
    ServiceBay,
    Technician,
    WorkOrder,
)
from app.services import serialize
from app.services.listing import ListParams, list_params, list_response, paginate_query

router = APIRouter(tags=["operations"])


@router.get("/bays")
def list_bays(db: DbSession, current_user: CurrentUser) -> list[dict]:
    bays = db.scalars(
        select(ServiceBay)
        .where(ServiceBay.dealership_id == current_user.dealership_id)
        .order_by(ServiceBay.name)
    ).all()
    return [serialize.serialize_bay(b) for b in bays]


@router.get("/technicians")
def list_technicians(db: DbSession, current_user: CurrentUser) -> list[dict]:
    techs = db.scalars(
        select(Technician)
        .where(Technician.dealership_id == current_user.dealership_id)
        .order_by(Technician.full_name)
    ).all()
    return [serialize.serialize_technician(t) for t in techs]


@router.get("/appointments")
def list_appointments(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
) -> dict:
    stmt = (
        select(Appointment)
        .options(selectinload(Appointment.customer), selectinload(Appointment.vehicle))
        .where(Appointment.dealership_id == current_user.dealership_id)
    )
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[Appointment.reason],
        sort_map={"scheduledFor": Appointment.scheduled_start, "createdAt": Appointment.created_at},
        default_sort=Appointment.scheduled_start,
    )
    items = [serialize.serialize_appointment(a) for a in rows]
    return list_response(items, params, total)


@router.get("/work-orders")
def list_work_orders(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
    status: Annotated[str | None, Query()] = None,
) -> dict:
    from app.db.models.enums import WorkOrderStatus

    # Map a frontend status filter back to backend enum value(s).
    fe_to_be = {
        "open": "open",
        "awaiting_parts": "awaiting_parts",
        "in_progress": "in_progress",
        "ready": "completed",
        "delivered": "invoiced",
        "on_hold": "cancelled",
    }
    be_status = fe_to_be.get(status) if status else None
    stmt = (
        select(WorkOrder)
        .options(
            selectinload(WorkOrder.customer),
            selectinload(WorkOrder.vehicle),
            selectinload(WorkOrder.technician),
            selectinload(WorkOrder.items),
        )
        .where(WorkOrder.dealership_id == current_user.dealership_id)
    )
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[WorkOrder.number],
        sort_map={"number": WorkOrder.number, "status": WorkOrder.status, "createdAt": WorkOrder.created_at},
        filters={"status": be_status},
        filter_map={"status": WorkOrder.status},
        default_sort=WorkOrder.created_at,
    )
    items = [serialize.serialize_work_order(w) for w in rows]
    return list_response(items, params, total)
