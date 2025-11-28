# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

FROM base AS builder
WORKDIR /app

# Copy package manifests only (for dependency caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/warehouse-management/package.json ./apps/warehouse-management/

# Install dependencies (cached if package.json files unchanged)
RUN pnpm install --frozen-lockfile

# Copy source code (changes here won't invalidate install cache)
COPY packages/db ./packages/db
COPY apps/warehouse-management ./apps/warehouse-management

WORKDIR /app/apps/warehouse-management

# Public env vars (safe to expose - baked into client bundle)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SHOPIFY_ENABLED
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SHOPIFY_ENABLED=$NEXT_PUBLIC_SHOPIFY_ENABLED
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1

# Build with secrets mounted (not stored in image layers)
# The .env.local file contains sensitive server-side vars like DATABASE_URL, BETTER_AUTH_SECRET, etc.
RUN --mount=type=secret,id=env_warehouse,target=/app/apps/warehouse-management/.env \
    --network=default \
    pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/warehouse-management/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/warehouse-management/.next/static ./apps/warehouse-management/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/warehouse-management/public ./apps/warehouse-management/public

# Copy drizzle migrations from packages/db (needed for db operations)
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/drizzle ./drizzle

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

USER nextjs
EXPOSE 3001
ENV PORT=3001 HOSTNAME="0.0.0.0"
CMD ["node", "apps/warehouse-management/server.js"]
