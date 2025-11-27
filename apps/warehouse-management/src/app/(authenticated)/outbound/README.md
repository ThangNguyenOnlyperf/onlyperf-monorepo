# Outbound Sale Process (Xuất kho - Bán hàng)

## Overview

The outbound feature is a multi-device synchronized point-of-sale system that allows warehouse staff to:
- Scan products via QR codes
- Build shopping carts collaboratively across multiple devices
- Collect customer information (B2C retail or B2B business customers)
- Process orders with automatic inventory status updates
- Generate Excel receipts

## Process Flow

### 1️⃣ Session Initialization
When staff opens `/outbound`:
- Creates unique device ID for tracking
- Loads or creates user scanning session (stored in `scanning_sessions` table)
- Starts 2-second polling to sync cart across all devices
- Loads existing customers and providers for quick lookup

### 2️⃣ QR Code Scanning
**Component:** `~/components/outbound/OutboundScanner.tsx` → `~/components/scanner/QRScanner.tsx`

**Flow:**
1. Staff clicks "Quét QR" → camera opens
2. Scan product QR code
3. Server validates (`validateAndFetchItem` in `outboundActions.ts`):
   - Checks product exists
   - Verifies status is `'received'` (not pending/sold/shipped)
4. Price input dialog opens → user enters selling price
5. Item added to cart

**QR Code Formats Supported:**
- Legacy: `PB_XXXXX`
- URL: `https://onlyperf.com/p/PBXXXXX`
- Modern: `ABCD1234` (4 letters + 4 digits)

### 3️⃣ Cart Management
**Component:** `~/components/outbound/CartItemsList.tsx`

- Items grouped by brand-model
- Shows individual QR codes per item
- Displays prices and totals
- **Duplicate prevention:** Each QR code can only be scanned once per session
- **Multi-device sync:** Cart updates appear on all devices in ~2 seconds

**Remove items:** Individual removal or "clear all" button

### 4️⃣ Customer Information
**Component:** `~/components/outbound/CustomerForm.tsx`

**Two customer types:**

**B2C (Khách lẻ) - Retail:**
- Search by phone → auto-fills existing customer data
- Manual entry for new customers (name, phone, address)

**B2B (Doanh nghiệp) - Business:**
- Select from providers dropdown
- Auto-fills: name, phone, address, tax code from provider record
- Can create new provider on-the-fly

**Payment methods:** Cash or Bank Transfer

### 5️⃣ Order Processing
**Action:** `processOrder()` in `~/actions/outboundActions.ts`

**Database transaction (atomic):**
1. **Re-verify availability** → prevents race conditions
2. **Upsert customer** → search by phone, update or create
3. **Create order** → generates order number: `ORD-YYYYMMDD-XXXX`
4. **Create order items** → one record per scanned product
5. **Update shipment status** → `'received'` → `'sold'` ⚠️ **Critical step**
6. **Generate Excel export** → downloadable receipt
7. **Queue Shopify sync** → update external inventory

**Post-transaction:**
- Clear cart and session
- Redirect to order detail page: `/orders/{orderId}`

## Key Files

### Pages
- `src/app/outbound/page.tsx` - Entry point

### Components
- `src/components/outbound/OutboundClientUI.tsx` - Main orchestrator (426 lines)
- `src/components/outbound/OutboundScanner.tsx` - Scanner wrapper with sheet UI
- `src/components/outbound/CartItemsList.tsx` - Cart display with grouping
- `src/components/outbound/CustomerForm.tsx` - Customer info collection (230 lines)
- `src/components/outbound/OrderSummary.tsx` - Order review and confirmation
- `src/components/outbound/PriceInputDialog.tsx` - Price entry modal
- `src/components/scanner/QRScanner.tsx` - Camera QR scanner (226 lines)
- `src/components/outbound/types.ts` - TypeScript interfaces

### Server Actions
- `src/actions/outboundActions.ts` - Order processing & validation (268 lines)
- `src/actions/outboundSessionActions.ts` - Multi-device sync (401 lines)

### Supporting
- `src/lib/excel-export/orderExport.ts` - Excel receipt generation

## Database Tables

| Table | Purpose | Status Field |
|-------|---------|--------------|
| `shipmentItems` | Inventory tracking | `pending` → `received` → `sold` → `shipped` |
| `products` | Product catalog | - |
| `customers` | Buyer records (B2C) | - |
| `providers` | Business customers (B2B) | - |
| `orders` | Order headers | `paymentStatus`, `deliveryStatus` |
| `orderItems` | Order line items | - |
| `scanning_sessions` | Multi-device sync | - |

**Schema location:** `src/server/db/schema.ts`

## Multi-Device Sync

**How it works:**
- Each user has ONE session (unique constraint on `userId`)
- Session stores cart items and customer info as JSON
- Every 2 seconds, devices poll for updates
- When `lastUpdated` changes → merges remote items with local cart
- Devices track activity via `lastPing` timestamp

**Benefits:**
- Multiple staff can scan on different devices simultaneously
- Cart syncs automatically (phone + tablet workflow)
- No WebSocket complexity
- Works offline (local state buffers until online)

**Implementation:** `src/actions/outboundSessionActions.ts`
- `getOrCreateUserSession()` - Load or create session
- `updateSessionCart()` - Save cart to database
- `updateCustomerInSession()` - Save customer info
- `syncSessionData()` - Merge remote changes
- `clearUserSession()` - Clean up after order

## Inventory Status Flow

```
┌─────────┐      ┌──────────┐      ┌──────┐      ┌─────────┐
│ pending │  →   │ received │  →   │ sold │  →   │ shipped │
└─────────┘      └──────────┘      └──────┘      └─────────┘
                      ↑                 ↑
                   (Can scan)     (Order created)
```

**Key rule:** Only items with status `'received'` can be scanned and sold.

**Validation points:**
1. **Scan time:** `validateAndFetchItem()` checks status
2. **Order time:** `processOrder()` re-checks status in transaction (prevents race conditions)

## Error Handling

- **Duplicate scan:** Shows toast "Sản phẩm đã được quét"
- **Invalid QR:** Shows "Mã QR không hợp lệ hoặc sản phẩm không tồn tại"
- **Already sold:** Shows "Sản phẩm đã được bán hoặc chưa nhập kho"
- **Race condition:** Transaction fails if item sold by another device
- **Validation errors:** Toast with specific error messages

## Future Enhancements

- Voucher/discount system (UI placeholder exists)
- Payment code auto-generation (schema ready: `orders.paymentCode`)
- Delivery tracking integration (linked to `deliveries` table)
- Batch QR generation for products

---

**Last updated:** 2025-11-04
