# Order Management - `/orders`

## Purpose
Comprehensive order tracking and management dashboard for all order sources (in-store, Shopify, manual). Central hub for viewing order history, tracking payment and delivery status, and managing order lifecycle.

## Features

### Multi-Source Order Dashboard
- View all orders from multiple channels:
  - **In-store**: Point of sale transactions
  - **Shopify**: Online store orders
  - **Manual**: Special or bulk orders
- Unified order interface
- Source-specific filtering

### Order Tracking
- Payment status tracking
- Delivery status monitoring
- Fulfillment progress (Shopify orders)
- Real-time status updates
- Order history

### Order Search and Filters
- Search by order number, customer
- Filter by date range
- Filter by customer type (B2C/B2B)
- Filter by source
- Sort by any column

### Order Statistics
- Total orders count
- Revenue metrics
- Payment status breakdown
- Delivery status distribution
- Order source analytics

### Order Details View
- Complete order information
- Customer details
- Product list with prices
- Payment information
- Delivery tracking
- Order timeline

## Order Sources

### In-Store Orders (`/outbound`)
```
Customer shops in person
  ↓
Staff scans items
  ↓
Order created (source: 'in-store')
  ↓
Items immediately linked (fulfillmentStatus: 'fulfilled')
  ↓
Payment processed
  ↓
Delivery scheduled
```

### Shopify Orders (Webhook)
```
Customer orders online
  ↓
Payment via Sepay
  ↓
Webhook received
  ↓
Order created (source: 'shopify', fulfillmentStatus: 'pending')
  ↓
Staff fulfills at /fulfillment
  ↓
Items scanned and linked
  ↓
Delivery scheduled
```

### Manual Orders
```
Special order request
  ↓
Admin creates manually
  ↓
Order created (source: 'manual')
  ↓
Custom fulfillment process
```

## Data Model

### Order Schema
```typescript
{
  id: string;
  orderNumber: string;           // DH{timestamp}{random}
  customerId: string;             // FK to customers
  providerId?: string;            // FK to providers (B2B)
  customerType: string;           // 'b2c' | 'b2b'
  source: string;                 // 'in-store' | 'shopify' | 'manual'
  shopifyOrderId?: string;        // Shopify order GID (if Shopify)
  shopifyOrderNumber?: string;    // Shopify order #1001 (if Shopify)
  totalAmount: number;            // Total in VND
  paymentMethod: string;          // 'cash' | 'bank_transfer'
  paymentStatus: string;          // 'Unpaid' | 'Paid' | 'Cancelled' | 'Refunded'
  paymentCode?: string;           // Payment code for bank transfer
  deliveryStatus: string;         // 'processing' | 'shipped' | 'waiting_for_delivery' | 'delivered' | 'failed'
  fulfillmentStatus: string;      // 'pending' | 'in_progress' | 'fulfilled'
  voucherCode?: string;
  notes?: string;
  processedBy?: string;           // User ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Order Item Schema
```typescript
{
  id: string;
  orderId: string;                // FK to orders
  shipmentItemId?: string;        // FK to shipmentItems (nullable for Shopify pending)
  productId: string;              // FK to products
  quantity: number;               // Always 1
  price: number;                  // Price at sale time
  qrCode?: string;                // QR code (set when scanned)
  fulfillmentStatus: string;      // 'pending' | 'fulfilled'
  scannedAt?: Date;
  createdAt: Date;
}
```

## Technical Details

### Server Actions

**Order Queries**
```typescript
getOrdersList(params)              // Paginated list with filters
getOrderStats()                    // Dashboard statistics
getOrderByIdAction(id)             // Single order details
getOrderWithItemsAction(id)        // Order with items and products
```

**Order Mutations**
```typescript
createOrderAction(data)            // Create manual order
updateOrderPaymentStatusAction(id) // Update payment
updateOrderDeliveryStatusAction(id)// Update delivery
cancelOrderAction(id)              // Cancel order
```

### Component Structure
```
/orders/page.tsx
  └── OrdersDashboardClientUI
      ├── OrderStatsCards
      ├── OrderFilters
      ├── OrdersTable
      └── OrderActions

/orders/[id]/page.tsx
  └── OrderDetailPage
      ├── OrderHeader
      ├── CustomerInfo
      ├── OrderItems
      ├── PaymentInfo
      ├── DeliveryTracking
      └── OrderTimeline
```

### Pagination and Filters
```typescript
interface OrderFilters {
  search?: string;          // Order number, customer name
  startDate?: Date;
  endDate?: Date;
  customerType?: 'b2b' | 'b2c';
  source?: 'in-store' | 'shopify' | 'manual';
  paymentStatus?: 'Unpaid' | 'Paid' | 'Cancelled' | 'Refunded';
  deliveryStatus?: 'processing' | 'shipped' | 'delivered' | 'failed';
}
```

## Order Dashboard (`/orders`)

### Statistics Cards
```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Tổng đơn hàng  │ Doanh thu      │ Chờ thanh toán │ Đang giao     │
│ {totalOrders}  │ {totalRevenue}đ│ {unpaid}       │ {shipping}    │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

