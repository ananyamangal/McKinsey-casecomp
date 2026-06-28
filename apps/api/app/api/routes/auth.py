"""Authentication routes: login, refresh, me."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    REFRESH_TOKEN,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.db.models.organization import User
from app.schemas.auth import RefreshRequest, Token, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens_for(user: User) -> Token:
    roles = user.role_keys
    return Token(
        access_token=create_access_token(
            user.id, roles=roles, dealership_id=user.dealership_id
        ),
        refresh_token=create_refresh_token(
            user.id, roles=roles, dealership_id=user.dealership_id
        ),
    )


@router.post("/login", response_model=Token)
def login(
    db: DbSession,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    """OAuth2 password grant. `username` is the user's email."""
    user = db.scalar(select(User).where(User.email == form.username))
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return _tokens_for(user)


@router.post("/refresh", response_model=Token)
def refresh(db: DbSession, body: RefreshRequest) -> Token:
    payload = decode_token(body.refresh_token)
    if payload.type != REFRESH_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    user = db.get(User, payload.sub)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
        )
    return _tokens_for(user)


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser) -> UserOut:
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        dealership_id=current_user.dealership_id,
        roles=current_user.role_keys,
    )
