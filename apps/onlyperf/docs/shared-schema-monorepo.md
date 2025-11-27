# Plan: Shared Drizzle Schema Between OnlyPerf and Warehouse

## Problem Statement

Two projects share the same PostgreSQL database with overlapping Drizzle ORM schemas:
- `warehouse-management` - 29 tables (source of truth, owns migrations)
- `onlyperf` - 14 tables (8 shared with warehouse, some unique)

Currently duplicating schema definitions manually, leading to potential drift.

## Current State

| Aspect | OnlyPerf | Warehouse |
|--------|----------|-----------|
| Path | `/perf/onlyperf` | `/perf/warehouse-management` |
| Schema | `src/server/db/schema.ts` (352 lines) | `src/server/db/schema.ts` (745 lines) |
| drizzle-orm | 0.44.6 | 0.41.0 |
| pnpm | 10.0.0 | 9.15.1 |
| Tables | 14 | 29 |
| Dockerized | Yes | Yes |

**Shared tables:** `products`, `brands`, `colors`, `shopifyProducts`, `shipmentItems`, `ownershipTransfers`, `customerScans`, `warrantyClaims`, `sepayTransactions`, `checkoutSessions`

**Key finding:** OnlyPerf uses table objects directly for queries (not just types), so it needs the actual Drizzle table definitions, not just TypeScript types.

---

## Recommended Approach: pnpm Workspace Monorepo

After evaluating three approaches (monorepo, npm package, keep manual sync), the **pnpm workspace monorepo** is recommended because:

1. No publishing overhead (local workspace protocol)
2. Single `pnpm install` updates all dependencies atomically
3. Docker builds remain in your control (no external registry auth)
4. TypeScript paths resolve directly in dev (no build step needed)
5. Both projects already use pnpm

### Directory Structure

```
perf-monorepo/
├── pnpm-workspace.yaml
├── package.json                    # Root workspace
├── packages/
│   └── db/
│       ├── package.json            # @perf/db
│       ├── tsconfig.json
│       ├── drizzle.config.ts       # Migrations owned here
│       ├── drizzle/                # Migration files (moved from warehouse)
│       └── src/
│           ├── index.ts
│           ├── schema/
│           │   ├── index.ts        # Re-exports all
│           │   ├── core.ts         # products, brands, colors, shopifyProducts
│           │   ├── inventory.ts    # shipmentItems (portable, no FK)
│           │   ├── customer-portal.ts  # ownershipTransfers, customerScans, warrantyClaims
│           │   └── payments.ts     # sepayTransactions, checkoutSessions
│           └── types.ts            # Exported TypeScript types
├── apps/
│   ├── onlyperf/                   # Moved from current location
│   └── warehouse-management/       # Moved from current location
```

### Implementation Steps

#### Phase 1: Setup Monorepo Root

1. Create `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "packages/*"
     - "apps/*"
   ```

2. Create root `package.json` with workspace scripts

3. Move projects to `apps/` directory

#### Phase 2: Create @perf/db Package

1. Create `packages/db/` with schema files
2. Export tables WITHOUT FK constraints (makes them portable)
3. Each consuming app defines its own Drizzle relations
4. Move migrations from warehouse to `packages/db/drizzle/`

#### Phase 3: Update Apps

1. Add `@perf/db: workspace:*` to both apps' dependencies
2. Update imports: `import { products } from "@perf/db/schema"`
3. Delete old schema.ts files
4. Define app-specific relations in each app's db/index.ts

#### Phase 4: Align Versions

1. Upgrade warehouse drizzle-orm: 0.41.0 → 0.44.6
2. Align pnpm versions to 10.0.0

#### Phase 5: Update Docker Builds

1. Update Dockerfiles to use monorepo root as build context
2. Build @perf/db first, then the app
3. Update docker-compose.yml at monorepo root

---

## Migration Workflow (Post-Implementation)

```bash
# From monorepo root
pnpm db:generate    # Generate migration in packages/db
pnpm db:push        # Push schema changes
pnpm db:studio      # Open Drizzle Studio

# Warehouse team can also run from their app directory
cd apps/warehouse-management
pnpm db:generate
```

---

## Critical Files to Modify

| File | Action |
|------|--------|
| `warehouse-management/src/server/db/schema.ts` | Extract shared tables to package |
| `onlyperf/src/server/db/schema.ts` | Replace with imports from @perf/db |
| `onlyperf/src/server/db/index.ts` | Define app-specific relations |
| `warehouse-management/src/server/db/index.ts` | Define warehouse relations |
| Both `Dockerfile`s | Update build context to monorepo root |
| Both `package.json`s | Add @perf/db dependency |
| Both `tsconfig.json`s | Add paths for @perf/db resolution |

---

## Detailed Implementation Checklist

### Step 1: Create Monorepo Structure

