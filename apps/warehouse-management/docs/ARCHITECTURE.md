# Warehouse Management System - Architecture Overview

## System Overview

This is a comprehensive warehouse management system built with Next.js 15, featuring QR code-based inventory tracking, multi-channel order management, and Shopify integration for online sales.

## Core Business Flow

### 1. Initial Setup Phase
```
Setup → Storage Configuration → Product Creation
```

### 2. Inbound Flow (Receiving Goods)
```
Create Shipment → Generate QR Codes (PDF) → Scan Items → Store in Warehouse
```

### 3. Outbound Flow - In-Store Sales
```
Scan Items → Add to Cart → Create Order → Process Payment → Delivery
```

### 4. Outbound Flow - Online Sales (Shopify)
```
Shopify Order Created → Webhook Received → Order Created (Pending)
→ Staff Scans Items → Fulfillment Complete → Delivery
```

## System Architecture

### Application Routes

```
/                              # Home page with navigation
├── /setup                     # Initial system setup
├── /signin, /signup           # Authentication
├── /dashboard                 # User dashboard
│
├── /storages                  # Warehouse location management
│   ├── Create storage locations
│   ├── Set capacity limits
│   └── Track utilization
│
├── /products                  # Product catalog management
│   ├── Create products with attributes
│   ├── Sync to Shopify (optional)
│   ├── Track stock levels
│   └── View product history
│
├── /shipments                 # Inbound shipment management
│   ├── /new                   # Create new shipment
│   ├── /[id]                  # Shipment details
│   ├── /[id]/pdf              # Generate QR code labels (PDF)
│   └── /[id]/scan             # Inbound scanning interface
│
├── /outbound                  # Outbound/sales interface
│   ├── Scan items for sale
│   ├── Shopping cart
│   ├── Customer selection
│   └── Payment processing
│
├── /fulfillment               # Shopify order fulfillment
│   ├── View pending online orders
│   ├── Scan items to fulfill
│   └── Complete fulfillment
│
├── /orders                    # Order management
│   ├── View all orders
│   ├── Filter by source (in-store/Shopify)
│   └── Track payment status
│
├── /deliveries                # Delivery tracking
│   ├── Assign shippers
│   ├── Track status
│   └── Handle failed deliveries
│
├── /customers                 # Customer management
├── /reports                   # Analytics and reports
└── /admin/users               # User management
```

### Database Schema Overview

#### Core Inventory Tables

**storages**
- Warehouse locations with capacity tracking
- Fields: name, location, capacity, usedCapacity, priority

**products**
- Product catalog with attributes
- Fields: name, brand, model, color, size, weight, material, price, qrCode
- Relations: linked to brands, colors, and shopifyProducts

**shipmentItems**
- Individual items with unique QR codes
- Status flow: `pending` → `received` → `allocated`/`sold` → `shipped`
- Each item tracked individually through the entire lifecycle

#### Shipment Management

**shipments**
- Inbound shipment receipts from suppliers
- Fields: receiptNumber, receiptDate, supplierName, status, notes
- Status: `pending` → `received`

**shipmentItems**
- Links shipments to products with unique QR codes
- Tracks storage location and scanning timestamps
- One shipment item = one physical item with one QR code

#### Order Management

**orders**
- Multi-source orders (in-store, Shopify, manual)
- Fields: orderNumber, source, totalAmount, paymentStatus, deliveryStatus, fulfillmentStatus
- Sources: `in-store`, `shopify`, `manual`
- Payment status: `Unpaid`, `Paid`, `Cancelled`, `Refunded`
- Fulfillment status: `pending`, `in_progress`, `fulfilled`

**orderItems**
- Links orders to specific shipment items
- For Shopify orders: `shipmentItemId` is NULL until scanned during fulfillment
- For in-store orders: `shipmentItemId` is set immediately

#### Delivery Tracking

**deliveries**
- Delivery tracking for orders
- Status: `waiting_for_delivery` → `delivered`/`failed`/`cancelled`
- Fields: shipperName, trackingNumber, deliveredAt, failureReason

**deliveryResolutions**
- Handle failed deliveries
- Resolution types: `re_import`, `return_to_supplier`, `retry_delivery`

#### Shopify Integration

**shopifyProducts**
- Links local products to Shopify
- Stores: shopifyProductId, shopifyVariantId, shopifyInventoryItemId
- Tracks sync status and errors

### QR Code System

#### Format
- **Product QR Code**: `ABCD1234` (8 characters)
  - 4 uppercase letters (A-Z, excluding O and I to avoid confusion)
  - 4 digits (0-9)
  - Total combinations: 331,776,000 unique codes

#### QR Code URL Format
```
https://onlyperf.com/p/ABCD1234
```
- Configured via `NEXT_PUBLIC_BASE_URL` environment variable
- Short codes stored in `qrCode` field

