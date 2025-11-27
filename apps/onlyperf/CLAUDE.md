# OnlyPerf - Claude Development Guide

## Project Overview
E-commerce platform built with Next.js 15, Shopify Hydrogen React, and custom Sepay payment integration.

## Tech Stack
- **Next.js** 15.5.3 (with Turbopack)
- **React** 19.1.0
- **Shopify** Hydrogen React 2025.5.0
- **TypeScript** 5
- **Database** Drizzle ORM + PostgreSQL
- **Styling** TailwindCSS 4
- **Forms** React Hook Form + Zod validation
- **Data Fetching** React Query (@tanstack/react-query)
- **Code Quality** Biome (linter/formatter)
- **Authentication** Shopify Customer Account API (Confidential OAuth 2.0)

### Common Errors

**"Cookies can only be modified in a Server Action or Route Handler"**
- Cause: Trying to set cookies from Server Component
- Fix: Move cookie operations to Route Handler or Server Action

**401 Unauthorized**
- Cause: Token expired (1 hour lifetime) or invalid credentials
- Fix: Redirect user to `/login` to re-authenticate

### See Also
- **Shopify API Reference:** `/docs/customer-account/overview.md`

## Next.js 15 Breaking Changes

### ⚠️ Async Dynamic APIs (CRITICAL)
All dynamic APIs (`params`, `searchParams`, `cookies`, `headers`) are now **Promises** and MUST be awaited.

#### Page Props Pattern
```typescript
// ✅ CORRECT - Server Components (Pages)
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  // MUST await before accessing properties
  const { id } = await params;
  const { redirect, error } = await searchParams;
  // ... rest of component
}

// ❌ INCORRECT - Old Next.js 14 pattern
type PageProps = {
  params: { id: string };  // Missing Promise wrapper
  searchParams?: { redirect?: string };  // Missing Promise wrapper
};

export default async function Page({ params, searchParams }: PageProps) {
  const id = params.id;  // Will error: params is a Promise
  const redirect = searchParams?.redirect;  // Will error: searchParams is a Promise
}
```

#### Examples in Codebase
- ✅ `/src/app/checkout/[sessionId]/page.tsx` - Correct dynamic params usage
- ✅ `/src/app/collections/[handle]/page.tsx` - Correct dynamic params with metadata
- ✅ `/src/app/login/page.tsx` - Fixed searchParams usage

## Checkout Flow Architecture

### Current Implementation (Post-Order Summary Refactor)
```
1. Cart Page (CartSummary)
   └─ User adds items → Hydrogen React cart state
   └─ Click "Thanh toán" button → redirect to /checkout/order-summary

2. Order Summary Page (/checkout/order-summary)
   └─ Show cart items + totals (read-only)
   └─ Show saved addresses (if customer has any)
   └─ Collect shipping address (with Province API cascading selects)
   └─ Select payment method: Bank Transfer or COD
   └─ Discount code input (placeholder, UI only)

3A. Bank Transfer Flow
    └─ Click submit → create checkout session (POST /api/checkout/create-session)
    └─ Redirect to /checkout/[sessionId]
    └─ Display QR code & bank transfer info
    └─ Wait for Sepay webhook

3B. COD Flow (Cash On Delivery)
    └─ Click submit → create Shopify Draft Order directly
    └─ Skip payment session entirely
    └─ Redirect to /checkout/success

4. Webhook Processing (POST /api/webhooks/sepay) - Bank Transfer only
   └─ Update checkout session status in DB
   └─ Trigger order creation in Shopify

5. Result Pages
   └─ Success: /checkout/success
   └─ Failed: /checkout/failed
```

## Common Patterns

### Customer Authentication
```typescript
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";

const session = await readCustomerSessionFromCookies();
if (!session) {
  redirect("/login?redirect=/protected-page");
}

// Access customer data
const { customerAccessToken } = session;
```

## Known Issues & Fixes

### Issue 1: `searchParams` not awaited (FIXED)
**Error:** `Route "/login" used 'searchParams.redirect'. 'searchParams' should be awaited`

**Files Affected:** `/src/app/login/page.tsx`

**Fix:**
```typescript
// Change type definition
type PageProps = {
  searchParams: Promise<{ redirect?: string; error?: string }>;  // Add Promise wrapper
};

// Await before accessing
export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;  // Await first
  const redirect = params?.redirect;  // Then access
}
```

## Development Commands

```bash
# Development
pnpm dev                # Start dev server with Turbopack
pnpm build              # Production build with Turbopack
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run Biome checks
pnpm format             # Format with Biome
pnpm type-check         # TypeScript type checking

# Database
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Run migrations
pnpm db:push            # Push schema changes
pnpm db:studio          # Open Drizzle Studio

# Testing
pnpm test:sepay         # Test Sepay webhook locally
pnpm test:addresses     # Test customer address CRUD operations (requires OAuth token)
```

