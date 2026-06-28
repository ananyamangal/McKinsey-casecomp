"""Halo API — FastAPI application entrypoint.

Architecture in one line: AI-free business logic runs via the Workflow Engine;
the AI layer is a pluggable decision boundary that only chooses *when* to
trigger workflows.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("halo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Zero-config dev: create tables for SQLite. Use Alembic for production.
    if settings.is_sqlite:
        from app.db.session import create_all

        create_all()
        logger.info("SQLite dev database ready (tables created).")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description=(
        "Production-grade B2B SaaS backend for automobile dealerships. "
        "Business logic is AI-free and executed by a Workflow Engine; AI is a "
        "separate, pluggable layer that only decides when to trigger workflows."
    ),
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["root"])
def root() -> dict:
    return {
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "env": settings.ENV}