#### QR Code Generation Flow
1. Create shipment with products and quantities
2. Generate QR labels: `/shipments/[id]/pdf`
3. System generates unique codes for each item
4. PDF created with printable QR code labels
5. Print and affix labels to physical items

#### QR Code Scanning Points

**Inbound Scanning** (`/shipments/[id]/scan`)
- Scan items to receive into warehouse
- Assign storage location
- Update item status: `pending` → `received`

**Outbound Scanning - In-Store** (`/outbound`)
- Scan items to add to cart
- Create order and mark items as sold
- Update item status: `received` → `sold`

**Fulfillment Scanning** (`/fulfillment`)
- Scan items to fulfill Shopify orders
- Link shipment items to order items
- Update item status: `received` → `allocated` → `sold`

## Data Flow Diagrams

### Inbound Flow (Receiving Inventory)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREATE SHIPMENT                                              │
│    /shipments/new                                               │
│    ↓                                                            │
│    - Select supplier (provider)                                 │
│    - Add products and quantities                                │
│    - Set receipt date                                           │
│    - Create shipment (status: pending)                          │
│    - System creates shipmentItems (status: pending)             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. GENERATE QR CODES                                            │
│    /shipments/[id]/pdf                                          │
│    ↓                                                            │
│    - Generate unique QR codes for each item                     │
│    - Create PDF with printable labels                           │
│    - Each label shows: Product info + QR code                   │
│    - Print and affix to physical items                          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. INBOUND SCANNING                                             │
│    /shipments/[id]/scan                                         │
│    ↓                                                            │
│    - Scan QR code on physical item                              │
│    - Assign storage location                                    │
│    - Update item: status → received, scannedAt → now            │
│    - Increment storage usedCapacity                             │
│    - Sync inventory to Shopify (if enabled)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Outbound Flow - In-Store Sales

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCAN ITEMS FOR SALE                                          │
│    /outbound                                                    │
│    ↓                                                            │
│    - Scan item QR codes                                         │
│    - Add to shopping cart                                       │
│    - Display product info and price                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PROCESS ORDER                                                │
│    ↓                                                            │
│    - Select/create customer                                     │
│    - Choose payment method (cash/bank_transfer)                 │
│    - Generate payment code (if bank transfer)                   │
│    - Create order (source: in-store)                            │
│    - Create orderItems (linked to shipmentItems)                │
│    - Update shipmentItems: status → sold                        │
│    - Decrement storage usedCapacity                             │
│    - Sync inventory to Shopify (if enabled)                     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. DELIVERY                                                     │
│    /deliveries                                                  │
│    ↓                                                            │
│    - Create delivery record                                     │
│    - Assign shipper                                             │
│    - Track delivery status                                      │
│    - Handle delivery confirmation or failures                   │
└─────────────────────────────────────────────────────────────────┘
```

### Shopify Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PRODUCT SYNC (Optional)                                         │
│ /products                                                       │
│ ↓                                                               │
│ - Create product in warehouse system                            │
│ - Click "Sync to Shopify" button                                │
│ - System creates product in Shopify                             │
│ - Links via shopifyProducts table                               │
│ - Inventory synced automatically on stock changes               │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ ONLINE ORDER WEBHOOK                                            │
│ POST /api/webhooks/shopify/orders                               │
│ ↓                                                               │
│ - Customer completes payment on Shopify store                   │
│ - Shopify sends "order.paid" webhook                            │
│ - Webhook handler verifies HMAC signature                       │
│ - Creates customer (if not exists)                              │
│ - Creates order (source: shopify, fulfillmentStatus: pending)   │
│ - Creates orderItems WITHOUT shipmentItemId (pending scan)      │
│ - Marks shipmentItems as "allocated" (reserved for this order)  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ MANUAL FULFILLMENT                                              │
│ /fulfillment                                                    │
│ ↓                                                               │
│ - Staff opens fulfillment page                                  │
│ - Views pending Shopify orders                                  │
│ - Selects order to fulfill                                      │
│ - Scans QR codes of physical items                              │
│ - System links shipmentItems to orderItems                      │
│ - Updates shipmentItems: status → sold                          │
│ - Updates orderItems: fulfillmentStatus → fulfilled             │
│ - Updates order: fulfillmentStatus → fulfilled                  │
│ - Decrement storage usedCapacity                                │
│ - Sync inventory to Shopify                                     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ DELIVERY                                                        │
│ Same as in-store delivery flow                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Item Status Lifecycle

### Status Values
- `pending` - Shipment created but items not yet received
- `received` - Scanned during inbound, stored in warehouse
- `allocated` - Reserved for Shopify order (awaiting fulfillment scan)
- `sold` - Sold to customer (scanned at POS or fulfillment)
- `shipped` - Delivered to customer

### Status Transitions

**In-Store Sales Flow:**
```
pending → received → sold → shipped
```

**Shopify Online Sales Flow:**
```
pending → received → allocated → sold → shipped
         (inbound)  (webhook)   (fulfillment)