### Filter Options
- **Search**: Order number, customer name, phone
- **Date Range**: Start date to end date
- **Customer Type**: B2C (retail) | B2B (business)
- **Source**: In-store | Shopify | Manual
- **Payment Status**: All | Unpaid | Paid | Cancelled
- **Delivery Status**: All | Processing | Shipped | Delivered

### Orders Table
| Số đơn | Ngày | Khách hàng | Nguồn | Tổng tiền | Thanh toán | Giao hàng | Thao tác |
|--------|------|------------|-------|-----------|------------|-----------|----------|
| DH12345 | 15/01/2024 | Nguyễn Văn A | Cửa hàng | 1,700,000đ | Đã thanh toán | Đang giao | Xem |
| #1001 | 14/01/2024 | Trần Thị B | Shopify | 2,500,000đ | Đã thanh toán | Đã giao | Xem |

### Status Badges

**Payment Status**
- 🟡 **Chờ thanh toán** (Unpaid): Yellow
- 🟢 **Đã thanh toán** (Paid): Green
- 🔴 **Đã hủy** (Cancelled): Red
- 🔵 **Hoàn tiền** (Refunded): Blue

**Delivery Status**
- 🟡 **Đang xử lý** (Processing): Yellow
- 🔵 **Đang giao** (Shipped): Blue
- 🟡 **Chờ giao** (Waiting): Yellow
- 🟢 **Đã giao** (Delivered): Green
- 🔴 **Thất bại** (Failed): Red

**Fulfillment Status** (Shopify only)
- 🟡 **Chờ xử lý** (Pending): Yellow
- 🔵 **Đang xử lý** (In Progress): Blue
- 🟢 **Đã xử lý** (Fulfilled): Green

## Order Detail Page (`/orders/[id]`)

### Order Header
```
┌─────────────────────────────────────────────────────────┐
│ ĐƠN HÀNG #DH12345                                       │
│ Ngày tạo: 15/01/2024 10:30                             │
│ Nguồn: Cửa hàng                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ Đã thanh toán│ │ Đang giao    │ │ Đã xử lý     │    │
│ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Customer Information
```
┌─────────────────────────────────────────┐
│ THÔNG TIN KHÁCH HÀNG                   │
├─────────────────────────────────────────┤
│ Tên:        Nguyễn Văn A               │
│ SĐT:        0901234567                  │
│ Địa chỉ:    123 Main St, Hanoi        │
│ Loại:       Khách lẻ (B2C)            │
└─────────────────────────────────────────┘
```

### Order Items
```
┌─────────────────────────────────────────────────────────────┐
│ SẢN PHẨM                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Tennis Racket Pro                                           │
│ Wilson TR-2024 - Red                                        │
│ QR: ABCD1234                                               │
│ Giá: 1,500,000đ                                     [✓]    │
│                                                             │
│ Tennis Ball Set                                             │
│ Wilson Ball-Pro - Yellow                                    │
│ QR: EFGH5678                                               │
│ Giá: 200,000đ                                       [✓]    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ TỔNG CỘNG:                              1,700,000đ         │
└─────────────────────────────────────────────────────────────┘
```

### Payment Information
```
┌─────────────────────────────────────────┐
│ THANH TOÁN                             │
├─────────────────────────────────────────┤
│ Phương thức:   Chuyển khoản            │
│ Mã thanh toán: DH12345                 │
│ Tổng tiền:     1,700,000đ              │
│ Trạng thái:    Đã thanh toán ✓        │
│ Thanh toán lúc: 15/01/2024 10:35      │
└─────────────────────────────────────────┘
```

### Delivery Tracking
```
┌─────────────────────────────────────────┐
│ GIAO HÀNG                              │
├─────────────────────────────────────────┤
│ Trạng thái:    Đang giao               │
│ Shipper:       Nguyễn Văn C            │
│ SĐT:          0912345678                │
│ Mã vận đơn:    VD123456                │
│                                         │
│ [Xem chi tiết giao hàng]               │
└─────────────────────────────────────────┘
```

### Order Timeline
```
┌─────────────────────────────────────────┐
│ LỊCH SỬ ĐƠN HÀNG                      │
├─────────────────────────────────────────┤
│ 🟢 15/01/2024 10:30                    │
│    Đơn hàng được tạo                   │
│                                         │
│ 🟢 15/01/2024 10:35                    │
│    Thanh toán thành công               │
│                                         │
│ 🟢 15/01/2024 11:00                    │
│    Đơn hàng được xử lý                 │
│                                         │
│ 🔵 15/01/2024 14:00                    │
│    Đang giao hàng                      │
└─────────────────────────────────────────┘
```

## Order Status Flow

### In-Store Order Flow
```
Order Created
  ↓ (immediate)
