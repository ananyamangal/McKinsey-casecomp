"""Portable column types.

`JSONType` uses native JSONB on PostgreSQL and falls back to generic JSON
(text-backed) on SQLite, so the same models work in dev and production.
"""

from __future__ import annotations

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# JSONB on PostgreSQL, plain JSON elsewhere (e.g. SQLite).
JSONType = JSON().with_variant(JSONB(), "postgresql")
