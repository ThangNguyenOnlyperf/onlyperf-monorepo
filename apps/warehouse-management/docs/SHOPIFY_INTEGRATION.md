# Shopify Order Integration - Implementation Guide

## Overview

This integration allows online orders from your **onlyperf** e-commerce site to automatically sync to the **warehouse management system** when customers pay via Sepay.

## Architecture Flow

```
Customer orders on onlyperf.com
         ↓
Pays via Sepay QR code
         ↓
Sepay webhook → onlyperf
         ↓
Creates Shopify order via Admin API
         ↓
Sends webhook → Warehouse
         ↓
Warehouse creates order WITHOUT allocating specific items
         ↓
Staff opens /fulfillment page → selects order
         ↓
Staff scans ANY matching QR paddles
         ↓
System validates product matches & marks as 'sold'
         ↓
Order complete → Staff ships product
```

---

## What Was Implemented

### 1. **Database Schema Changes** (Warehouse)

**File:** `src/server/db/schema.ts`

Added 3 new fields to `orders` table:
- `source` - Tracks order origin: 'in-store', 'shopify', or 'manual'
- `shopifyOrderId` - Shopify order GID (e.g., gid://shopify/Order/123)
- `shopifyOrderNumber` - Human-readable Shopify order number (e.g., #1001)

**Run manually:**
```bash
cd warehouse-management
pnpm db:push
```

### 2. **Payment Status Fix** (Warehouse)

**File:** `src/actions/outboundActions.ts:190`

**Before:**
```typescript
paymentStatus: 'confirmed', // ❌ Invalid status
```

**After:**
```typescript
paymentStatus: customerInfo.paymentMethod === 'cash' ? 'Paid' : 'Unpaid',
source: 'in-store',
```

Now properly uses valid statuses: 'Paid' (cash) or 'Unpaid' (bank transfer).

### 3. **HMAC Security** (Warehouse)

**File:** `src/lib/security/hmac.ts` (NEW)

Implements webhook security:
- HMAC SHA256 signature verification
- Timestamp validation (prevents replay attacks)
- Timing-safe comparison (prevents timing attacks)

### 4. **Webhook Handler** (Warehouse)

**File:** `src/app/api/webhooks/shopify/orders/route.ts` (NEW)

**Flow:**
1. Verify HMAC signature
2. Parse order payload
3. Map SKUs to warehouse products
4. Check inventory availability (status='received')
5. Upsert customer (email or phone)
6. Create order with `fulfillmentStatus='pending'`
7. Create order_items WITHOUT shipmentItemId (set to NULL)
8. Do NOT mark any shipment items (they stay 'received')
9. Staff manually fulfills order via `/fulfillment` page

**Error Handling:**
- Missing SKU → 400 error + log
- Insufficient inventory → 400 error + log
- Database errors → 500 error + log

### 5. **Webhook Notification** (OnlyPerf)

**Files modified:**
- `src/actions/sepayActions.ts:217-248` - Uncommented and enhanced notification
- `src/actions/warehouseActions.ts:6-40` - Updated payload type

**Payload sent:**
```typescript
{
  event: "order.paid",
  provider: "sepay",
  shopifyOrderId: "gid://shopify/Order/123",
  shopifyOrderNumber: "#1001",
  paymentCode: "ABC123",
  amount: 350000,
  currency: "VND",
  paidAt: "2025-01-04T10:30:00Z",
  lineItems: [
    {
      sku: "ABCD1234",  // Warehouse product ID
      variantId: "gid://shopify/ProductVariant/456",
      quantity: 2,
      price: 175000,
      title: "Product Name",
      variantTitle: "Size M / Black"
    }
  ],
  customer: {
    email: "customer@example.com",
    name: "John Doe",
    phone: "+84912345678"
  },
  shippingAddress: {
    name: "John Doe",
    address1: "123 Main St",
    city: "Ho Chi Minh",
    province: "Ho Chi Minh",
    zip: "70000",
    country: "Vietnam",
    phone: "+84912345678"
  }
}
```

### 6. **TypeScript Types** (Warehouse)

**File:** `src/actions/orderActions.ts:17-50`

Updated `OrderDetail` interface:
```typescript
export interface OrderDetail {
  // ... existing fields ...
  source: string;
  shopifyOrderId: string | null;
  shopifyOrderNumber: string | null;
  // ... rest of fields ...
}
```

---

## Environment Variables

### Warehouse (.env)
```bash
# Shopify webhook secret (shared with onlyperf)
SHOPIFY_WEBHOOK_SECRET=your-random-32-char-secret-here

# Existing vars (keep these)
DATABASE_URL=postgresql://...
SHOPIFY_ADMIN_API_ACCESS_TOKEN=...
SHOPIFY_STORE_DOMAIN=...
```

### OnlyPerf (.env)
```bash
# Warehouse webhook URL (ngrok for local testing, production domain for live)
WAREHOUSE_WEBHOOK_URL=https://your-warehouse-domain.com/api/webhooks/shopify/orders

# Shared secret for HMAC verification
WAREHOUSE_WEBHOOK_SECRET=your-random-32-char-secret-here

# Existing vars (keep these)
SHOPIFY_STOREFRONT_API_ACCESS_TOKEN=...
SHOPIFY_ADMIN_API_ACCESS_TOKEN=...
DATABASE_URL=postgresql://...
```

**Generate secret:**
```bash
openssl rand -hex 32
```

---

## Testing Plan

### Quick Testing (Recommended)

**Test webhook directly without full checkout flow:**

1. **Start warehouse dev server:**
```bash
cd warehouse-management
pnpm dev
```

2. **Run test script:**
```bash
# Use default test payload
pnpm tsx tests/webhook/test-webhook.ts

# Or use custom payload
pnpm tsx tests/webhook/test-webhook.ts tests/webhook/payloads/multi-item.json
```

3. **Available test payloads:**
   - `tests/webhook/test-order-payload.json` - Basic single item order
   - `tests/webhook/payloads/missing-sku.json` - Tests error handling for non-existent SKU
   - `tests/webhook/payloads/multi-item.json` - Multiple items with different SKUs

4. **Create your own payload:**
   ```bash
   cp tests/webhook/test-order-payload.json my-test.json
   # Edit my-test.json with your data
   pnpm tsx tests/webhook/test-webhook.ts my-test.json
   ```

5. **Get real SKUs from your warehouse:**
   ```sql
   -- Find products with available inventory
   SELECT
     p.id as sku,
     p.name,
     p.brand,
     COUNT(si.id) as available_items
   FROM products p
   JOIN shipment_items si ON si.product_id = p.id
   WHERE si.status = 'received'
   GROUP BY p.id, p.name, p.brand
   HAVING COUNT(si.id) > 0
   ORDER BY available_items DESC
   LIMIT 10;
   ```

   Then update your test payload's `lineItems[].sku` with real product IDs.

**Expected output:**
```
🧪 Warehouse Webhook Tester
═══════════════════════════════════════════════

📦 Loaded payload:
   Event: order.paid
   Shopify Order: #TEST-1001 (gid://shopify/Order/9999999999)
   Items: 2
   Amount: 500,000 VND

🔐 Security:
   Signature: f3a7b2c8d4e5...
   Timestamp: 1704358200

🌐 Sending POST to: http://localhost:3000/api/webhooks/shopify/orders

⏱️  Response time: 245ms

✅ SUCCESS!
───────────────────────────────────────────────
Status: 200 OK

Response:
{
  "success": true,
  "warehouseOrderId": "abc123",
  "warehouseOrderNumber": "ORD-20250104-5678",
  "shopifyOrderId": "gid://shopify/Order/9999999999",
  "shopifyOrderNumber": "#TEST-1001",
  "itemsFulfilled": 2
}

✅ Warehouse order created successfully!
   Order Number: ORD-20250104-5678
   Order ID: abc123
   Items Fulfilled: 2
```

**Benefits:**
- ⚡ Test in ~10 seconds vs 5+ minutes for full flow
- 🔄 Rapid iteration on webhook logic
- 🧪 Test error cases easily
- 📝 No need for ngrok during development

---

### Full End-to-End Testing (With ngrok)

**For integration testing across both systems:**

1. **Start warehouse dev server:**
```bash
cd warehouse-management
pnpm dev
```

2. **Expose webhook with ngrok:**
```bash
ngrok http 3000
```

3. **Update onlyperf .env:**
```bash
WAREHOUSE_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/shopify/orders
```

4. **Test order flow:**
   - Create test order on onlyperf
   - Pay with Sepay (use test transaction)
   - Check warehouse logs for webhook
   - Verify order created with `source='shopify'`
   - Verify items marked as 'allocated' (not 'sold')
   - Scan QR paddles to mark items as 'sold'

### Test Cases

#### ✅ Happy Path - Webhook
- All SKUs exist in warehouse
- Sufficient inventory (status='received')
- Order created with `fulfillmentStatus='pending'`
- Order items created with `shipmentItemId=NULL`
- Items remain in 'received' status

#### ✅ Happy Path - Fulfillment
- Staff opens `/fulfillment` page
- Sees pending order in list
- Clicks "Bắt đầu quét QR"
- Scans matching product QR codes
- Each scan: `shipmentItem.status='sold'`, `orderItem.fulfillmentStatus='fulfilled'`
- All items scanned: `order.fulfillmentStatus='fulfilled'`

#### ❌ Missing SKU (Webhook)
- Order contains SKU not in warehouse
- Webhook returns 400 error
- No order created
- Admin notified (TODO: implement)

#### ❌ Insufficient Inventory (Webhook)
- Warehouse has some items but not enough
- Webhook returns 400 error (allows order creation per user choice)
- Order created but may fail during fulfillment
- Staff handles shortage manually

#### ❌ Wrong Product Scanned (Fulfillment)
- Staff scans QR code for wrong product
- System validates: `scanned.productId !== required.productId`
- Returns error: "Đơn hàng này không cần sản phẩm này"
- Staff scans correct product

#### ❌ Item Not Available (Fulfillment)
- Staff scans QR for item with status != 'received'
- Returns error: "Sản phẩm không khả dụng"
- Staff finds available item

#### ✅ Customer Upsert
- Existing customer by phone → update name/address
- New customer → create new record
- Email-only customer → use email as phone placeholder

---

## Deployment Checklist

### Warehouse
- [ ] Run `pnpm db:push` to apply schema changes
- [ ] Add `SHOPIFY_WEBHOOK_SECRET` to production .env
- [ ] Deploy code to production
- [ ] Test webhook endpoint: `curl https://warehouse.com/api/webhooks/shopify/orders`

### OnlyPerf
- [ ] Run `pnpm db:push` (if needed)
- [ ] Add `WAREHOUSE_WEBHOOK_URL` to production .env
- [ ] Add `WAREHOUSE_WEBHOOK_SECRET` to production .env (same as warehouse)
- [ ] Deploy code to production
- [ ] Test notification: Create test order and verify warehouse receives it

### Monitoring
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Monitor webhook failures in warehouse logs
- [ ] Set up alerts for repeated failures
- [ ] Create admin dashboard for failed webhooks (optional)

---

## SKU Mapping

**Critical:** Warehouse product IDs MUST match Shopify SKUs.

### Current Implementation
In `warehouse-management/src/lib/shopify/productPayload.ts:46`:
```typescript
sku: product.id  // Warehouse product ID is synced as Shopify SKU
```

### Verification
```sql
-- Check warehouse products
SELECT id, name, brand, model FROM products LIMIT 10;

-- Check Shopify sync status
SELECT
  p.id as warehouse_id,
  p.name,
  sp.shopify_variant_id,
  sp.last_sync_status
FROM products p
LEFT JOIN shopify_products sp ON p.id = sp.product_id
WHERE sp.last_sync_status = 'success';
```

---

## Order Status Flow

### Shipment Item Status Flow

**In-Store Orders:**
```
pending → received → sold (auto-marked when QR scanned during checkout)
```

**Shopify Orders:**
```
pending → received (webhook does NOT change status) → sold (staff QR scan via /fulfillment)
```

**Rationale:** Shopify orders do NOT pre-allocate specific items. Items remain in 'received' status until staff physically scans them via the `/fulfillment` page. This allows staff complete flexibility in choosing which identical items (same productId) to pick.

### Order & Order Items Status Flow

**Shopify Orders:**
```
Webhook creates:
  - order.fulfillmentStatus = 'pending'
  - orderItems.shipmentItemId = NULL
  - orderItems.fulfillmentStatus = 'pending'

Staff scans via /fulfillment:
  - orderItems.shipmentItemId = <scanned item>
  - orderItems.fulfillmentStatus = 'fulfilled'
  - shipmentItems.status = 'sold'

All items scanned:
  - order.fulfillmentStatus = 'fulfilled'
  - Ready for shipping
```

### Order Record Status

**In-Store Orders:**
```
source: 'in-store'
paymentStatus: 'Paid' (cash) or 'Unpaid' (bank_transfer)
deliveryStatus: 'processing' → 'shipped' → 'delivered'
```

**Shopify Orders:**
```
source: 'shopify'
shopifyOrderId: "gid://shopify/Order/123"
shopifyOrderNumber: "#1001"
paymentStatus: 'Paid' (always, from Sepay)
deliveryStatus: 'processing' → 'shipped' → 'delivered'
```

**Manual Orders:**
```
source: 'manual'
paymentStatus: Set by staff
deliveryStatus: Set by staff
```

---

## Manual Fulfillment Process

### For Warehouse Staff

#### Step-by-Step Workflow

1. **Webhook Creates Order**
   - Order arrives from onlyperf.com (Shopify)
   - Order created with `fulfillmentStatus='pending'`
   - No specific items allocated yet
   - Items stay in 'received' status

2. **Access Fulfillment Page**
   - Navigate to `/fulfillment` in warehouse system
   - See list of pending Shopify orders
   - Each order shows:
     - Customer info
     - Required products (e.g., "2x PerformanceX Red Paddle")
     - Progress bar (0/5 items scanned)

3. **Select Order & Start Scanning**
   - Click "Bắt đầu quét QR" on an order
   - Scanner modal opens showing required products
   - Scan ANY QR paddle matching the required product

4. **Scan QR Codes**
   - **Product Match**: System validates `scanned_item.productId === required_item.productId`
   - **Any Item**: Can scan ANY item with matching productId (all PerformanceX Red are identical)
   - **Status Update**: Scanned item immediately marked as 'sold'
   - **Progress**: UI updates showing "1/5 items scanned"

5. **Complete Order**
   - When all items scanned → Order marked as 'fulfilled'
   - Ready to ship
   - Order disappears from pending list

### Important Notes

**Flexibility:**
- Staff can pick ANY item with matching productId
- Example: Order needs "PerformanceX Red". Warehouse has 100 identical items with different QR codes. Staff can scan any of them.

**Validation:**
- System checks: `scanned_item.productId === order_item.productId`
- Rejects if wrong product scanned
- Prevents scanning same item twice

**Status Flow:**
- Items: `received` → `sold` (no 'allocated' status)
- Order: `pending` → `fulfilled`
- Simple and direct

**No Pre-Allocation:**
- FIFO not enforced by webhook
- Staff physically picks oldest items (FIFO by practice, not code)

---

## Troubleshooting

### Webhook Not Receiving Orders

1. **Check ngrok/production URL:**
```bash
curl -X POST https://warehouse.com/api/webhooks/shopify/orders \
  -H "Content-Type: application/json" \
  -H "X-Signature: test" \
  -H "X-Timestamp: $(date +%s)" \
  -d '{}'
```

Should return 401 (signature invalid) not 404.

2. **Check onlyperf logs:**
```bash
cd onlyperf
pnpm logs | grep "warehouse"
```

3. **Verify HMAC secret matches:**
```bash
# Warehouse
echo $SHOPIFY_WEBHOOK_SECRET

# OnlyPerf
echo $WAREHOUSE_WEBHOOK_SECRET
```

### Orders Not Created

1. **Check warehouse logs:**
```bash
cd warehouse-management
pnpm logs | grep "Shopify order"
```

2. **Verify SKU mapping:**
```sql
SELECT COUNT(*) FROM products WHERE id = 'ABCD1234';
```

3. **Check inventory availability:**
```sql
SELECT * FROM shipment_items
WHERE product_id = 'ABCD1234'
AND status = 'received';
```

### Invalid HMAC Signature

1. **Clock skew:** Ensure servers are time-synced (NTP)
2. **Secret mismatch:** Verify both systems use same secret
3. **Payload modification:** Check for proxy/middleware altering body

---

## Future Enhancements

### Phase 2 (Optional)
- [ ] Admin notification system (email/SMS for errors)
- [ ] Retry mechanism for failed webhooks
- [ ] Delivery status sync back to Shopify
- [ ] Partial fulfillment support
- [ ] Order filtering by source in UI
- [ ] Shopify order badge in order list

### Phase 3 (Advanced)
- [ ] Real-time inventory sync (webhook from warehouse → Shopify)
- [ ] Automatic pick list generation
- [ ] Shipping label integration
- [ ] Returns handling for online orders

---

## Key Files Reference

### Warehouse Repo
| File | Purpose |
|------|---------|
| **Database Schema** |
| `src/server/db/schema.ts:152-170` | Shipment items table (status flow) |
| `src/server/db/schema.ts:200-230` | Orders table (with fulfillmentStatus) |
| `src/server/db/schema.ts:232-251` | Order items table (nullable shipmentItemId) |
| **Webhook & Order Creation** |
| `src/app/api/webhooks/shopify/orders/route.ts` | Webhook handler entry point |
| `src/actions/shopify/orderWebhookActions.ts` | Order creation WITHOUT item allocation |
| `src/lib/security/hmac.ts` | HMAC verification for webhooks |
| **Manual Fulfillment** |
| `src/actions/fulfillmentActions.ts` | Fulfillment server actions (NEW) |
| `src/app/fulfillment/page.tsx` | Fulfillment page route (NEW) |
| `src/components/fulfillment/FulfillmentClientUI.tsx` | Pending orders list UI (NEW) |
| `src/components/fulfillment/FulfillmentScanner.tsx` | QR scanning modal (NEW) |
| **In-Store Sales** |
| `src/actions/outboundActions.ts:86` | QR validation (in-store + allocated) |
| `src/actions/outboundActions.ts:187-190` | In-store payment handling |

### OnlyPerf Repo
| File | Purpose |
|------|---------|
| `src/actions/sepayActions.ts:217-248` | Warehouse notification |
| `src/actions/warehouseActions.ts:6-40` | Webhook payload type |
| `src/lib/security/hmac.ts` | HMAC signing |

---

## Support

For issues:
1. Check logs in both warehouse and onlyperf
2. Verify environment variables
3. Test webhook endpoint manually
4. Check database for failed orders

---

**Last updated:** 2025-01-04
**Status:** ✅ Ready for testing