fulfillmentStatus: 'fulfilled'
  ↓
paymentStatus: 'Unpaid' → 'Paid'
  ↓
deliveryStatus: 'processing' → 'shipped' → 'delivered'
```

### Shopify Order Flow
```
Order Created (Webhook)
  ↓
paymentStatus: 'Paid' (already paid online)
fulfillmentStatus: 'pending'
  ↓ (staff fulfills)
fulfillmentStatus: 'in_progress' → 'fulfilled'
  ↓
deliveryStatus: 'processing' → 'shipped' → 'delivered'
```

## Order Number Format

### In-Store Orders
```
DH{timestamp}{random}
Example: DH1704123456789ABC
```

### Shopify Orders
- Warehouse order number: Same format as in-store
- Shopify order number: Stored in `shopifyOrderNumber` (e.g., "#1001")
- Both numbers displayed in UI

## Integration Points

### Payment Processing

**Cash Payment**
- Immediate payment confirmation
- paymentStatus = 'Paid'
- Receipt generation

**Bank Transfer (Sepay)**
- Generate payment code
- Monitor webhook
- Auto-update status on payment
- Transaction matching

### Delivery Management
- Create delivery record after order
- Link order to delivery
- Track delivery status
- Update order delivery status

### Inventory Sync
- Update Shopify inventory on order completion
- Real-time stock levels
- Handle sync errors

### Fulfillment
- Track fulfillment for Shopify orders
- Link items during scanning
- Update fulfillment status

## Search and Filtering

### Search Fields
- Order number (warehouse or Shopify)
- Customer name
- Customer phone
- Payment code

### Filter Combinations
```typescript
// Example: Recent Shopify orders awaiting payment
{
  source: 'shopify',
  paymentStatus: 'Unpaid',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
}

// Example: B2B orders this month
{
  customerType: 'b2b',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
}
```

## Reports and Analytics

### Available Metrics
- Total orders by source
- Revenue by source
- Payment method distribution
- Average order value
- Top customers
- Popular products
- Delivery success rate

### Time-Based Analysis
- Daily/weekly/monthly trends
- Seasonal patterns
- Peak ordering times
- Growth metrics

## Order Actions

### Available Actions
- **View**: See order details
- **Edit**: Update order information (admin only)
- **Cancel**: Cancel order (if not delivered)
- **Refund**: Process refund (if paid)
- **Print**: Generate receipt
- **Track**: View delivery status

### Permission Requirements
- View: All authenticated users
- Create: Warehouse staff, Admin
- Edit: Admin only
- Cancel: Admin, Order creator
- Refund: Admin, Accountant

## Error Handling

### Common Errors
- **Order not found**: Invalid order ID
- **Payment failed**: Bank transfer issues
- **Delivery failed**: Address or customer issues
- **Sync failed**: Shopify connection

### Recovery Actions
- Retry payment
- Update delivery information
- Contact customer
- Manual fulfillment
- Cancel and recreate

## Best Practices

### Order Processing
1. Verify customer information
2. Confirm payment method
3. Check inventory availability
4. Process promptly
5. Track delivery

### Customer Service
1. Clear communication
2. Timely updates
3. Handle complaints quickly
4. Maintain records
5. Follow up

### Data Management
1. Accurate data entry
2. Regular reconciliation
3. Backup order data
4. Audit trail maintenance
5. Compliance checks

## Performance Optimization

### Database Queries
- Indexed columns (orderNumber, customerId, source)
- Efficient joins
- Pagination support
- Query optimization

### Caching
- Dashboard statistics caching
- Customer data caching
- Product information caching

## Related Routes
- `/outbound` - Create in-store orders
- `/fulfillment` - Fulfill Shopify orders
- `/deliveries` - Track deliveries
- `/customers` - Customer management
- `/reports` - Order analytics
- Webhook: `/api/webhooks/shopify/orders`

## Environment Configuration

### Payment Integration (Sepay)
```env
SEPAY_ACCOUNT_NUMBER=...
SEPAY_WEBHOOK_URL=...
SEPAY_API_KEY=...
```

### Shopify Integration
```env
SHOPIFY_ENABLED=true
SHOPIFY_STORE_DOMAIN=...
SHOPIFY_ADMIN_API_ACCESS_TOKEN=...
```

## Troubleshooting

### Orders Not Showing
- Check filters and date range
- Verify pagination
- Review permissions
- Check database connection

### Payment Status Not Updating
- Verify Sepay webhook configuration
- Check payment code matching
- Review transaction logs
- Test webhook manually

### Delivery Issues
- Verify delivery record creation
- Check shipper assignment
- Review delivery status flow
- Contact delivery service