```bash
# 1. Create new monorepo directory
mkdir -p ~/Documents/personal/perf-monorepo
cd ~/Documents/personal/perf-monorepo
git init

# 2. Copy projects (without .git)
cp -r ../perf/onlyperf ./apps/onlyperf
cp -r ../perf/warehouse-management ./apps/warehouse-management
rm -rf apps/onlyperf/.git apps/warehouse-management/.git

# 3. Create packages/db structure
mkdir -p packages/db/src/schema

# 4. Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "packages/*"
  - "apps/*"
EOF

# 5. Create root package.json
cat > package.json << 'EOF'
{
  "name": "perf-monorepo",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "db:generate": "pnpm --filter @perf/db db:generate",
    "db:migrate": "pnpm --filter @perf/db db:migrate",
    "db:push": "pnpm --filter @perf/db db:push",
    "db:studio": "pnpm --filter @perf/db db:studio"
  }
}
EOF
```

### Step 2: Create @perf/db Package

**packages/db/package.json:**
```json
{
  "name": "@perf/db",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./schema/*": "./src/schema/*.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.6"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.5",
    "postgres": "^3.4.7",
    "typescript": "^5.8.2"
  }
}
```

### Step 3: Extract Schema Files

From `warehouse-management/src/server/db/schema.ts`, extract to:

- `packages/db/src/schema/core.ts` - products, brands, colors, shopifyProducts
- `packages/db/src/schema/inventory.ts` - shipmentItems (without FK constraints)
- `packages/db/src/schema/customer-portal.ts` - ownershipTransfers, customerScans, warrantyClaims
- `packages/db/src/schema/payments.ts` - sepayTransactions, checkoutSessions
- `packages/db/src/schema/index.ts` - barrel export

**Important:** Remove `.references()` calls from shared tables (e.g., shipmentItems.shipmentId should NOT reference shipments table). Each app adds relations locally.

### Step 4: Update App Dependencies

**apps/onlyperf/package.json:**
```json
{
  "dependencies": {
    "@perf/db": "workspace:*",
    "drizzle-orm": "^0.44.6"
  }
}
```

**apps/warehouse-management/package.json:**
```json
{
  "dependencies": {
    "@perf/db": "workspace:*",
    "drizzle-orm": "^0.44.6"  // upgraded from 0.41.0
  }
}
```

### Step 5: Update Imports in Apps

**apps/onlyperf/src/server/db/index.ts:**
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "@perf/db/schema";

const conn = postgres(env.DATABASE_URL);
export const db = drizzle(conn, { schema });

// Re-export for convenience
export * from "@perf/db/schema";
```

Delete `apps/onlyperf/src/server/db/schema.ts`

### Step 6: Update Warehouse Relations

**apps/warehouse-management/src/server/db/schema.ts** (keep for warehouse-only tables + relations):
```typescript
// Re-export shared tables
export * from "@perf/db/schema";

// Warehouse-only tables
export const user = pgTable("user", { ... });
export const shipments = pgTable("shipments", { ... });
// ... etc

// Define ALL relations here (including for shared tables)
export const shipmentItemsRelations = relations(shipmentItems, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentItems.shipmentId],
    references: [shipments.id],
  }),
  product: one(products, {
    fields: [shipmentItems.productId],
    references: [products.id],
  }),
}));
```

### Step 7: Move Migrations

```bash
mv apps/warehouse-management/drizzle packages/db/drizzle
```

### Step 8: Update Dockerfiles

Both Dockerfiles need to:
1. Use monorepo root as build context
2. Copy pnpm-workspace.yaml and root package.json
3. Build @perf/db before the app

Example Dockerfile structure:
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/onlyperf/package.json ./apps/onlyperf/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/db ./packages/db
COPY apps/onlyperf ./apps/onlyperf
WORKDIR /app/apps/onlyperf
RUN pnpm build

FROM base AS runner
# ... production image setup
```

### Step 9: Test

```bash
cd ~/Documents/personal/perf-monorepo
pnpm install
pnpm --filter @perf/db db:push  # Verify schema works
pnpm --filter onlyperf build    # Verify app builds
pnpm --filter perf_whm build    # Verify warehouse builds
```

---

## Git Strategy: New Monorepo

```bash
# After setup is complete
git add .
git commit -m "feat: initial monorepo structure with shared @perf/db package"

# Push to new GitHub repo
gh repo create ThangNguyenOnlyperf/perf-monorepo --private
git remote add origin git@github.com:ThangNguyenOnlyperf/perf-monorepo.git
git push -u origin main
```

Old repos can be archived after migration is verified working.

---

## Summary

| Decision | Choice |
|----------|--------|
| Approach | pnpm workspace monorepo |
| Schema changes | Weekly+ (justifies monorepo) |
| Restructure | Yes, apps/ subdirectory |
| drizzle-orm version | Align to 0.44.6 |
| Git strategy | New `perf-monorepo` repo |
