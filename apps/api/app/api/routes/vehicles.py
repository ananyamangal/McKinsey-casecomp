"""Vehicle routes — list/detail + telematics + predictions."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.crm import Customer, Vehicle
from app.db.models.maintenance import PredictedMaintenance
from app.db.models.telematics import TelematicsEvent
from app.services import serialize
from app.services.listing import ListParams, list_params, list_response, paginate_query

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

_SORT_MAP = {
    "make": Vehicle.make,
    "model": Vehicle.model,
    "year": Vehicle.year,
    "mileageKm": Vehicle.odometer_km,
    "registration": Vehicle.registration_no,
    "createdAt": Vehicle.created_at,
}


@router.get("")
def list_vehicles(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
    make: Annotated[str | None, Query()] = None,
) -> dict:
    scope = current_user.dealership_id
    stmt = (
        select(Vehicle)
        .join(Customer, Vehicle.customer_id == Customer.id)
        .where(Vehicle.dealership_id == scope)
    )
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[
            Vehicle.vin,
            Vehicle.chassis_no,
            Vehicle.registration_no,
            Vehicle.make,
            Vehicle.model,
            Customer.full_name,
        ],
        sort_map=_SORT_MAP,
        filters={"make": make},
        filter_map={"make": Vehicle.make},
        default_sort=Vehicle.created_at,
    )
    items = [serialize.serialize_vehicle(v) for v in rows]
    return list_response(items, params, total)


def _get_vehicle(db, current_user, vehicle_id: str) -> Vehicle:
    v = db.get(Vehicle, vehicle_id)
    if v is None or v.dealership_id != current_user.dealership_id:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v


@router.get("/{vehicle_id}")
def get_vehicle(db: DbSession, current_user: CurrentUser, vehicle_id: str) -> dict:
    return serialize.serialize_vehicle(_get_vehicle(db, current_user, vehicle_id))


@router.get("/{vehicle_id}/telematics")
def vehicle_telematics(db: DbSession, current_user: CurrentUser, vehicle_id: str) -> list[dict]:
    _get_vehicle(db, current_user, vehicle_id)
    events = db.scalars(
        select(TelematicsEvent)
        .where(TelematicsEvent.vehicle_id == vehicle_id)
        .order_by(TelematicsEvent.created_at.desc())
    ).all()
    return [serialize.serialize_telematics(e) for e in events]


@router.get("/{vehicle_id}/predictions")
def vehicle_predictions(db: DbSession, current_user: CurrentUser, vehicle_id: str) -> list[dict]:
    _get_vehicle(db, current_user, vehicle_id)
    preds = db.scalars(
        select(PredictedMaintenance).where(PredictedMaintenance.vehicle_id == vehicle_id)
    ).all()
    return [serialize.serialize_prediction(p) for p in preds]
