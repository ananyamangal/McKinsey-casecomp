# docker/

Auxiliary Docker assets and persistent data live here.

- The full local stack is defined in the repo-root `docker-compose.yml`.
- The API image is built from `apps/api/Dockerfile`.
- The web image is built from `apps/web/Dockerfile` (with the repo root as build
  context so npm workspaces resolve).
- `docker/data/` (git-ignored) is reserved for bind-mounted volumes if you
  switch away from named volumes.

Quickstart:

```bash
docker compose up --build
# API  -> http://localhost:8000/docs
# Web  -> http://localhost:3000
```
