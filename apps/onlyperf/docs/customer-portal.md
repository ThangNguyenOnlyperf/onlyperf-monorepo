# Customer QR Portal - Implementation Guide

**Version:** 1.0
**Last Updated:** 2025-11-14
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Specifications](#api-specifications)
5. [Page Routes](#page-routes)
6. [Warehouse Integration](#warehouse-integration)
7. [Component Architecture](#component-architecture)
8. [Implementation Phases](#implementation-phases)
9. [Security Considerations](#security-considerations)
10. [Testing Guide](#testing-guide)

---

## Overview

### Purpose
Enable customers to scan QR codes on physical products (paddles) and access a customer portal with:
- Product authenticity verification
- Warranty status tracking
- Order history (for logged-in owners)
- Product specifications and care guides
- Warranty claim submission

### Architecture Decision
**Chosen Approach:** Build portal in **OnlyPerf** (customer-facing e-commerce app)

**Why OnlyPerf?**
- ✅ Customer auth already integrated (Shopify OAuth)
- ✅ Same domain (onlyperf.com) - better UX
- ✅ Brand consistency with existing site
- ✅ Warehouse stays internal/secure
- ✅ Clear separation: staff tools vs customer tools

**Alternative Considered:** Warehouse portal
- ❌ Would mix internal (staff) and public (customer) routes
- ❌ Need to implement customer auth from scratch
- ❌ Different domain/branding
- ❌ Security risk exposing warehouse system

### Key Features

#### Public Access (No Login Required)
- ✅ Authenticity verification badge
- ✅ Product images and specifications
- ✅ Generic warranty information
- ✅ Care guide downloads
- ✅ Contact support

#### Authenticated Access (Logged-in Owner)
- ✅ Exact warranty expiration date
- ✅ Purchase date and order number
- ✅ Order history
- ✅ Submit warranty claim
- ✅ Download invoice/receipt
- ✅ Register product (if not auto-registered)

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CUSTOMER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

1. Purchase Flow
   Customer browses OnlyPerf → Add to cart → Checkout
                    ↓
   Create Shopify order (with customer ID)
                    ↓
   Order sent to Warehouse for fulfillment

2. Fulfillment Flow (Warehouse)
   Staff scans paddle QR code (ABCD1234)
                    ↓
   System links shipmentItem → orderItem
                    ↓
   Order marked as "fulfilled"
                    ↓
   🔔 Webhook triggered → POST to OnlyPerf

3. Data Sync (Warehouse → OnlyPerf)
   POST /api/webhooks/warehouse-sync
   Payload: { qrCode, shopifyOrderId, customerId, productDetails, ... }
                    ↓
   OnlyPerf creates product_units record
                    ↓
   Warranty period starts (purchaseDate + 1 year)

4. Customer Portal Access
   Customer receives paddle → Scans QR code
                    ↓
   Redirects to: https://onlyperf.com/p/ABCD1234
                    ↓
   Portal page loads:
     - Lookup product_units by qrCode
     - Check if current user === owner
     - Display appropriate view (public vs owner)
                    ↓
   Log scan event (analytics + fraud detection)

5. Warranty & Support
   Customer views warranty status
                    ↓
   If issue occurs → Click "Submit Claim"
                    ↓
   POST /api/warranty/claim
                    ↓
   Create warranty_claims record
                    ↓
   Support team reviews claim
```

### Integration Points

```
┌───────────────────────────────────┐
│   WAREHOUSE APP (Internal)        │
│   - Product tracking              │
│   - Fulfillment scanning          │
│   - QR generation                 │
└───────────┬───────────────────────┘
            │
            │ Webhook (HTTPS)
            │ POST /api/webhooks/warehouse-sync
            ↓
┌───────────────────────────────────┐
│   ONLYPERF APP (Customer-Facing)  │
│   - Customer portal               │
│   - Warranty tracking             │
│   - Customer auth                 │
└───────────────────────────────────┘
            ↑
            │ Shopify APIs
            │
┌───────────────────────────────────┐
│   SHOPIFY (External)              │
│   - Product catalog               │
│   - Customer accounts             │
│   - Order management              │
└───────────────────────────────────┘
```

### QR Code Format

**Generated by:** Warehouse app
**Format:** `https://onlyperf.com/p/ABCD1234`

**Short Code Structure:**
- 4 uppercase letters (A-Z, excluding O and I)
- 4 digits (0-9)
- Total combinations: **331,776,000** unique codes

**Example:** `ABCD1234`, `XYZW9876`

**QR Properties:**
- Size: 177px at 300 DPI (1.5cm physical size)
- Error correction: Level H (30% correction)
- Encoding: URL format

---

## Database Schema

### 1. product_units Table

**Purpose:** Track individual product units sold to customers

```typescript
// /src/db/schema/product-units.ts

import { pgTable, uuid, varchar, timestamp, jsonb, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const warrantyStatusEnum = pgEnum('warranty_status', [
  'active',
  'expired',
  'void',
  'claimed'
]);

export const productUnitStatusEnum = pgEnum('product_unit_status', [
  'active',
  'returned',
  'replaced',
  'warranty_claim'
]);

export const productUnits = pgTable('product_units', {
  // Primary key
  id: uuid('id').defaultRandom().primaryKey(),

  // QR code (unique identifier)
  qrCode: varchar('qr_code', { length: 8 }).notNull().unique(), // ABCD1234

  // Shopify references
  shopifyProductId: varchar('shopify_product_id', { length: 255 }).notNull(),
  shopifyVariantId: varchar('shopify_variant_id', { length: 255 }).notNull(),
  shopifyOrderId: varchar('shopify_order_id', { length: 255 }).notNull(),
  customerId: varchar('customer_id', { length: 255 }).notNull(), // Shopify customer GID

  // Product details snapshot (from warehouse)
  productDetails: jsonb('product_details').notNull().$type<{
    brand: string;
    model: string;
    color: string;
    weight: string;
    size: string;
    thickness: string;
    material: string;
    handleLength: string;
    handleCircumference: string;
    price: number;
  }>(),

  // Warranty tracking
  purchaseDate: timestamp('purchase_date', { withTimezone: true }).notNull(),
  warrantyEndDate: timestamp('warranty_end_date', { withTimezone: true }).notNull(),
  warrantyStatus: warrantyStatusEnum('warranty_status').notNull().default('active'),
  warrantyMonths: integer('warranty_months').notNull().default(12), // Configurable per product

  // Authentication
  isAuthentic: boolean('is_authentic').notNull().default(true),
  authenticationDate: timestamp('authentication_date', { withTimezone: true }).defaultNow(),
  authenticationNotes: varchar('authentication_notes', { length: 500 }),

  // Status
  status: productUnitStatusEnum('status').notNull().default('active'),

  // Analytics
  firstScannedAt: timestamp('first_scanned_at', { withTimezone: true }),
  lastScannedAt: timestamp('last_scanned_at', { withTimezone: true }),
  scanCount: integer('scan_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Indexes
export const productUnitsIndexes = {
  qrCodeIdx: index('product_units_qr_code_idx').on(productUnits.qrCode),
  customerIdIdx: index('product_units_customer_id_idx').on(productUnits.customerId),
  warrantyStatusIdx: index('product_units_warranty_status_idx').on(productUnits.warrantyStatus)
};
```

**Example Record:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "qrCode": "ABCD1234",
  "shopifyProductId": "gid://shopify/Product/123456789",
  "shopifyVariantId": "gid://shopify/ProductVariant/987654321",
  "shopifyOrderId": "gid://shopify/Order/111222333",
  "customerId": "gid://shopify/Customer/444555666",
  "productDetails": {
    "brand": "Wilson",
    "model": "Pro Staff 97",
    "color": "Black",
    "weight": "340g",
    "size": "L",
    "thickness": "21mm",
    "material": "Carbon Fiber",
    "handleLength": "27cm",
    "handleCircumference": "110mm",
    "price": 2500000
  },
  "purchaseDate": "2025-11-14T10:30:00Z",
  "warrantyEndDate": "2026-11-14T10:30:00Z",
  "warrantyStatus": "active",
  "warrantyMonths": 12,
  "isAuthentic": true,
  "status": "active",
  "firstScannedAt": "2025-11-15T08:00:00Z",
  "lastScannedAt": "2025-11-15T08:00:00Z",
  "scanCount": 1,
  "createdAt": "2025-11-14T11:00:00Z",
  "updatedAt": "2025-11-15T08:00:00Z"
}
```

### 2. product_scans Table

**Purpose:** Track every QR code scan for analytics and fraud detection

```typescript
// /src/db/schema/product-scans.ts

export const productScans = pgTable('product_scans', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Reference to product unit
  qrCode: varchar('qr_code', { length: 8 }).notNull(),
  productUnitId: uuid('product_unit_id').references(() => productUnits.id, { onDelete: 'cascade' }),

  // Scanner info
  customerId: varchar('customer_id', { length: 255 }), // Null if not logged in

  // Request metadata
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: varchar('user_agent', { length: 500 }),

  // Geo-location (optional)
  location: jsonb('location').$type<{
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  }>(),

  // Timestamp
  scannedAt: timestamp('scanned_at', { withTimezone: true }).defaultNow().notNull()
});

// Indexes
export const productScansIndexes = {
  qrCodeIdx: index('product_scans_qr_code_idx').on(productScans.qrCode),
  scannedAtIdx: index('product_scans_scanned_at_idx').on(productScans.scannedAt)
};
```

**Use Cases:**
- Analytics: Track scan frequency, locations
- Fraud detection: Alert if same QR scanned from multiple countries
- Customer insights: Understand product usage patterns

### 3. warranty_claims Table

**Purpose:** Customer warranty claim submission and tracking

```typescript
// /src/db/schema/warranty-claims.ts

export const claimTypeEnum = pgEnum('claim_type', [
  'defect',       // Manufacturing defect
  'damage',       // Shipping/handling damage
  'repair',       // Needs repair
  'replacement'   // Request replacement
]);

export const claimStatusEnum = pgEnum('claim_status', [
  'pending',      // Awaiting review
  'approved',     // Approved by support
  'rejected',     // Denied
  'completed',    // Resolved (refund/replacement sent)
  'cancelled'     // Cancelled by customer
]);

export const warrantyClaims = pgTable('warranty_claims', {
  id: uuid('id').defaultRandom().primaryKey(),

  // References
  productUnitId: uuid('product_unit_id')
    .notNull()
    .references(() => productUnits.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 255 }).notNull(),

  // Claim details
  claimType: claimTypeEnum('claim_type').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: varchar('description', { length: 2000 }).notNull(),

  // Evidence
  images: jsonb('images').$type<string[]>(), // Array of image URLs

  // Status
  status: claimStatusEnum('status').notNull().default('pending'),

  // Resolution
  resolution: varchar('resolution', { length: 1000 }),
  internalNotes: varchar('internal_notes', { length: 1000 }), // Staff notes

  // Timestamps
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Indexes
export const warrantyClaimsIndexes = {
  productUnitIdx: index('warranty_claims_product_unit_idx').on(warrantyClaims.productUnitId),
  customerIdx: index('warranty_claims_customer_idx').on(warrantyClaims.customerId),
  statusIdx: index('warranty_claims_status_idx').on(warrantyClaims.status)
};
```

### Database Migration

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate

# Verify in Drizzle Studio
pnpm db:studio
```

---

## API Specifications

### 1. Warehouse Sync Webhook

**Endpoint:** `POST /api/webhooks/warehouse-sync`

**Purpose:** Receive product unit data from warehouse when order is fulfilled

**Authentication:** Webhook secret (shared between warehouse and OnlyPerf)

**Request Headers:**
```http
POST /api/webhooks/warehouse-sync HTTP/1.1
Host: onlyperf.com
Content-Type: application/json
X-Webhook-Secret: <WAREHOUSE_WEBHOOK_SECRET>
```

**Request Body:**
```typescript
interface WarehouseSyncPayload {
  event: 'product.sold' | 'product.returned' | 'product.replaced';
  data: {
    qrCode: string;                    // ABCD1234
    shopifyOrderId: string;            // gid://shopify/Order/123
    shopifyOrderNumber: string;        // #1001
    customerId: string;                // gid://shopify/Customer/456
    productId: string;                 // Warehouse product ID
    shopifyProductId: string;          // gid://shopify/Product/789
    shopifyVariantId: string;          // gid://shopify/ProductVariant/101112
    purchaseDate: string;              // ISO 8601 timestamp
    warrantyMonths: number;            // Default: 12
    productDetails: {
      name: string;
      brand: string;
      model: string;
      color: string;
      weight: string;
      size: string;
      thickness: string;
      material: string;
      handleLength: string;
      handleCircumference: string;
      price: number;                   // VND
    };
  };
}
```

**Example Request:**
```json
{
  "event": "product.sold",
  "data": {
    "qrCode": "ABCD1234",
    "shopifyOrderId": "gid://shopify/Order/123456789",
    "shopifyOrderNumber": "#1001",
    "customerId": "gid://shopify/Customer/987654321",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "shopifyProductId": "gid://shopify/Product/111222333",
    "shopifyVariantId": "gid://shopify/ProductVariant/444555666",
    "purchaseDate": "2025-11-14T10:30:00Z",
    "warrantyMonths": 12,
    "productDetails": {
      "name": "Wilson Pro Staff 97",
      "brand": "Wilson",
      "model": "Pro Staff 97",
      "color": "Black",
      "weight": "340g",
      "size": "L",
      "thickness": "21mm",
      "material": "Carbon Fiber",
      "handleLength": "27cm",
      "handleCircumference": "110mm",
      "price": 2500000
    }
  }
}
```

**Response:**
```typescript
// Success
{
  "success": true,
  "productUnitId": "550e8400-e29b-41d4-a716-446655440000"
}

// Error - Invalid secret
{
  "success": false,
  "error": "Unauthorized"
}

// Error - Duplicate QR code
{
  "success": false,
  "error": "Product unit already exists"
}

// Error - Validation failed
{
  "success": false,
  "error": "Invalid payload",
  "details": [
    { "field": "qrCode", "message": "Invalid format" }
  ]
}
```

**Implementation:**
```typescript
// /src/app/api/webhooks/warehouse-sync/route.ts

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { productUnits } from '@/db/schema/product-units';
import { z } from 'zod';
import { addMonths } from 'date-fns';

const warehouseSyncSchema = z.object({
  event: z.enum(['product.sold', 'product.returned', 'product.replaced']),
  data: z.object({
    qrCode: z.string().regex(/^[A-Z]{4}\d{4}$/),
    shopifyOrderId: z.string().startsWith('gid://shopify/Order/'),
    shopifyOrderNumber: z.string(),
    customerId: z.string().startsWith('gid://shopify/Customer/'),
    productId: z.string().uuid(),
    shopifyProductId: z.string().startsWith('gid://shopify/Product/'),
    shopifyVariantId: z.string().startsWith('gid://shopify/ProductVariant/'),
    purchaseDate: z.string().datetime(),
    warrantyMonths: z.number().int().positive().default(12),
    productDetails: z.object({
      name: z.string(),
      brand: z.string(),
      model: z.string(),
      color: z.string(),
      weight: z.string(),
      size: z.string(),
      thickness: z.string(),
      material: z.string(),
      handleLength: z.string(),
      handleCircumference: z.string(),
      price: z.number().int().positive()
    })
  })
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret
    const secret = request.headers.get('X-Webhook-Secret');
    if (secret !== process.env.WAREHOUSE_WEBHOOK_SECRET) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate payload
    const body = await request.json();
    const result = warehouseSyncSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: 'Invalid payload',
          details: result.error.issues
        },
        { status: 400 }
      );
    }

    const { event, data } = result.data;

    // 3. Handle event
    if (event === 'product.sold') {
      const purchaseDate = new Date(data.purchaseDate);
      const warrantyEndDate = addMonths(purchaseDate, data.warrantyMonths);

      // Insert or update product unit
      const [productUnit] = await db
        .insert(productUnits)
        .values({
          qrCode: data.qrCode,
          shopifyProductId: data.shopifyProductId,
          shopifyVariantId: data.shopifyVariantId,
          shopifyOrderId: data.shopifyOrderId,
          customerId: data.customerId,
          productDetails: data.productDetails,
          purchaseDate,
          warrantyEndDate,
          warrantyMonths: data.warrantyMonths,
          warrantyStatus: 'active',
          isAuthentic: true,
          status: 'active'
        })
        .onConflictDoUpdate({
          target: productUnits.qrCode,
          set: {
            shopifyOrderId: data.shopifyOrderId,
            customerId: data.customerId,
            purchaseDate,
            warrantyEndDate,
            updatedAt: new Date()
          }
        })
        .returning();

      return Response.json({
        success: true,
        productUnitId: productUnit.id
      });
    }

    // Handle other events (returned, replaced)
    // TODO: Implement based on requirements

    return Response.json({ success: true });

  } catch (error) {
    console.error('Warehouse sync error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Product Verification API

**Endpoint:** `GET /api/products/verify/[qrCode]`

**Purpose:** Lookup product unit by QR code and return portal data

**Authentication:** Optional (customer session via cookies)

**Request:**
```http
GET /api/products/verify/ABCD1234 HTTP/1.1
Host: onlyperf.com
Cookie: shopify_customer_session=...
```

**Response:**
```typescript
interface ProductVerificationResponse {
  success: boolean;
  data: {
    // Product info
    product: {
      id: string;
      name: string;
      brand: string;
      model: string;
      color: string;
      weight: string;
      size: string;
      thickness: string;
      material: string;
      handleLength: string;
      handleCircumference: string;
      images: string[]; // From Shopify
    };

    // Unit info
    unit: {
      qrCode: string;
      isAuthentic: boolean;
      warrantyStatus: 'active' | 'expired' | 'void' | 'claimed';
      warrantyMonths: number;
      scanCount: number;
    };

    // Ownership info (only if logged in as owner)
    ownership?: {
      isOwner: boolean;
      purchaseDate: string;
      warrantyEndDate: string;
      warrantyDaysRemaining: number;
      orderNumber: string;
      pricePaid: number;
    };
  };
}
```

**Example Response (Public - Not Logged In):**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "gid://shopify/Product/123",
      "name": "Wilson Pro Staff 97",
      "brand": "Wilson",
      "model": "Pro Staff 97",
      "color": "Black",
      "weight": "340g",
      "size": "L",
      "thickness": "21mm",
      "material": "Carbon Fiber",
      "handleLength": "27cm",
      "handleCircumference": "110mm",
      "images": [
        "https://cdn.shopify.com/...",
        "https://cdn.shopify.com/..."
      ]
    },
    "unit": {
      "qrCode": "ABCD1234",
      "isAuthentic": true,
      "warrantyStatus": "active",
      "warrantyMonths": 12,
      "scanCount": 5
    }
  }
}
```

**Example Response (Logged In - Owner):**
```json
{
  "success": true,
  "data": {
    "product": { /* same as above */ },
    "unit": { /* same as above */ },
    "ownership": {
      "isOwner": true,
      "purchaseDate": "2025-11-14T10:30:00Z",
      "warrantyEndDate": "2026-11-14T10:30:00Z",
      "warrantyDaysRemaining": 324,
      "orderNumber": "#1001",
      "pricePaid": 2500000
    }
  }
}
```

### 3. Scan Tracking API

**Endpoint:** `POST /api/products/scan`

**Purpose:** Log scan event for analytics and fraud detection

**Request:**
```typescript
interface ScanTrackingRequest {
  qrCode: string;
  location?: {
    lat: number;
    lng: number;
  };
}
```

**Response:**
```typescript
{
  "success": true,
  "scanCount": 6
}
```

### 4. Warranty Claim API

**Endpoint:** `POST /api/warranty/claim`

**Purpose:** Submit warranty claim

**Authentication:** Required (customer must be logged in)

**Request:**
```typescript
interface WarrantyClaimRequest {
  qrCode: string;
  claimType: 'defect' | 'damage' | 'repair' | 'replacement';
  title: string;
  description: string;
  images: File[]; // Multipart form data
}
```

**Response:**
```typescript
{
  "success": true,
  "claimId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

---

## Page Routes

### 1. Product Portal Page

**Route:** `/app/p/[qrCode]/page.tsx`

**Purpose:** Main customer portal for scanned product

**Features:**
- Display product authenticity badge
- Show product images (carousel)
- Display product specifications
- Show warranty status
- Display order history (if owner)
- Link to warranty claim form
- Track scan event

**Implementation:**
```typescript
// /src/app/p/[qrCode]/page.tsx

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/db';
import { productUnits, productScans } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { readCustomerSessionFromCookies } from '@/lib/shopify/customer-account';
import { getProductById } from '@/lib/shopify/storefront';
import { ProductPortal } from '@/components/product-portal/ProductPortal';

interface ProductPortalPageProps {
  params: Promise<{
    qrCode: string;
  }>;
}

// Metadata
export async function generateMetadata({
  params
}: ProductPortalPageProps): Promise<Metadata> {
  const { qrCode } = await params;

  const unit = await db.query.productUnits.findFirst({
    where: eq(productUnits.qrCode, qrCode.toUpperCase())
  });

  if (!unit) {
    return { title: 'Sản phẩm không tìm thấy | OnlyPerf' };
  }

  return {
    title: `${unit.productDetails.brand} ${unit.productDetails.model} | OnlyPerf`,
    description: `Xác thực sản phẩm OnlyPerf chính hãng - ${unit.productDetails.brand} ${unit.productDetails.model}`
  };
}

export default async function ProductPortalPage({
  params
}: ProductPortalPageProps) {
  const { qrCode } = await params;
  const normalizedQrCode = qrCode.toUpperCase();

  // 1. Validate QR code format
  if (!/^[A-Z]{4}\d{4}$/.test(normalizedQrCode)) {
    notFound();
  }

  // 2. Lookup product unit
  const unit = await db.query.productUnits.findFirst({
    where: eq(productUnits.qrCode, normalizedQrCode)
  });

  if (!unit) {
    notFound();
  }

  // 3. Get customer session
  const session = await readCustomerSessionFromCookies();
  const isOwner = session?.customerId === unit.customerId;

  // 4. Get product data from Shopify
  const shopifyProduct = await getProductById(unit.shopifyProductId);

  // 5. Track scan event
  await db.insert(productScans).values({
    qrCode: normalizedQrCode,
    productUnitId: unit.id,
    customerId: session?.customerId || null,
    scannedAt: new Date()
  });

  // 6. Update scan count
  await db
    .update(productUnits)
    .set({
      lastScannedAt: new Date(),
      scanCount: unit.scanCount + 1,
      firstScannedAt: unit.firstScannedAt || new Date()
    })
    .where(eq(productUnits.id, unit.id));

  // 7. Calculate warranty info
  const now = new Date();
  const warrantyDaysRemaining = Math.max(
    0,
    Math.floor(
      (unit.warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // 8. Render portal
  return (
    <ProductPortal
      unit={unit}
      product={shopifyProduct}
      isOwner={isOwner}
      warrantyDaysRemaining={warrantyDaysRemaining}
      isLoggedIn={!!session}
    />
  );
}
```

### 2. Customer Dashboard Page

**Route:** `/app/my-products/page.tsx`

**Purpose:** List all products owned by logged-in customer

**Features:**
- Show all products with QR codes
- Quick access to each product portal
- Warranty status overview
- Filter by warranty status

**Implementation:**
```typescript
// /src/app/my-products/page.tsx

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/db';
import { productUnits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { readCustomerSessionFromCookies } from '@/lib/shopify/customer-account';
import { MyProductsDashboard } from '@/components/product-portal/MyProductsDashboard';

export const metadata: Metadata = {
  title: 'Sản phẩm của tôi | OnlyPerf',
  description: 'Quản lý sản phẩm và bảo hành'
};

export default async function MyProductsPage() {
  // 1. Require authentication
  const session = await readCustomerSessionFromCookies();
  if (!session) {
    redirect('/login?redirect=/my-products');
  }

  // 2. Get all products owned by customer
  const units = await db.query.productUnits.findMany({
    where: eq(productUnits.customerId, session.customerId),
    orderBy: (productUnits, { desc }) => [desc(productUnits.purchaseDate)]
  });

  // 3. Calculate warranty info for each
  const now = new Date();
  const productsWithWarranty = units.map(unit => ({
    ...unit,
    warrantyDaysRemaining: Math.max(
      0,
      Math.floor(
        (unit.warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    )
  }));

  return <MyProductsDashboard products={productsWithWarranty} />;
}
```

---

## Warehouse Integration

### Webhook Setup

**Warehouse App Changes:**

**1. Add Webhook Action**

Create `/src/actions/webhooks.ts` in warehouse app:

```typescript
// warehouse-management/src/actions/webhooks.ts

'use server';

import { db } from '@/db';
import { orders, orderItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ONLYPERF_WEBHOOK_URL = process.env.ONLYPERF_WEBHOOK_URL || 'https://onlyperf.com/api/webhooks/warehouse-sync';
const WEBHOOK_SECRET = process.env.ONLYPERF_WEBHOOK_SECRET;

export async function notifyOnlyPerfOrderFulfilled(orderId: string) {
  try {
    // 1. Get order with all items
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderItems: {
          with: {
            product: true,
            shipmentItem: true
          }
        }
      }
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 2. Send webhook for each item with QR code
    const results = await Promise.allSettled(
      order.orderItems
        .filter(item => item.qrCode && item.shipmentItem)
        .map(async (item) => {
          const payload = {
            event: 'product.sold',
            data: {
              qrCode: item.qrCode!,
              shopifyOrderId: order.shopifyOrderId!,
              shopifyOrderNumber: order.shopifyOrderNumber!,
              customerId: order.customerId || '',
              productId: item.product.id,
              shopifyProductId: item.product.shopifyProductId || '',
              shopifyVariantId: item.product.shopifyVariantId || '',
              purchaseDate: order.createdAt.toISOString(),
              warrantyMonths: 12, // TODO: Make configurable per product
              productDetails: {
                name: item.product.name,
                brand: item.product.brand,
                model: item.product.model,
                color: item.product.color,
                weight: item.product.weight,
                size: item.product.size,
                thickness: item.product.thickness,
                material: item.product.material,
                handleLength: item.product.handleLength,
                handleCircumference: item.product.handleCircumference,
                price: item.price
              }
            }
          };

          const response = await fetch(ONLYPERF_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Secret': WEBHOOK_SECRET!
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
          }

          return await response.json();
        })
    );

    // 3. Log results
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error('Some webhooks failed:', failed);
    }

    return {
      success: true,
      total: results.length,
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: failed.length
    };

  } catch (error) {
    console.error('Error sending OnlyPerf webhook:', error);
    throw error;
  }
}
```

**2. Update Fulfillment Action**

Modify `/src/actions/fulfillmentActions.ts` in warehouse app:

```typescript
// Add to fulfillCompleteAction()

import { notifyOnlyPerfOrderFulfilled } from './webhooks';

export async function fulfillCompleteAction(orderId: string) {
  // ... existing fulfillment logic ...

  // After successfully marking order as fulfilled:
  try {
    await notifyOnlyPerfOrderFulfilled(orderId);
    console.log(`✅ OnlyPerf notified for order ${orderId}`);
  } catch (error) {
    console.error(`❌ Failed to notify OnlyPerf for order ${orderId}:`, error);
    // Don't fail the fulfillment if webhook fails
    // TODO: Implement retry queue
  }

  return { success: true };
}
```

**3. Environment Variables**

Add to warehouse `.env`:

```bash
# OnlyPerf Integration
ONLYPERF_WEBHOOK_URL=https://onlyperf.com/api/webhooks/warehouse-sync
ONLYPERF_WEBHOOK_SECRET=<generate-strong-secret>
```

Add to OnlyPerf `.env`:

```bash
# Warehouse Integration
WAREHOUSE_WEBHOOK_SECRET=<same-as-above>
```

### Error Handling & Retries

**Webhook Retry Strategy:**

1. **Immediate Retry:** If webhook fails, retry once immediately
2. **Queue System:** If still fails, add to retry queue (future enhancement)
3. **Manual Sync:** Admin can trigger manual sync for failed orders

**Implementation (Future):**

```typescript
// /src/lib/queue/webhook-retry.ts

import { db } from '@/db';
import { webhookRetries } from '@/db/schema';

export async function enqueueWebhookRetry(payload: any) {
  await db.insert(webhookRetries).values({
    payload,
    attempts: 0,
    maxAttempts: 3,
    nextRetryAt: new Date(Date.now() + 60000) // Retry in 1 minute
  });
}

// Cron job to process retry queue
export async function processWebhookRetries() {
  const pending = await db.query.webhookRetries.findMany({
    where: and(
      eq(webhookRetries.status, 'pending'),
      lte(webhookRetries.nextRetryAt, new Date())
    ),
    limit: 10
  });

  for (const retry of pending) {
    // Attempt webhook delivery
    // Update retry count
    // If max attempts reached, mark as failed
  }
}
```

### Testing Webhook Locally

**1. Use ngrok to expose local server:**

```bash
# Install ngrok
brew install ngrok

# Start OnlyPerf dev server
pnpm dev

# Expose to internet
ngrok http 3000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
```

**2. Update warehouse .env:**

```bash
ONLYPERF_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/warehouse-sync
```

**3. Trigger fulfillment in warehouse app**

**4. Check OnlyPerf logs:**

```bash
# Should see webhook received
[POST] /api/webhooks/warehouse-sync
Webhook received: product.sold for QR code ABCD1234
```

---

## Component Architecture

### Component Tree

```
<ProductPortal>
├── <AuthenticationBadge isAuthentic={true} />
├── <ProductImageCarousel images={[...]} />
├── <ProductInfo details={...} />
├── <WarrantyStatusCard
│     status="active"
│     daysRemaining={324}
│     endDate={...}
│   />
├── {isOwner && (
│     <OwnershipCard
│       purchaseDate={...}
│       orderNumber={...}
│       pricePaid={...}
│     />
│   )}
├── <ProductSpecifications specs={...} />
├── <DocumentsSection />
└── <SupportSection qrCode="ABCD1234" />
```

### 1. ProductPortal Component

**File:** `/src/components/product-portal/ProductPortal.tsx`

```typescript
'use client';

import { ProductUnit } from '@/db/schema/product-units';
import { StorefrontProductDetail } from '@/lib/shopify/types';
import { AuthenticationBadge } from './AuthenticationBadge';
import { ProductImageCarousel } from './ProductImageCarousel';
import { WarrantyStatusCard } from './WarrantyStatusCard';
import { OwnershipCard } from './OwnershipCard';
import { ProductSpecifications } from './ProductSpecifications';
import { SupportSection } from './SupportSection';

interface ProductPortalProps {
  unit: ProductUnit;
  product: StorefrontProductDetail;
  isOwner: boolean;
  warrantyDaysRemaining: number;
  isLoggedIn: boolean;
}

export function ProductPortal({
  unit,
  product,
  isOwner,
  warrantyDaysRemaining,
  isLoggedIn
}: ProductPortalProps) {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Authentication Badge */}
      <AuthenticationBadge isAuthentic={unit.isAuthentic} />

      {/* Product Images */}
      <div className="mt-6">
        <ProductImageCarousel images={product.images} />
      </div>

      {/* Product Title */}
      <h1 className="mt-6 text-3xl font-bold">
        {unit.productDetails.brand} {unit.productDetails.model}
      </h1>
      <p className="text-gray-600">
        Màu: {unit.productDetails.color} | Kích thước: {unit.productDetails.size}
      </p>

      {/* Warranty Status */}
      <div className="mt-8">
        <WarrantyStatusCard
          status={unit.warrantyStatus}
          daysRemaining={warrantyDaysRemaining}
          startDate={unit.purchaseDate}
          endDate={unit.warrantyEndDate}
          isOwner={isOwner}
          qrCode={unit.qrCode}
        />
      </div>

      {/* Ownership Card (only for owner) */}
      {isOwner && (
        <div className="mt-6">
          <OwnershipCard
            purchaseDate={unit.purchaseDate}
            orderNumber={unit.shopifyOrderId}
            pricePaid={unit.productDetails.price}
          />
        </div>
      )}

      {/* Login Prompt (if not logged in) */}
      {!isLoggedIn && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Đăng nhập để xem thông tin bảo hành chi tiết và lịch sử mua hàng của bạn
          </p>
          <a
            href={`/login?redirect=/p/${unit.qrCode}`}
            className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Đăng nhập
          </a>
        </div>
      )}

      {/* Product Specifications */}
      <div className="mt-8">
        <ProductSpecifications specs={unit.productDetails} />
      </div>

      {/* Support Section */}
      <div className="mt-8">
        <SupportSection qrCode={unit.qrCode} />
      </div>
    </main>
  );
}
```

### 2. AuthenticationBadge Component

```typescript
// /src/components/product-portal/AuthenticationBadge.tsx

'use client';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface AuthenticationBadgeProps {
  isAuthentic: boolean;
}

export function AuthenticationBadge({ isAuthentic }: AuthenticationBadgeProps) {
  if (isAuthentic) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
        <CheckCircleIcon className="h-8 w-8 text-green-600" />
        <div>
          <p className="font-semibold text-green-900">Sản phẩm chính hãng OnlyPerf</p>
          <p className="text-sm text-green-700">Đã xác thực nguồn gốc xuất xứ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
      <XCircleIcon className="h-8 w-8 text-red-600" />
      <div>
        <p className="font-semibold text-red-900">Cảnh báo: Sản phẩm không xác thực</p>
        <p className="text-sm text-red-700">Vui lòng liên hệ hỗ trợ khách hàng</p>
      </div>
    </div>
  );
}
```

### 3. WarrantyStatusCard Component

```typescript
// /src/components/product-portal/WarrantyStatusCard.tsx

'use client';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';

interface WarrantyStatusCardProps {
  status: 'active' | 'expired' | 'void' | 'claimed';
  daysRemaining: number;
  startDate: Date;
  endDate: Date;
  isOwner: boolean;
  qrCode: string;
}

export function WarrantyStatusCard({
  status,
  daysRemaining,
  startDate,
  endDate,
  isOwner,
  qrCode
}: WarrantyStatusCardProps) {
  const statusConfig = {
    active: {
      color: 'green',
      label: 'Còn hiệu lực',
      icon: '✓'
    },
    expired: {
      color: 'red',
      label: 'Đã hết hạn',
      icon: '✗'
    },
    void: {
      color: 'gray',
      label: 'Đã hủy',
      icon: '—'
    },
    claimed: {
      color: 'blue',
      label: 'Đang xử lý bảo hành',
      icon: '⧗'
    }
  };

  const config = statusConfig[status];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <ShieldCheckIcon className={`h-8 w-8 text-${config.color}-600`} />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Thông tin bảo hành</h2>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Trạng thái:</span>
              <span className={`font-semibold text-${config.color}-600`}>
                {config.icon} {config.label}
              </span>
            </div>

            {isOwner && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày mua:</span>
                  <span className="font-medium">
                    {format(startDate, 'dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Hết hạn:</span>
                  <span className="font-medium">
                    {format(endDate, 'dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>

                {status === 'active' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Còn lại:</span>
                    <span className="font-semibold text-green-600">
                      {daysRemaining} ngày
                    </span>
                  </div>
                )}
              </>
            )}

            {!isOwner && (
              <p className="text-sm text-gray-500">
                Thời hạn bảo hành: 12 tháng kể từ ngày mua
              </p>
            )}
          </div>

          {isOwner && status === 'active' && (
            <Link
              href={`/warranty/claim?qrCode=${qrCode}`}
              className="mt-4 inline-block w-full rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              Gửi yêu cầu bảo hành
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 4. OwnershipCard Component

```typescript
// /src/components/product-portal/OwnershipCard.tsx

'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface OwnershipCardProps {
  purchaseDate: Date;
  orderNumber: string;
  pricePaid: number;
}

export function OwnershipCard({
  purchaseDate,
  orderNumber,
  pricePaid
}: OwnershipCardProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h3 className="text-lg font-semibold text-blue-900">Thông tin mua hàng của bạn</h3>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-blue-700">Mã đơn hàng:</span>
          <span className="font-medium text-blue-900">{orderNumber}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-blue-700">Ngày mua:</span>
          <span className="font-medium text-blue-900">
            {format(purchaseDate, 'dd/MM/yyyy', { locale: vi })}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-blue-700">Giá:</span>
          <span className="font-medium text-blue-900">
            {pricePaid.toLocaleString('vi-VN')} VND
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Database & API Foundation (Week 1)

**Tasks:**
- [ ] Create database schema (product_units, product_scans, warranty_claims)
- [ ] Generate and run migrations
- [ ] Implement webhook endpoint (`/api/webhooks/warehouse-sync`)
- [ ] Add webhook secret validation
- [ ] Test webhook with mock data

**Deliverables:**
- Database tables created
- API endpoint functional
- Unit tests passing

### Phase 2: Product Portal Page (Week 2)

**Tasks:**
- [ ] Create `/p/[qrCode]/page.tsx` route
- [ ] Implement QR code lookup logic
- [ ] Build ProductPortal component
- [ ] Add AuthenticationBadge component
- [ ] Reuse ProductImageCarousel from product page
- [ ] Create ProductSpecifications component
- [ ] Add scan tracking

**Deliverables:**
- Portal page accessible
- Public view working (no login)
- Scan events logged

### Phase 3: Customer Features (Week 3)

**Tasks:**
- [ ] Add customer auth check
- [ ] Implement ownership verification
- [ ] Build OwnershipCard component
- [ ] Build WarrantyStatusCard component
- [ ] Create `/my-products` dashboard
- [ ] Add login prompt for non-authenticated users

**Deliverables:**
- Owner-specific features working
- Dashboard showing all owned products
- Warranty calculations correct

### Phase 4: Warehouse Integration (Week 4)

**Tasks:**
- [ ] Add webhook action to warehouse app
- [ ] Update fulfillment flow to trigger webhook
- [ ] Add environment variables
- [ ] Test end-to-end flow (order → fulfillment → portal)
- [ ] Implement error handling and logging

**Deliverables:**
- Webhook firing on fulfillment
- Data syncing successfully
- Error handling in place

### Phase 5: Warranty Claims (Week 5)

**Tasks:**
- [ ] Create warranty claim form
- [ ] Implement `/api/warranty/claim` endpoint
- [ ] Add image upload functionality
- [ ] Build admin claim review interface (future)
- [ ] Add email notifications

**Deliverables:**
- Customers can submit claims
- Claims stored in database
- Admin notified of new claims

### Phase 6: Testing & Polish (Week 6)

**Tasks:**
- [ ] E2E testing (scan → portal → claim)
- [ ] Test all auth states (public, owner, non-owner)
- [ ] Test warranty calculations
- [ ] Test fraud detection (multiple scans)
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Documentation updates

**Deliverables:**
- All tests passing
- Mobile-friendly
- Production-ready

---

## Security Considerations

### 1. QR Code Validation

**Threats:**
- Brute force scanning (trying random QR codes)
- QR code enumeration attacks

**Mitigations:**
- Rate limiting: 10 scans per IP per minute
- Log all scan attempts
- Alert on suspicious patterns (rapid scanning)
- Validate QR format: `/^[A-Z]{4}\d{4}$/`

**Implementation:**
```typescript
// /src/lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  prefix: 'qr_scan'
});

export async function checkRateLimit(identifier: string) {
  const { success, reset } = await ratelimit.limit(identifier);
  return { allowed: success, reset };
}
```

### 2. Webhook Security

**Threats:**
- Unauthorized webhook requests
- Replay attacks
- Data tampering

**Mitigations:**
- Shared secret validation (`X-Webhook-Secret`)
- HTTPS only
- Request signature (future: HMAC)
- Idempotency (duplicate QR code handling)

**Implementation:**
```typescript
// Validate webhook secret
const secret = request.headers.get('X-Webhook-Secret');
if (secret !== process.env.WAREHOUSE_WEBHOOK_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// Validate payload structure with Zod
const result = webhookSchema.safeParse(body);
if (!result.success) {
  return Response.json({ error: 'Invalid payload' }, { status: 400 });
}
```

### 3. Customer Data Privacy

**Threats:**
- Unauthorized access to purchase history
- Exposure of customer personal info

**Mitigations:**
- Only show ownership to authenticated owner
- Never expose customer email/phone on portal
- Require login for sensitive actions (warranty claims)
- Audit log all data access

**Implementation:**
```typescript
// Check ownership before showing sensitive data
const session = await readCustomerSessionFromCookies();
const isOwner = session?.customerId === unit.customerId;

if (!isOwner) {
  // Hide: purchaseDate, orderNumber, pricePaid
  // Show: generic warranty info only
}
```

### 4. Fraud Detection

**Threats:**
- Counterfeit QR codes
- QR code cloning
- Multiple claims on same product

**Mitigations:**
- Track first scan location
- Alert if scanned from multiple countries
- Flag products with multiple warranty claims
- Verify purchase via Shopify order API

**Implementation:**
```typescript
// Flag suspicious scan patterns
const scans = await db.query.productScans.findMany({
  where: eq(productScans.qrCode, qrCode),
  limit: 10
});

const uniqueCountries = new Set(scans.map(s => s.location?.country));
if (uniqueCountries.size > 2) {
  // Alert: QR code scanned from multiple countries
  await sendSecurityAlert('qr_multi_country', { qrCode, countries: Array.from(uniqueCountries) });
}
```

---

## Testing Guide

### 1. Unit Tests

**Database Schema:**
```typescript
// /src/db/schema/__tests__/product-units.test.ts

import { describe, it, expect } from 'vitest';
import { productUnits } from '../product-units';
import { db } from '@/db';

describe('product_units schema', () => {
  it('should create product unit with valid data', async () => {
    const unit = await db.insert(productUnits).values({
      qrCode: 'ABCD1234',
      shopifyProductId: 'gid://shopify/Product/123',
      shopifyVariantId: 'gid://shopify/ProductVariant/456',
      shopifyOrderId: 'gid://shopify/Order/789',
      customerId: 'gid://shopify/Customer/101',
      productDetails: { /* ... */ },
      purchaseDate: new Date(),
      warrantyEndDate: new Date(),
      warrantyStatus: 'active'
    }).returning();

    expect(unit).toBeDefined();
    expect(unit.qrCode).toBe('ABCD1234');
  });

  it('should reject duplicate QR codes', async () => {
    await expect(async () => {
      await db.insert(productUnits).values({
        qrCode: 'ABCD1234', // Already exists
        // ... other fields
      });
    }).rejects.toThrow('duplicate key');
  });
});
```

**API Endpoints:**
```typescript
// /src/app/api/webhooks/warehouse-sync/__tests__/route.test.ts

import { describe, it, expect } from 'vitest';
import { POST } from '../route';

describe('POST /api/webhooks/warehouse-sync', () => {
  it('should reject requests without secret', async () => {
    const request = new Request('http://localhost/api/webhooks/warehouse-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'product.sold', data: {} })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should accept valid webhook payload', async () => {
    const request = new Request('http://localhost/api/webhooks/warehouse-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WAREHOUSE_WEBHOOK_SECRET!
      },
      body: JSON.stringify({
        event: 'product.sold',
        data: {
          qrCode: 'TEST1234',
          shopifyOrderId: 'gid://shopify/Order/123',
          // ... valid payload
        }
      })
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
```

### 2. Integration Tests

**Warehouse → OnlyPerf Flow:**
```bash
# 1. Start OnlyPerf dev server
pnpm dev

# 2. Use ngrok to expose
ngrok http 3000

# 3. Update warehouse .env with ngrok URL

# 4. In warehouse app, fulfill an order
# - Go to /orders
# - Select an order
# - Scan items
# - Complete fulfillment

# 5. Check OnlyPerf logs
# Should see:
# [POST] /api/webhooks/warehouse-sync
# Webhook received: product.sold
# Created product_units record: ABCD1234

# 6. Visit portal page
open https://onlyperf.com/p/ABCD1234

# 7. Verify data displayed correctly
```

### 3. E2E Tests (Playwright)

```typescript
// /tests/e2e/product-portal.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Product Portal', () => {
  test('should display product portal for valid QR code', async ({ page }) => {
    await page.goto('/p/ABCD1234');

    // Check authentication badge
    await expect(page.getByText('Sản phẩm chính hãng OnlyPerf')).toBeVisible();

    // Check product name
    await expect(page.getByRole('heading', { name: /Wilson Pro Staff 97/i })).toBeVisible();

    // Check warranty card
    await expect(page.getByText('Thông tin bảo hành')).toBeVisible();
  });

  test('should show 404 for invalid QR code', async ({ page }) => {
    await page.goto('/p/INVALID');
    await expect(page.getByText(/không tìm thấy/i)).toBeVisible();
  });

  test('should show ownership card when logged in as owner', async ({ page, context }) => {
    // Set customer session cookie
    await context.addCookies([
      {
        name: 'shopify_customer_session',
        value: 'valid-session-token',
        domain: 'localhost',
        path: '/'
      }
    ]);

    await page.goto('/p/ABCD1234');

    // Check ownership card visible
    await expect(page.getByText('Thông tin mua hàng của bạn')).toBeVisible();
    await expect(page.getByText('Mã đơn hàng:')).toBeVisible();

    // Check warranty claim button
    await expect(page.getByRole('link', { name: /Gửi yêu cầu bảo hành/i })).toBeVisible();
  });

  test('should prompt login for non-authenticated users', async ({ page }) => {
    await page.goto('/p/ABCD1234');

    await expect(page.getByText(/Đăng nhập để xem thông tin bảo hành chi tiết/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Đăng nhập/i })).toBeVisible();
  });
});
```

### 4. Manual Testing Checklist

**Portal Page:**
- [ ] Valid QR code displays product
- [ ] Invalid QR code shows 404
- [ ] Authentication badge shows green checkmark
- [ ] Product images load correctly
- [ ] Warranty status displays correctly
- [ ] Ownership card shows for owner
- [ ] Login prompt shows for non-authenticated
- [ ] Scan count increments on each visit

**Warranty Calculations:**
- [ ] Active warranty shows days remaining
- [ ] Expired warranty shows correct status
- [ ] Warranty end date calculated correctly (purchaseDate + 12 months)

**Auth States:**
- [ ] Public user sees limited info
- [ ] Logged-in owner sees full info
- [ ] Logged-in non-owner sees limited info

**Mobile:**
- [ ] Portal page responsive on mobile
- [ ] Images scale correctly
- [ ] Cards stack properly
- [ ] Buttons accessible on small screens

---

## Deployment

### Environment Variables

**OnlyPerf `.env`:**
```bash
# Database
DATABASE_URL=postgresql://...

# Shopify
SHOPIFY_STORE_DOMAIN=onlyperf.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=...
SHOPIFY_ADMIN_ACCESS_TOKEN=...
SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID=...
SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET=...

# Warehouse Integration
WAREHOUSE_WEBHOOK_SECRET=<generate-strong-secret>

# Site
NEXT_PUBLIC_SITE_URL=https://onlyperf.com
```

**Warehouse `.env`:**
```bash
# OnlyPerf Integration
ONLYPERF_WEBHOOK_URL=https://onlyperf.com/api/webhooks/warehouse-sync
ONLYPERF_WEBHOOK_SECRET=<same-as-above>
```

### Deployment Steps

1. **Deploy Database Changes:**
```bash
pnpm db:migrate
```

2. **Deploy OnlyPerf:**
```bash
pnpm build
pnpm start
```

3. **Deploy Warehouse (with webhook integration):**
```bash
# In warehouse app
pnpm build
pnpm start
```

4. **Verify Integration:**
```bash
# Test webhook connectivity
curl -X POST https://onlyperf.com/api/webhooks/warehouse-sync \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: ${WAREHOUSE_WEBHOOK_SECRET}" \
  -d '{"event":"product.sold","data":{...}}'
```

---

## Future Enhancements

### Phase 2 Features

1. **Product Registration**
   - Allow customers to register products bought elsewhere
   - Verify proof of purchase (receipt upload)
   - Manual warranty activation

2. **Advanced Warranty Claims**
   - In-app photo upload
   - Chat with support
   - Claim status tracking
   - Automatic refund/replacement

3. **Product Recalls**
   - Email notifications to affected customers
   - Recall instructions on portal
   - Return shipping labels

4. **Analytics Dashboard (Admin)**
   - Most scanned products
   - Geographic scan distribution
   - Warranty claim trends
   - Fraud detection alerts

5. **Customer Loyalty**
   - Points for product registration
   - Rewards for referrals
   - Early access to new products

---

## Appendix

### A. QR Code Format Reference

**Warehouse QR Generation:**
- File: `/warehouse-management/src/lib/qr-generator.ts`
- Format: `https://onlyperf.com/p/{CODE}`
- Code pattern: `/^[A-Z]{4}\d{4}$/`
- Total combinations: 331,776,000

### B. Database Relationships

```
productUnits (1) ─┬─→ (N) productScans
                  └─→ (N) warrantyClaims

Shopify Order (1) ──→ (N) productUnits
Shopify Customer (1) ──→ (N) productUnits
```

### C. Useful Commands

```bash
# Database
pnpm db:generate          # Generate migration
pnpm db:migrate           # Apply migration
pnpm db:push              # Push schema (dev only)
pnpm db:studio            # Open Drizzle Studio

# Development
pnpm dev                  # Start dev server
pnpm build                # Production build
pnpm lint                 # Run Biome checks

# Testing
pnpm test                 # Run unit tests
pnpm test:e2e             # Run E2E tests
```

### D. Related Documentation

- [Shopify Customer Account API](/docs/customer-account/overview.md)
- [CLAUDE.md - Development Guide](/CLAUDE.md)
- [Warehouse QR System](/docs/warehouse/qr-system.md) (TODO)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Author:** Development Team
**Status:** Ready for Implementation
