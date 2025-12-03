# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

FROM base AS builder
WORKDIR /app

# Copy package manifests only (for dependency caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/onlyperf/package.json ./apps/onlyperf/

# Install dependencies (cached if package.json files unchanged)
RUN pnpm install --frozen-lockfile

# Copy source code (changes here won't invalidate install cache)
COPY packages/db ./packages/db
COPY apps/onlyperf ./apps/onlyperf

WORKDIR /app/apps/onlyperf

# Public env vars (safe to expose - baked into client bundle)
ARG NEXT_PUBLIC_STORE_DOMAIN
ARG NEXT_PUBLIC_SITE_URL=https://onlyperf.com
ENV NEXT_PUBLIC_STORE_DOMAIN=$NEXT_PUBLIC_STORE_DOMAIN
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1

# Build with secrets mounted (not stored in image layers)
# The .env file contains sensitive server-side vars like SHOPIFY_* and DATABASE_URL
RUN --mount=type=secret,id=env,target=/app/.env \
    pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/onlyperf/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/onlyperf/.next/static ./apps/onlyperf/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/onlyperf/public ./apps/onlyperf/public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "apps/onlyperf/server.js"]