```

## Key Features

### 1. Multi-Channel Order Management
- **In-Store Sales**: Direct QR scanning at point of sale
- **Shopify Orders**: Webhook integration with manual fulfillment
- **Manual Orders**: For special cases

### 2. QR Code Tracking
- Unique QR code for each physical item
- Track item from receipt to delivery
- Fast scanning with mobile devices
- Printable labels with product information

### 3. Storage Management
- Multiple warehouse locations
- Capacity tracking and alerts
- Priority-based storage assignment
- Utilization monitoring

### 4. Shopify Integration (Optional)
- Product sync from warehouse to Shopify
- Inventory level sync (real-time)
- Order webhook handling
- Manual fulfillment workflow

### 5. Delivery Management
- Shipper assignment
- Tracking numbers
- Status tracking
- Failed delivery handling with resolutions

### 6. Search Functionality (Typesense)
- Fast product search
- Vietnamese language optimization
- Global search (Cmd+K)
- Context-specific search on each page

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Components**: Shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Server Components + URL state (nuqs)

### Backend
- **Runtime**: Node.js with Next.js API routes
- **Database**: PostgreSQL
- **ORM**: DrizzleORM
- **Authentication**: Better Auth (RBAC)
- **Search**: Typesense (optional)

### QR Code
- **Generation**: qrcode library
- **Scanning**: qr-scanner library
- **PDF Generation**: Client-side PDF with QR codes

### Integrations
- **Shopify**: Admin API + Webhooks
- **Payment**: Sepay (Vietnamese payment gateway)

## Environment Configuration

### Core Settings
```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # For QR code URLs
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...
```

### Shopify Integration (Optional)
```env
SHOPIFY_ENABLED=true  # Set to "false" to disable
SHOPIFY_STORE_DOMAIN=store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=...
SHOPIFY_API_VERSION=2025-04
SHOPIFY_LOCATION_ID=...
SHOPIFY_WEBHOOK_SECRET=...
```

### Typesense Search (Optional)
```env
TYPESENSE_HOST=search.yourdomain.com
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=...
```

## Security

### Authentication
- Better Auth with email/password
- Session-based authentication
- RBAC: Admin, Warehouse Staff, Accountant

### Webhook Security
- HMAC signature verification (Shopify webhooks)
- Request validation with Zod schemas
- Environment-based secret configuration

### Data Validation
- Zod schemas for all inputs
- Server-side validation
- Type-safe database queries

## Performance Optimizations

### Database
- Indexed columns for fast queries
- Pagination support
- Efficient joins with DrizzleORM

### Search
- Typesense for instant search
- Vietnamese diacritics support
- Background sync from PostgreSQL

### Caching
- React Server Components (automatic caching)
- Optimistic UI updates
- Efficient re-validation

## Development Workflow

### Database Migrations
```bash
# Update schema in src/server/db/schema.ts
# Drizzle handles migrations automatically
pnpm db:push           # Apply changes to database
pnpm db:generate       # Generate migration files (optional)
pnpm db:studio         # Open visual database manager
```

### Search Indexing (if using Typesense)
```bash
pnpm tsx scripts/init-typesense.ts    # Initialize collections
pnpm tsx scripts/sync-typesense.ts    # Sync data from PostgreSQL
```

### Code Quality
```bash
pnpm lint              # Check for issues
pnpm lint --fix        # Auto-fix issues
pnpm typecheck         # TypeScript type checking
pnpm build             # Production build
```

## Monitoring and Analytics

### Reports
- Product sales reports
- Inventory levels
- Order analytics
- Delivery performance

### Audit Trail
- Delivery history tracking
- Order status changes
- User activity logs

## Future Enhancements

### Potential Features
- Barcode support (in addition to QR codes)
- Mobile app for warehouse staff
- Advanced analytics dashboard
- Multi-warehouse support
- Return/refund management
- Supplier performance tracking
- Automated reorder points
- Integration with shipping carriers

## Support and Documentation

### Internal Documentation
- This file: `ARCHITECTURE.md` - System overview
- `README.md` - Setup and deployment guide
- `CLAUDE.md` - AI development instructions
- Route-specific READMEs in each app directory

### External Resources
- Next.js 15: https://nextjs.org
- DrizzleORM: https://orm.drizzle.team
- Shadcn/ui: https://ui.shadcn.com
- Shopify API: https://shopify.dev
