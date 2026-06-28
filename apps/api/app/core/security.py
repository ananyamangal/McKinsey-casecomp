"""Security primitives: password hashing, JWT tokens, and RBAC dependencies.

This module is intentionally framework-light so it can be unit tested without a
running server. FastAPI wiring (OAuth2 scheme, dependencies) lives at the bottom.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
ACCESS_TOKEN = "access"
REFRESH_TOKEN = "refresh"


class TokenPayload(BaseModel):
    sub: str
    type: str
    roles: list[str] = []
    dealership_id: str | None = None
    exp: int | None = None


def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    *,
    roles: Iterable[str] | None = None,
    dealership_id: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "roles": list(roles or []),
        "dealership_id": dealership_id,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(
    subject: str,
    *,
    roles: Iterable[str] | None = None,
    dealership_id: str | None = None,
) -> str:
    return _create_token(
        subject,
        ACCESS_TOKEN,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        roles=roles,
        dealership_id=dealership_id,
    )


def create_refresh_token(
    subject: str,
    *,
    roles: Iterable[str] | None = None,
    dealership_id: str | None = None,
) -> str:
    return _create_token(
        subject,
        REFRESH_TOKEN,
        timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES),
        roles=roles,
        dealership_id=dealership_id,
    )


def decode_token(token: str) -> TokenPayload:
    try:
        raw = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:  # invalid signature / expired / malformed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return TokenPayload(**raw)


# ---------------------------------------------------------------------------
# FastAPI auth dependencies
# ---------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_token(token: Annotated[str, Depends(oauth2_scheme)]) -> TokenPayload:
    payload = decode_token(token)
    if payload.type != ACCESS_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type; an access token is required",
        )
    return payload


CurrentToken = Annotated[TokenPayload, Depends(get_current_token)]


def require_roles(*roles: str):
    """Dependency factory enforcing that the caller has at least one role.

    Usage::

        @router.get("/admin", dependencies=[Depends(require_roles("owner"))])
    """

    allowed = set(roles)

    def _checker(token: CurrentToken) -> TokenPayload:
        if not allowed:
            return token
        if not allowed.intersection(token.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {sorted(allowed)}",
            )
        return token

    return _checker
