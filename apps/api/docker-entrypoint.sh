#!/usr/bin/env sh
# Container entrypoint: ensure schema exists, seed dev data, then serve.
set -e

echo "[entrypoint] Creating tables and seeding dev data..."
python -m app.db.seed || echo "[entrypoint] seed failed (continuing)"

echo "[entrypoint] Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
