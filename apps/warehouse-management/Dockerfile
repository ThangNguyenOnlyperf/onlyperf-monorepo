# Base image with Node.js 20 Alpine
FROM node:20-alpine AS base

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy monorepo dependency files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/warehouse-management/package.json apps/warehouse-management/.npmrc ./apps/warehouse-management/

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/warehouse-management/node_modules ./apps/warehouse-management/node_modules

# Copy source code
COPY packages/db ./packages/db
COPY apps/warehouse-management ./apps/warehouse-management

# Set working directory to the app
WORKDIR /app/apps/warehouse-management

# Declare build arguments for NEXT_PUBLIC_* variables
# These are baked into the client-side JavaScript bundle at build time
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SHOPIFY_ENABLED

# Make build arguments available as environment variables during build
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SHOPIFY_ENABLED=$NEXT_PUBLIC_SHOPIFY_ENABLED

# Set environment variables for build
# Skip env validation during build - runtime will validate
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with network access for Google Fonts
RUN --network=default pnpm build

# Production image, copy all the files and run next
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output with correct permissions
COPY --from=builder --chown=nextjs:nodejs /app/apps/warehouse-management/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/warehouse-management/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/warehouse-management/public ./public

# Copy drizzle migrations from packages/db (needed for db operations)
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/drizzle ./drizzle

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Switch to non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Start the application using standalone server
CMD ["node", "server.js"]
