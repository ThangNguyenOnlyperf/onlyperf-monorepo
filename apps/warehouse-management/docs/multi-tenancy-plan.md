# Multi-Tenancy Implementation Plan

## Overview

Implement multi-tenancy for the warehouse management app using:
- **Single PostgreSQL database** with `organizationId` column on all tenant tables
- **PostgreSQL Row-Level Security (RLS)** for bulletproof data isolation
- **Better-auth organization plugin** for organization management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
├─────────────────────────────────────────────────────────────┤
│  Auth Tables (no RLS)           │  Tenant Tables (with RLS) │
│  ├── user                       │  ├── products             │
│  ├── account                    │  ├── brands               │
│  ├── session (+activeOrgId)     │  ├── colors               │
│  ├── verification               │  ├── shipments            │
│  ├── organization (new)         │  ├── shipment_items       │
│  ├── member (new)               │  ├── orders               │
│  └── invitation (new)           │  ├── ... (20 tables)      │
│                                 │  └── organization_id FK   │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   RLS Policy Example    │
                    │   organization_id =     │
                    │   current_setting(      │
                    │   'app.current_org_id') │
                    └─────────────────────────┘
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database approach | Single DB + organizationId | Cost-effective, simplest to implement |
| Data isolation | PostgreSQL RLS | Bulletproof - even buggy code can't leak data |
| Catalog data | Per-org (not shared) | Each org has own products/brands/colors |
| Existing data | Keep as "Onlyperf" org | Friend starts fresh |
| Shopify | Configurable per org | Already have enable/disable field |

## Implementation Phases

### Phase 1: Better-Auth Organization Plugin Setup (2-3 hours)

**Files to modify:**
- `src/lib/auth.ts` - Add organization plugin
- `src/lib/auth-client.ts` - Add organizationClient plugin

**Changes to auth.ts:**
```typescript
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  // ... existing config
  plugins: [
    admin({ roleField: "role", defaultRole: "user", adminRole: "admin" }),
    organization({
      allowUserToCreateOrganization: (user) => user.role === "admin",
      creatorRole: "owner",
    }),
  ],
});
```

**Changes to auth-client.ts:**
```typescript
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [passkeyClient(), adminClient(), organizationClient()],
});
```

**Run migration:**
```bash
npx @better-auth/cli migrate
```

This creates: `organization`, `member`, `invitation` tables and adds `activeOrganizationId` to session.

---

### Phase 2: Schema Modifications (3-4 hours)

**File:** `src/server/db/schema.ts`

Add `organizationId` column to these 20 tables:

| Table | Notes |
|-------|-------|
| products | Core inventory |
| brands | Per-org catalog |
| colors | Per-org catalog |
| shipments | Core operations |
| shipmentItems | Core operations |
| storages | Physical locations |
| customers | Customer data |
| orders | Core operations |
| orderItems | Core operations |
| providers | Supplier relationships |
| deliveries | Delivery tracking |
| deliveryHistory | Audit trail |
| deliveryResolutions | Resolution tracking |
| scanningSessions | User sessions |
| shopifyProducts | Shopify mappings |
| sepayTransactions | Payment tracking |
| checkoutSessions | Checkout data |
| ownershipTransfers | Customer portal |
| customerScans | Analytics |
| warrantyClaims | Customer portal |

**Pattern for each table:**
```typescript
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(), // NEW
  name: text("name").notNull(),
  // ... rest of columns
}, (table) => ({
  organizationIdIdx: index("products_org_id_idx").on(table.organizationId),
}));
```

