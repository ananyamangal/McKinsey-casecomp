# Halo Web (Next.js) image.
#
# NOTE: This image must be built from the MONOREPO ROOT as build context so the
# npm workspaces (apps/web depends on packages/*) resolve, e.g.:
#   docker build -f apps/web/Dockerfile -t halo-web .
# (docker-compose.yml already sets context: . and dockerfile: apps/web/Dockerfile)
#
# For a smaller production image you could enable Next.js standalone output by
# adding `output: 'standalone'` to apps/web/next.config.mjs. We intentionally do
# NOT modify next.config.mjs here; instead we run `npm run build` then `npm start`.

# ---- deps + build ----
FROM node:20-alpine AS builder
WORKDIR /repo

# Copy workspace manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages ./packages

RUN npm install

# Copy the rest of the sources and build the web app.
COPY apps/web ./apps/web
RUN npm run build --workspace=@halo/web

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=builder /repo ./

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@halo/web"]
