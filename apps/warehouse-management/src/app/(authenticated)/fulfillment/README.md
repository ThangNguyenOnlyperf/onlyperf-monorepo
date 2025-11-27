# Shopify Order Fulfillment - `/fulfillment`

## Purpose
Manual fulfillment interface for Shopify online orders. Staff scan QR codes of physical items to fulfill orders placed through the Shopify store, linking warehouse inventory to online sales.

## Features

### Pending Orders Dashboard
- View all pending Shopify orders
- Order details (customer, items, total)
- Fulfillment progress tracking
- Required products vs fulfilled products
- Order priority sorting

### QR Code Scanning for Fulfillment
- Scan items to fulfill orders
- Real-time validation
- Product matching
- Quantity tracking
- Completion detection

### Order Management
- Select order to fulfill
- View required products
- Track fulfillment progress
- Complete fulfillment
- Handle partial fulfillments

## Shopify Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CUSTOMER PLACES ORDER ON SHOPIFY                         │
│    - Customer adds products to cart                          │
│    - Completes payment via Sepay                            │
│    - Shopify receives payment confirmation                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SHOPIFY SENDS WEBHOOK                                    │
│    POST /api/webhooks/shopify/orders                        │
│    - HMAC signature verification                             │
│    - Webhook payload validation                              │
│    - Order data extraction                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SYSTEM CREATES ORDER                                     │
│    processShopifyOrderAction()                              │
│    ↓                                                        │
│    - Create/find customer record                             │
│    - Create order (source: 'shopify', fulfillmentStatus: 'pending') │
│    - Create orderItems WITHOUT shipmentItemId               │
│    - Mark shipmentItems as 'allocated' (reserved)           │
│    - Order appears in fulfillment queue                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. STAFF OPENS FULFILLMENT PAGE                             │
│    /fulfillment                                             │
│    - View pending orders                                     │
│    - See required products                                   │
│    - Check fulfillment status                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. STAFF SCANS ITEMS                                        │
│    scanItemForFulfillmentAction(orderId, qrCode)            │
│    ↓                                                        │
│    - Find shipmentItem by QR code                            │
│    - Verify item status = 'received' or 'allocated'         │
│    - Match product to order requirements                     │
│    - Link shipmentItemId to orderItem                        │
│    - Update shipmentItem: status → 'sold'                    │
│    - Update orderItem: fulfillmentStatus → 'fulfilled'       │
│    - Decrement storage usedCapacity                          │
│    - Check if all items fulfilled                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. FULFILLMENT COMPLETE                                     │
│    - Update order: fulfillmentStatus → 'fulfilled'          │
│    - Sync inventory to Shopify                               │
│    - Create delivery record                                  │
│    - Remove from pending orders list                         │
│    - Notify staff                                            │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Order (Shopify Source)
```typescript
{
  id: string;
  orderNumber: string;           // Warehouse order number
  customerId: string;
  source: 'shopify';              // Identifies Shopify order
  shopifyOrderId: string;         // Shopify order GID
  shopifyOrderNumber: string;     // Shopify order number (e.g., #1001)
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'Paid';          // Always paid (from webhook)
  deliveryStatus: 'processing';   // Initial status
  fulfillmentStatus: 'pending';   // pending → in_progress → fulfilled
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Order Item (Before Fulfillment)
```typescript
{
  id: string;
  orderId: string;
  shipmentItemId: null;           // NULL until scanned
  productId: string;
  quantity: number;                // Always 1 (one per item)
  price: number;
  qrCode: null;                    // NULL until scanned
  fulfillmentStatus: 'pending';   // pending → fulfilled
  scannedAt: null;
  createdAt: Date;
}
```

### Order Item (After Scanning)
```typescript
{
  id: string;
  orderId: string;
  shipmentItemId: string;         // Linked to physical item
  productId: string;
  quantity: number;
  price: number;
  qrCode: string;                  // Set during scan
  fulfillmentStatus: 'fulfilled';
  scannedAt: Date;                 // Timestamp of scan
  createdAt: Date;
}
```

### Shipment Item Status Transition
```typescript
// When webhook received:
status: 'received' → 'allocated'

