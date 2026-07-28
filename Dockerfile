# ---------- deps ----------
# Native modules (better-sqlite3, sharp) need a toolchain to install/compile
# against this image's platform — the host's prebuilt binaries (e.g. macOS
# arm64 from local dev) won't run in this Linux container.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --build-from-source

# ---------- build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npm run build

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Full node_modules (incl. devDependencies) is kept so admin one-off scripts
# (seed:admin, import:usb) can be run via `docker compose exec`, e.g.:
#   docker compose exec app npm run seed:admin -- <password>
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

RUN mkdir -p /app/data /app/public/uploads \
    && chown -R nextjs:nodejs /app/data /app/public/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["npm", "run", "start"]
