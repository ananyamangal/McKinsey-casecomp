"""Auth-related schemas."""

from __future__ import annotations

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    dealership_id: str | None = None
    roles: list[str] = []

    model_config = {"from_attributes": True}