**Create organization settings table (new):**
```typescript
export const organizationSettings = pgTable("organization_settings", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().unique(),
  shopifyEnabled: boolean("shopify_enabled").default(false),
  shopifyShopDomain: text("shopify_shop_domain"),
  shopifyAccessToken: text("shopify_access_token"),
  sepayEnabled: boolean("sepay_enabled").default(false),
  sepayApiKey: text("sepay_api_key"),
  sepayAccountNumber: text("sepay_account_number"),
  defaultWarrantyMonths: integer("default_warranty_months").default(12),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

### Phase 3: PostgreSQL Row-Level Security (RLS) (2-3 hours)

**New file:** `src/server/db/rls-policies.sql`

```sql
-- Enable RLS on all tenant tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE storages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sepay_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (repeat for each table)
CREATE POLICY products_tenant_isolation ON products
  USING (organization_id = current_setting('app.current_org_id', true))
  WITH CHECK (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY brands_tenant_isolation ON brands
  USING (organization_id = current_setting('app.current_org_id', true))
  WITH CHECK (organization_id = current_setting('app.current_org_id', true));

-- ... repeat for all 20 tables

-- Special case: shipmentItems needs cross-check for QR scanning
-- QR codes are globally unique but must verify org ownership
CREATE POLICY shipment_items_tenant_isolation ON shipment_items
  USING (
    organization_id = current_setting('app.current_org_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );
```

---

### Phase 4: Organization Context Helper (1-2 hours)

**New file:** `src/lib/organization-context.ts`

```typescript
import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "~/server/db";
import { sql } from "drizzle-orm";

export interface OrgContext {
  organizationId: string;
  userId: string;
  userName: string;
  userRole: string;
}

/**
 * Sets the PostgreSQL session variable for RLS and returns org context.
 * MUST be called at the start of every server action.
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error("Chưa đăng nhập");
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error("Chưa chọn tổ chức");
  }

  // Set PostgreSQL session variable for RLS
  await db.execute(sql`SET app.current_org_id = ${activeOrgId}`);

  return {
    organizationId: activeOrgId,
    userId: session.user.id,
    userName: session.user.name,
    userRole: session.user.role ?? "user",
  };
}

/**
 * For operations that need to bypass RLS (e.g., global QR lookup)
 */
export async function withBypassRls<T>(fn: () => Promise<T>): Promise<T> {
  await db.execute(sql`SET app.bypass_rls = 'true'`);
  try {
    return await fn();
  } finally {
    await db.execute(sql`SET app.bypass_rls = 'false'`);
  }
}
```

---

### Phase 5: Server Action Modifications (8-12 hours)

**Pattern for all 25 action files:**

Before:
```typescript
export async function getBrandsAction() {
  const allBrands = await db.select().from(brands);
  return { success: true, data: allBrands };
}
```

After:
```typescript
export async function getBrandsAction() {
  const { organizationId } = await requireOrgContext();
  // RLS automatically filters - no need for WHERE clause!
  const allBrands = await db.select().from(brands);
  return { success: true, data: allBrands };
}

export async function createBrandAction(data: BrandFormData) {
  const { organizationId } = await requireOrgContext();
  const [newBrand] = await db.insert(brands).values({
    id: `brand_${Date.now()}`,
    organizationId, // Must include on INSERT
    name: data.name,
  }).returning();
  return { success: true, data: newBrand };
}
```

**Files to modify (25 total):**
1. `src/actions/brandActions.ts`
2. `src/actions/colorActions.ts`
3. `src/actions/productActions.ts`
4. `src/actions/shipmentActions.ts`
5. `src/actions/shipmentItemActions.ts`
6. `src/actions/storageActions.ts`
7. `src/actions/customerActions.ts`
8. `src/actions/orderActions.ts`
9. `src/actions/providerActions.ts`
10. `src/actions/deliveryActions.ts`
11. `src/actions/fulfillmentActions.ts`
12. `src/actions/scanActions.ts` (special: QR lookup needs bypass)
13. `src/actions/outboundActions.ts`
14. `src/actions/outboundSessionActions.ts`
15. `src/actions/paymentActions.ts`
16. `src/actions/reportActions.ts`
17. `src/actions/searchActions.ts`
18. `src/actions/badgeActions.ts`
19. `src/actions/logActions.ts`
20. `src/actions/shipmentPDFActions.ts`
21. `src/actions/setupActions.ts`
22. `src/actions/userActions.ts`
23. `src/actions/shopify/inventoryActions.ts`
24. `src/actions/shopify/orderWebhookActions.ts`
25. `src/actions/shopify/fulfillmentActions.ts`

---

### Phase 6: Data Migration (2-3 hours)

**Migration script:** `scripts/migrate-to-multi-tenant.ts`

```typescript
async function migrateToMultiTenant() {
  // 1. Create default "Onlyperf" organization
  const org = await auth.api.createOrganization({
    body: { name: "Onlyperf", slug: "onlyperf" },
    headers: adminHeaders,
  });

  // 2. Add organizationId column to all tables (nullable first)
  await db.execute(sql`ALTER TABLE products ADD COLUMN organization_id TEXT`);
  // ... repeat for all tables

  // 3. Migrate existing data to default org
  await db.execute(sql`UPDATE products SET organization_id = ${org.id}`);
  // ... repeat for all tables

  // 4. Make column NOT NULL
  await db.execute(sql`ALTER TABLE products ALTER COLUMN organization_id SET NOT NULL`);
  // ... repeat for all tables

  // 5. Add indexes
  await db.execute(sql`CREATE INDEX products_org_id_idx ON products(organization_id)`);
  // ... repeat for all tables

  // 6. Enable RLS and create policies
  // Run rls-policies.sql

  // 7. Add current user to default org as owner
  await auth.api.addMember({ ... });
}
```

---

### Phase 7: UI Components (3-4 hours)

**New files:**
- `src/components/organization/OrganizationSelector.tsx` - Dropdown in header
- `src/components/organization/OrganizationSettings.tsx` - Settings form
- `src/app/(dashboard)/admin/organizations/page.tsx` - Admin management

**OrganizationSelector.tsx:**
```typescript
'use client';

import { authClient } from '~/lib/auth-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { useRouter } from 'next/navigation';

export function OrganizationSelector() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    authClient.organization.list().then((res) => setOrganizations(res.data ?? []));
  }, []);

  const handleChange = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId });
    router.refresh();
  };

  return (
    <Select value={session?.session?.activeOrganizationId} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Chọn tổ chức" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Update dashboard header** to include OrganizationSelector.

---

## Critical Files Summary

| File | Change Type |
|------|-------------|
| `src/lib/auth.ts` | Add organization plugin |
| `src/lib/auth-client.ts` | Add organizationClient |
| `src/lib/organization-context.ts` | NEW - Org context helper |
| `src/server/db/schema.ts` | Add organizationId to 20 tables |
| `src/server/db/rls-policies.sql` | NEW - RLS setup script |
| `src/actions/*.ts` (25 files) | Add requireOrgContext() call |
| `src/components/organization/*.tsx` | NEW - UI components |

---

## Execution Order

1. **Phase 1**: Better-auth organization plugin (2-3 hours)
2. **Phase 2**: Schema modifications + run db:push (3-4 hours)
3. **Phase 3**: RLS policies (2-3 hours)
4. **Phase 4**: Organization context helper (1-2 hours)
5. **Phase 5**: Server action modifications (8-12 hours)
6. **Phase 6**: Data migration (2-3 hours)
7. **Phase 7**: UI components (3-4 hours)
8. **Testing**: End-to-end testing (4-6 hours)

**Total estimated effort: 25-37 hours**

---

## Why This Approach?

### Alternatives Considered

| Approach | Effort | Monthly Cost | Why Not? |
|----------|--------|--------------|----------|
| Schema per org | 136-208 hrs | ~$69 | DrizzleORM doesn't support well, complex migrations |
| Separate DB per org | Similar | $114-414 | Overkill for 2-5 orgs, high operational complexity |
| **Single DB + RLS** | **25-37 hrs** | **~$69** | **Best balance of security, simplicity, cost** |

### Benefits of RLS

1. **Bulletproof** - Database enforces isolation, not application code
2. **No WHERE clause needed** - RLS filters automatically on SELECT
3. **INSERT protection** - WITH CHECK ensures correct org on writes
4. **Audit-friendly** - Isolation is declarative and verifiable

---

## Sources

- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Building Multi-Tenant Apps with Better-Auth](https://zenstack.dev/blog/better-auth)
