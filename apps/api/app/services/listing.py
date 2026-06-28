"""Generic list-query helpers: search -> filter -> sort -> paginate.

Routers parse query params (page/pageSize/search/sortField/sortDir + filters)
and call :func:`paginate_query` with a base SELECT statement plus column maps.
The contract envelope is produced by :func:`list_response`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any, Sequence

from fastapi import Query
from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.orm import InstrumentedAttribute, Session


@dataclass(slots=True)
class ListParams:
    page: int = 1
    page_size: int = 10
    search: str | None = None
    sort_field: str | None = None
    sort_dir: str = "asc"


def list_params(
    page: Annotated[int, Query(ge=1)] = 1,
    pageSize: Annotated[int, Query(ge=1, le=200)] = 10,
    search: Annotated[str | None, Query()] = None,
    sortField: Annotated[str | None, Query()] = None,
    sortDir: Annotated[str, Query()] = "asc",
) -> ListParams:
    return ListParams(
        page=page,
        page_size=pageSize,
        search=search,
        sort_field=sortField,
        sort_dir="desc" if (sortDir or "").lower() == "desc" else "asc",
    )


def paginate_query(
    db: Session,
    base_stmt: Select,
    *,
    params: ListParams,
    search_columns: Sequence[InstrumentedAttribute] | None = None,
    sort_map: dict[str, Any] | None = None,
    filters: dict[str, str | None] | None = None,
    filter_map: dict[str, Any] | None = None,
    default_sort: Any | None = None,
) -> tuple[list[Any], int]:
    """Apply search/filter/sort/pagination to ``base_stmt`` (a SELECT of one entity).

    Returns ``(rows, total)``. ``sort_map`` / ``filter_map`` map camelCase field
    names to ORM columns. ``filters`` is the raw {field: value} from the request.
    """
    stmt = base_stmt

    if params.search and search_columns:
        term = f"%{params.search.strip().lower()}%"
        stmt = stmt.where(
            or_(*[func.lower(func.coalesce(col, "")).like(term) for col in search_columns])
        )

    if filters and filter_map:
        for key, value in filters.items():
            if value is None or value == "":
                continue
            col = filter_map.get(key)
            if col is not None:
                stmt = stmt.where(col == value)

    # total before pagination
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0

    sort_col = None
    if params.sort_field and sort_map:
        sort_col = sort_map.get(params.sort_field)
    if sort_col is None:
        sort_col = default_sort
    if sort_col is not None:
        stmt = stmt.order_by(desc(sort_col) if params.sort_dir == "desc" else asc(sort_col))

    offset = (params.page - 1) * params.page_size
    stmt = stmt.offset(offset).limit(params.page_size)
    rows = list(db.scalars(stmt).unique().all())
    return rows, total


def list_response(items: list[Any], params: ListParams, total: int) -> dict:
    total_pages = max(1, -(-total // params.page_size)) if total else 1
    return {
        "items": items,
        "page": params.page,
        "pageSize": params.page_size,
        "total": total,
        "totalPages": total_pages,
    }
