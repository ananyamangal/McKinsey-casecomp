"""Engine + session factory + FastAPI `get_db` dependency."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_connect_args: dict = {}
if settings.is_sqlite:
    # SQLite needs this when used across FastAPI's threadpool.
    _connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session, ensuring it is always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all() -> None:
    """Create tables for zero-config dev (SQLite). Use Alembic for production."""
    # Import models so they register on Base.metadata before create_all.
    import app.db.models  # noqa: F401
    from app.db.base import Base

    Base.metadata.create_all(bind=engine)
