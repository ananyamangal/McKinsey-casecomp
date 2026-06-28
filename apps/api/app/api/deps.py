"""Common FastAPI dependencies shared across routers."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import CurrentToken
from app.db.models.organization import User
from app.db.session import get_db

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession, token: CurrentToken) -> User:
    user = db.get(User, token.sub)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


class Pagination:
    def __init__(
        self,
        limit: int = Query(default=50, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
    ) -> None:
        self.limit = limit
        self.offset = offset


PaginationDep = Annotated[Pagination, Depends(Pagination)]