// When scanned during fulfillment:
status: 'allocated' → 'sold'
```

## Technical Details

### Server Actions

**Fulfillment Actions**
```typescript
getPendingShopifyOrdersAction()             // List pending orders
getOrderFulfillmentDetailsAction(orderId)   // Order details
scanItemForFulfillmentAction(orderId, qr)   // Scan item
markOrderFulfilledAction(orderId)           // Complete order
```

**Webhook Handler**
```typescript
// /api/webhooks/shopify/orders
POST handler
  → verifyWebhookRequest()        // HMAC validation
  → OrderPaidEventSchema.parse()  // Zod validation
  → processShopifyOrderAction()   // Create order
```

### Component Structure
```
/fulfillment/page.tsx
  └── FulfillmentClientUI
      ├── PendingOrdersList
      │   ├── OrderCard
      │   └── OrderStats
      ├── OrderDetail
      │   ├── CustomerInfo
      │   ├── RequiredProducts
      │   └── FulfillmentProgress
      └── FulfillmentScanner
          ├── QRScanner
          ├── ScanHistory
          └── CompleteButton
```

### Validation Logic

**Scan Validation**
```typescript
1. QR code format valid
   ↓
2. ShipmentItem exists
   ↓
3. Item status = 'received' OR 'allocated'
   ↓
4. Product matches order requirement
   ↓
5. Quantity not exceeded
   ↓
6. Item not already linked to another order
   ↓
7. Valid → Link and update status
```

### Webhook Payload Schema (Zod)
```typescript
OrderPaidEventSchema = {
  admin_graphql_api_id: string    // Shopify order GID
  name: string                     // Order number (e.g., #1001)
  email?: string
  phone?: string
  total_price: string              // Amount as string
  financial_status: 'paid'
  line_items: [
    {
      sku: string                  // Product ID
      quantity: number
      price: string
      name: string
      title: string
    }
  ]
  shipping_address?: {
    name?: string
    address1?: string
    phone?: string
    city?: string
    province?: string
  }
}
```

## User Flow

### Viewing Pending Orders
```
1. Open /fulfillment
   ↓
2. System fetches pending orders:
   - source = 'shopify'
   - fulfillmentStatus = 'pending'
   ↓
3. Display order cards:
   - Customer name
   - Order number
   - Total amount
   - Required products
   - Fulfillment progress
```

### Fulfilling an Order
```
1. Click on order card
   ↓
2. View order details:
   - Customer information
   - Shipping address
   - Required products list
   - Products needed vs fulfilled
   ↓
3. Click "Start Fulfillment"
   ↓
4. Open QR scanner
   ↓
5. Scan items one by one:
   - System validates each scan
   - Links item to order
   - Updates progress
   ↓
6. When all items scanned:
   - Order marked as fulfilled
   - Removed from pending list
   - Delivery can be created