## Code Quality Standards

### Linting & Formatting
- ✅ Use **Biome** (not ESLint/Prettier)
- ✅ Run `pnpm lint` before commits
- ✅ Auto-format on save recommended

### TypeScript
- ✅ Strict mode enabled
- ✅ No `any` types unless absolutely necessary
- ✅ Explicit return types for complex functions

### Type Safety & Validation

**⚠️ NEVER use type assertions for data from external sources (DB, API, user input)**

#### Do's ✅
- **Use Zod for runtime validation** - Validate all data from DB, APIs, and user input
- **Centralize schemas** - Define Zod schemas in `/src/lib/*/schema.ts` files
- **Fail fast** - Use `.parse()` to throw immediately on invalid data
- **Log validation errors** - Always log `ZodError.issues` for debugging
- **Use type guards** - Replace `!` assertions with proper type narrowing

#### Don'ts ❌
- **No type assertions** - Never use `as` for external data (e.g., `data as MyType`)
- **No non-null assertions** - Avoid `!` operator (e.g., `value!`)
- **No JSON.parse without validation** - Always validate parsed JSON with Zod
- **No mixed validation** - Don't mix type assertions and Zod validation

#### Pattern: Validate DB Data
```typescript
// ❌ BAD - Type assertion (no runtime safety)
const lines = session.linesSnapshot as CheckoutLineSnapshot[];

// ✅ GOOD - Zod validation with error handling
import { checkoutLineSnapshotsArraySchema } from "@/lib/checkout/session-schema";

try {
  const lines = checkoutLineSnapshotsArraySchema.parse(session.linesSnapshot);
  // ... use validated data
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Invalid DB data:", { errors: error.issues });
    throw new Error("Dữ liệu không hợp lệ");
  }
  throw error;
}
```

#### Pattern: Replace Non-Null Assertions
```typescript
// ❌ BAD - Non-null assertion
.map((line) => ({ sku: line.sku! }))

// ✅ GOOD - Type guard
.filter((line): line is typeof line & { sku: string } =>
  Boolean(line.sku))
.map((line) => ({ sku: line.sku }))
```

#### Where to Validate
- **Server Actions** - All input data (use `.parse()`)
- **API Routes** - All request bodies (use `.safeParse()`)
- **Database reads** - All JSONB columns (use `.parse()`)
- **External APIs** - All webhook payloads (use `.safeParse()`)

#### Schema Organization
```
/src/lib/checkout/
├── session-schema.ts          # Zod schemas + inferred types
└── session-utils.ts           # Helper functions

// Export both schema and type
export const mySchema = z.object({ ... });
export type MyType = z.infer<typeof mySchema>;
```

### React Patterns
- ✅ Prefer **Server Components** by default
- ✅ Use `"use client"` directive only when needed:
  - Hooks (useState, useEffect, etc.)
  - Event handlers
  - Browser APIs
- ✅ Keep client components small and focused
- ✅ Use Server Actions for mutations

### Component Structure
```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component (when needed)
"use client";

import { useState } from "react";

export function InteractiveComponent() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(s => s + 1)}>{state}</button>;
}
```

## Project Structure

```
/src
├── /actions           # Server actions
├── /app              # Next.js App Router pages
│   ├── /api          # API routes
│   ├── /checkout     # Checkout flow pages
│   ├── /collections  # collections pages
│   └── /login        # Auth pages
├── /components       # React components
│   ├── /checkout     # Checkout-specific components
│   └── /ui           # Reusable UI components
├── /contexts         # React contexts
├── /db               # Database schema & config
├── /lib              # Utilities & helpers
│   ├── /i18n         # Internationalization
│   ├── /shopify      # Shopify integrations
│   └── /sepay        # Sepay payment integration
└── /types            # TypeScript type definitions
```

## Deployment Checklist

- [ ] Run `pnpm lint` and fix all issues
- [ ] Run `pnpm build` successfully
- [ ] Test checkout flow end-to-end
- [ ] Verify Sepay webhook endpoint is accessible
- [ ] Check environment variables are set:
  - Database connection
  - Shopify credentials
  - Sepay API keys
- [ ] Test in production-like environment first

## Additional Resources

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Shopify Hydrogen React Docs](https://shopify.dev/docs/api/hydrogen-react)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [TailwindCSS v4](https://tailwindcss.com/docs)

---

**Last Updated:** 2025-11-10 (Order Summary Refactor)
**Next.js Version:** 15.5.3
**React Query:** @tanstack/react-query (for Province API integration)
**Author:** Development Team
