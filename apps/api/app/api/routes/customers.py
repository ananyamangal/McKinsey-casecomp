"""Customer routes — contract-shaped (camelCase, Money, paginated envelope)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.crm import Customer, Vehicle
from app.services import serialize
from app.services.listing import ListParams, list_params, list_response, paginate_query

router = APIRouter(prefix="/customers", tags=["customers"])

_SORT_MAP = {
    "name": Customer.full_name,
    "city": Customer.city,
    "loyaltyTier": Customer.loyalty_tier,
    "loyaltyPoints": Customer.loyalty_points,
    "satisfactionScore": Customer.satisfaction_score,
    "createdAt": Customer.created_at,
    # lifetimeValue / vehicleCount are derived; handled post-fetch below.
}


@router.get("")
def list_customers(
    db: DbSession,
    current_user: CurrentUser,
    params: Annotated[ListParams, Depends(list_params)],
    loyaltyTier: Annotated[str | None, Query()] = None,
) -> dict:
    scope = current_user.dealership_id
    stmt = select(Customer).where(Customer.dealership_id == scope)
    rows, total = paginate_query(
        db,
        stmt,
        params=params,
        search_columns=[Customer.full_name, Customer.phone, Customer.email, Customer.city],
        sort_map=_SORT_MAP,
        filters={"loyaltyTier": loyaltyTier},
        filter_map={"loyaltyTier": Customer.loyalty_tier},
        default_sort=Customer.full_name,
    )
    agg = serialize.customer_aggregates(db, [c.id for c in rows])
    items = [serialize.serialize_customer(c, agg.get(c.id)) for c in rows]

    # Derived-field sorting (lifetimeValue / vehicleCount) handled in-page.
    if params.sort_field in ("lifetimeValue", "vehicleCount"):
        reverse = params.sort_dir == "desc"
        if params.sort_field == "lifetimeValue":
            items.sort(key=lambda i: i["lifetimeValue"]["amountMinor"], reverse=reverse)
        else:
            items.sort(key=lambda i: i["vehicleCount"], reverse=reverse)
    return list_response(items, params, total)


@router.get("/{customer_id}")
def get_customer(db: DbSession, current_user: CurrentUser, customer_id: str) -> dict:
    c = db.get(Customer, customer_id)
    if c is None or c.dealership_id != current_user.dealership_id:
        raise HTTPException(status_code=404, detail="Customer not found")
    agg = serialize.customer_aggregates(db, [c.id])
    return serialize.serialize_customer(c, agg.get(c.id))


@router.get("/{customer_id}/vehicles")
def customer_vehicles(db: DbSession, current_user: CurrentUser, customer_id: str) -> list[dict]:
    c = db.get(Customer, customer_id)
    if c is None or c.dealership_id != current_user.dealership_id:
        raise HTTPException(status_code=404, detail="Customer not found")
    vehicles = db.scalars(select(Vehicle).where(Vehicle.customer_id == customer_id)).all()
    return [serialize.serialize_vehicle(v, c.full_name) for v in vehicles]