```

## UI Components

### Pending Orders List
```
┌────────────────────────────────────────────────────────┐
│ ĐƠN HÀNG CHỜ XỬ LÝ                                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│ 📦 Order #1001                                         │
│ Khách hàng: Nguyễn Văn A                              │
│ Số điện thoại: 0901234567                             │
│ Tổng tiền: 1,700,000đ                                 │
│ Sản phẩm: 2 items                                      │
│ ⏱️ Tiến độ: 0/2 đã quét                                │
│                                    [Xử lý đơn hàng]    │
│                                                         │
│ 📦 Order #1002                                         │
│ Khách hàng: Trần Thị B                                │
│ ...                                                    │
└────────────────────────────────────────────────────────┘
```

### Order Detail View
```
┌────────────────────────────────────────────────────────┐
│ THÔNG TIN ĐƠN HÀNG #1001                              │
├────────────────────────────────────────────────────────┤
│ Khách hàng:  Nguyễn Văn A                             │
│ SĐT:         0901234567                                │
│ Địa chỉ:     123 Main St, Hanoi                        │
│                                                         │
│ SẢN PHẨM CẦN XỬ LÝ:                                   │
│                                                         │
│ ✓ Tennis Racket Pro                   1,500,000đ      │
│   Wilson TR-2024 - Red                                 │
│   ✅ Đã quét: ABCD1234                                 │
│                                                         │
│ ⏱ Tennis Ball Set                      200,000đ       │
│   Wilson Ball-Pro - Yellow                             │
│   ⚠️ Chưa quét                                         │
│                                                         │
│ TỔNG CỘNG: 1,700,000đ                                 │
│ TIẾN ĐỘ: 1/2 sản phẩm                                 │
│                                                         │
│               [Quét sản phẩm]                          │
└────────────────────────────────────────────────────────┘
```

### Scanning Interface
- QR scanner (camera view)
- Last scanned item display
- Scan history
- Progress indicator
- Complete fulfillment button

## Integration Points

### Shopify Webhook
- Endpoint: `/api/webhooks/shopify/orders`
- Event: `orders/paid`
- Verification: HMAC signature
- Validation: Zod schema

### Inventory Sync
- Decrement on fulfillment
- Update Shopify inventory levels
- Handle sync errors
- Retry failed syncs

### Delivery Creation
- Create delivery record after fulfillment
- Link to order
- Assign shipper
- Track status

### Storage Management
- Decrement usedCapacity on scan
- Track item locations
- Update storage metrics

## Status Management

### Order Fulfillment Status
- **pending**: Waiting for staff to scan items
- **in_progress**: Some items scanned, not complete
- **fulfilled**: All items scanned and linked

### Order Item Fulfillment Status
- **pending**: Not yet scanned
- **fulfilled**: Scanned and linked to shipmentItem

### Shipment Item Status
- **received**: Available for fulfillment
- **allocated**: Reserved for this order (webhook)
- **sold**: Scanned during fulfillment

## Error Handling

### Webhook Errors
- **HMAC verification failed**: 401 Unauthorized
- **Invalid payload**: 400 Bad Request (Zod validation)
- **Missing SKU**: Product not found in warehouse
- **Insufficient inventory**: Not enough items

### Scan Errors
- **Invalid QR code**: Format or not found
- **Wrong product**: Doesn't match order requirement
- **Already fulfilled**: Item already used in another order
- **Not allocated**: Item not available
- **Quantity exceeded**: All required items already scanned

### Recovery
- Webhook retries (Shopify automatic)
- Error logging for debugging
- Toast notifications for staff
- Detailed error messages

## Best Practices

### Fulfillment Process
1. Review order before starting
2. Prepare all required products
3. Scan items carefully
4. Verify each scan
5. Complete fulfillment promptly

### Inventory Management
1. Keep allocated items separate
2. Label clearly
3. First-in, first-out (FIFO)
4. Regular stock checks

### Customer Communication
1. Confirm order receipt
2. Update on fulfillment progress
3. Notify when shipped
4. Provide tracking information

## Performance Optimization

### Efficient Queries
- Indexed columns (shopifyOrderId, fulfillmentStatus)
- Optimized joins
- Pagination support
- Cached customer data

### Real-time Updates
- Optimistic UI updates
- Background sync
- Efficient re-fetching
- Minimal latency

## Security

### Webhook Security
- HMAC signature verification
- Payload validation
- Rate limiting
- IP whitelisting (optional)

### Access Control
- Staff authentication required
- Role-based permissions
- Audit logging
- Session management

## Monitoring

### Metrics
- Pending orders count
- Average fulfillment time
- Scan error rate
- Webhook success rate

### Alerts
- Long-pending orders
- Failed webhooks
- Sync errors
- Capacity warnings

## Related Routes
- `/orders` - View all orders
- `/deliveries` - Delivery tracking
- `/products` - Product catalog
- `/outbound` - In-store sales
- Webhook: `/api/webhooks/shopify/orders`

## Environment Configuration

### Required
```env
SHOPIFY_ENABLED=true
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_API_VERSION=2025-04
SHOPIFY_LOCATION_ID=gid://shopify/Location/xxxxx
SHOPIFY_WEBHOOK_SECRET=xxxxx
```

### Webhook Setup in Shopify
1. Go to Shopify Admin → Settings → Notifications
2. Add webhook for "Order payment"
3. URL: `https://yourdomain.com/api/webhooks/shopify/orders`
4. Format: JSON
5. API version: 2025-04

## Troubleshooting

### Orders Not Appearing
- Check webhook configuration
- Verify HMAC secret matches
- Check webhook logs in Shopify
- Review server logs

### Scan Not Working
- Verify QR code format
- Check item status
- Confirm product SKU match
- Review error messages

### Inventory Not Syncing
- Check Shopify credentials
- Verify API permissions
- Review sync logs
- Test API connection
