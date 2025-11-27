# Base stage
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build arguments for client-side environment variables
# These are baked into the client bundle at build time
ARG NEXT_PUBLIC_STORE_DOMAIN
ARG NEXT_PUBLIC_SITE_URL=https://onlyperf.com

ENV NEXT_PUBLIC_STORE_DOMAIN=$NEXT_PUBLIC_STORE_DOMAIN
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Build arguments for server-side environment variables
# Required for generateStaticParams and static page generation at build time
# These are NOT included in the final image, only used during build
ARG SHOPIFY_STOREFRONT_API_ACCESS_TOKEN
ARG SHOPIFY_PRIVATE_STOREFRONT_API_TOKEN
ARG SHOPIFY_STORE_DOMAIN
ARG SHOPIFY_ADMIN_API_ACCESS_TOKEN
ARG SHOPIFY_API_VERSION=2025-04
ARG DATABASE_URL

ENV SHOPIFY_STOREFRONT_API_ACCESS_TOKEN=$SHOPIFY_STOREFRONT_API_ACCESS_TOKEN
ENV SHOPIFY_PRIVATE_STOREFRONT_API_TOKEN=$SHOPIFY_PRIVATE_STOREFRONT_API_TOKEN
ENV SHOPIFY_STORE_DOMAIN=$SHOPIFY_STORE_DOMAIN
ENV SHOPIFY_ADMIN_API_ACCESS_TOKEN=$SHOPIFY_ADMIN_API_ACCESS_TOKEN
ENV SHOPIFY_API_VERSION=$SHOPIFY_API_VERSION
ENV DATABASE_URL=$DATABASE_URL

# Skip environment validation during build
ENV SKIP_ENV_VALIDATION=true

# Disable Next.js telemetry collection
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with Turbopack
RUN pnpm build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
