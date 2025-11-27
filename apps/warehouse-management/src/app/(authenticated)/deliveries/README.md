# Delivery Management - `/deliveries`

## Purpose
Comprehensive delivery tracking system for managing order deliveries, shipper assignments, status monitoring, and failed delivery resolution. Ensures successful delivery of orders to customers.

## Features

### Delivery Dashboard
- View all deliveries with filtering
- Track delivery status
- Monitor shipper performance
- Delivery statistics
- Quick status updates

### Shipper Management
- Assign shippers to orders
- Track shipper workload
- Contact information
- Performance metrics

### Status Tracking
- Real-time delivery status
- Location tracking (via tracking number)
- Delivery confirmation
- Timestamp recording
- Status history

### Failed Delivery Handling
- Failure reason documentation
- Resolution workflow
- Re-import to warehouse
- Return to supplier
- Retry delivery scheduling

### Delivery History
- Complete audit trail
- Status change log
- User actions
- Timestamps
- Notes and comments

## Delivery Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DELIVERY CREATED                                          │
│    - Linked to order                                         │
│    - Status: 'waiting_for_delivery'                          │
│    - Shipper assigned                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. OUT FOR DELIVERY                                          │
│    - Shipper picks up order                                  │
│    - Tracking number recorded                                │
│    - Customer notified                                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DELIVERY ATTEMPT                                          │
│    ↓                                                         │
│    SUCCESS PATH:                                             │
│    - Customer receives order                                 │
│    - Status: 'delivered'                                     │
│    - Delivery confirmed                                      │
│    - Order status updated                                    │
│    ↓                                                         │
│    FAILURE PATH:                                             │
│    - Delivery fails                                          │
│    - Status: 'failed'                                        │
│    - Failure reason documented                               │
│    - Resolution process initiated                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FAILED DELIVERY RESOLUTION (if failed)                   │
│    ↓                                                         │
│    Option A: RE-IMPORT TO WAREHOUSE                          │
│    - Select storage location                                 │
│    - Update shipment items status                            │
│    - Increment storage capacity                              │
│    - Create new order if needed                              │
│    ↓                                                         │
│    Option B: RETURN TO SUPPLIER                              │
│    - Document return reason                                  │
│    - Create return shipment                                  │
│    - Update inventory                                        │
│    - Process refund                                          │
│    ↓                                                         │
│    Option C: RETRY DELIVERY                                  │
│    - Schedule new delivery date                              │
│    - Re-assign shipper                                       │
│    - Update customer info                                    │
│    - Create new delivery record                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### Delivery Schema
```typescript
{
  id: string;
  orderId: string;                // FK to orders
  shipperName: string;            // Shipper name
  shipperPhone?: string;          // Contact number
  trackingNumber?: string;        // Tracking/reference number
  status: string;                 // Delivery status
  deliveredAt?: Date;             // Delivery timestamp
  failureReason?: string;         // Reason for failure
  failureCategory?: string;       // Categorized failure type
  notes?: string;                 // Additional notes
  confirmedBy?: string;           // User who confirmed
  createdAt: Date;
  updatedAt: Date;
}
```

### Delivery Status Values
- `waiting_for_delivery`: Order ready, awaiting pickup
- `delivered`: Successfully delivered to customer
- `failed`: Delivery attempt failed
- `cancelled`: Delivery cancelled

### Failure Categories
- `customer_unavailable`: Customer not at location
- `wrong_address`: Incorrect or incomplete address
- `damaged_package`: Package damaged during transit
- `refused_delivery`: Customer refused to accept

### Delivery History Schema
```typescript
{
  id: string;
  deliveryId: string;             // FK to deliveries
  fromStatus?: string;            // Previous status
  toStatus: string;               // New status
  notes?: string;                 // Change notes
  changedBy?: string;             // User who made change
  createdAt: Date;
}
```

### Delivery Resolution Schema
```typescript
{
  id: string;
  deliveryId: string;             // FK to deliveries
  resolutionType: string;         // Type of resolution
  resolutionStatus: string;       // Resolution status
  targetStorageId?: string;       // For re-import
  supplierReturnReason?: string;  // For returns
  scheduledDate?: Date;           // For retry
  completedAt?: Date;
  processedBy?: string;           // User handling resolution
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Resolution Types
- `re_import`: Return items to warehouse
- `return_to_supplier`: Send back to supplier
- `retry_delivery`: Schedule new delivery attempt

### Resolution Status
- `pending`: Resolution created, not started
- `in_progress`: Resolution being processed
- `completed`: Resolution finished

## Technical Details

### Server Actions

**Delivery Management**
```typescript
getDeliveries(params)              // Paginated list with filters
getDeliveryStats()                 // Dashboard statistics
getDeliveryByIdAction(id)          // Single delivery details
createDeliveryAction(data)         // Create new delivery
updateDeliveryStatusAction(id)     // Update status
```

**Status Updates**
```typescript
markDeliveryDeliveredAction(id)    // Confirm delivery
markDeliveryFailedAction(id, reason, category) // Mark as failed
cancelDeliveryAction(id)           // Cancel delivery
```

**Resolution Actions**
```typescript
createResolutionAction(deliveryId, type)  // Create resolution
processReImportAction(resolutionId, storageId) // Re-import
processReturnAction(resolutionId, reason)      // Return to supplier
processRetryAction(resolutionId, date)         // Schedule retry
completeResolutionAction(resolutionId)         // Mark complete
```

### Component Structure
```
/deliveries/page.tsx
  └── DeliveryTrackingClientUI
      ├── DeliveryStatsCards
      ├── DeliveryFilters
      ├── DeliveriesTable
      └── DeliveryActions
          ├── StatusUpdateModal
          ├── FailureReasonModal
          └── ResolutionModal
```

### Pagination and Filters
```typescript
interface DeliveryFilters {
  page: number;
  pageSize: number;
  status?: string;              // Filter by status
  search?: string;              // Search order number, customer
  startDate?: Date;
  endDate?: Date;
}
```

## Delivery Dashboard (`/deliveries`)

### Statistics Cards
```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Tổng giao hàng │ Chờ giao       │ Đã giao        │ Thất bại       │
│ {total}        │ {waiting}      │ {delivered}    │ {failed}       │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

### Filter Options
- **Search**: Order number, customer name, tracking number
- **Status**: All | Waiting | Delivered | Failed | Cancelled
- **Date Range**: Start date to end date
- **Shipper**: Filter by shipper name

### Deliveries Table
| Đơn hàng | Khách hàng | Shipper | Mã vận đơn | Trạng thái | Ngày tạo | Thao tác |
|----------|------------|---------|------------|------------|----------|----------|
| DH12345 | Nguyễn Văn A | Shipper 1 | VD123456 | Đang giao | 15/01/24 | Cập nhật |
| #1001 | Trần Thị B | Shipper 2 | VD123457 | Đã giao | 14/01/24 | Xem |

### Status Badges
- 🟡 **Chờ giao** (Waiting): Yellow
- 🟢 **Đã giao** (Delivered): Green
- 🔴 **Thất bại** (Failed): Red
- ⚫ **Đã hủy** (Cancelled): Gray

### Quick Actions
- **Xác nhận giao**: Mark as delivered
- **Báo thất bại**: Mark as failed
- **Xem chi tiết**: View full details
- **Liên hệ**: Contact shipper/customer

## Delivery Creation

### Create from Order
```
Order completed
  ↓
Click "Tạo giao hàng"
  ↓
Fill delivery form:
  - Shipper name (required)
  - Shipper phone (optional)
  - Tracking number (optional)
  - Notes (optional)
  ↓
Submit
  ↓
Delivery created (status: waiting_for_delivery)
```

### Validation
- Order must exist
- Order must be paid
- Order must be fulfilled
- No existing active delivery

## Status Updates

### Mark as Delivered
```
Click "Xác nhận giao"
  ↓
Confirm dialog
  ↓
Update:
  - status → 'delivered'
  - deliveredAt → now
  - confirmedBy → current user
  - Create history entry
  ↓
Update order:
  - deliveryStatus → 'delivered'
  ↓
Success notification
```

### Mark as Failed
```
Click "Báo thất bại"
  ↓
Failure reason modal:
  - Select failure category
  - Enter detailed reason
  - Add notes
  ↓
Update:
  - status → 'failed'
  - failureReason → entered reason
  - failureCategory → selected category
  - Create history entry
  ↓
Update order:
  - deliveryStatus → 'failed'
  ↓
Initiate resolution workflow
```

## Failed Delivery Resolution

### Resolution Workflow
```
Delivery fails
  ↓
Create resolution record
  ↓
Select resolution type:
  A) Re-import to Warehouse
  B) Return to Supplier
  C) Retry Delivery
  ↓
Process resolution
  ↓
Complete and close
```

### Option A: Re-Import to Warehouse
```
Select "Nhập lại kho"
  ↓
Choose storage location
  ↓
System updates:
  - Find order items
  - Find linked shipment items
  - Update shipmentItem status: 'sold' → 'received'
  - Assign to storage
  - Increment storage usedCapacity
  - Create history entry
  ↓
Resolution status: 'completed'
Items available for re-sale
```

**Use Cases:**
- Customer refused delivery
- Wrong address, cannot contact
- Customer no longer wants items
- Items need to be restocked

### Option B: Return to Supplier
```
Select "Trả lại nhà cung cấp"
  ↓
Enter return reason
  ↓
System updates:
  - Find order items
  - Find linked shipment items
  - Update shipmentItem status: 'sold' → 'pending'
  - Remove from storage
  - Decrement storage usedCapacity
  - Create return shipment record
  - Process refund to customer
  ↓
Resolution status: 'completed'
Items returned
```

**Use Cases:**
- Damaged items
- Quality issues
- Wrong items sent
- Defective products

### Option C: Retry Delivery
```
Select "Giao lại"
  ↓
Schedule new delivery date
  ↓
Update customer information (if needed)
  ↓
Re-assign shipper
  ↓
Create new delivery record
  ↓
Original resolution: 'completed'
New delivery: 'waiting_for_delivery'
```

**Use Cases:**
- Customer temporarily unavailable
- Reschedule request
- Address update needed
- Different time preference

## Delivery History and Audit Trail

### History Tracking
Every status change creates a history entry:
```typescript
{
  fromStatus: 'waiting_for_delivery',
  toStatus: 'delivered',
  notes: 'Delivered successfully to customer',
  changedBy: 'user_123',
  createdAt: '2024-01-15T14:30:00Z'
}
```

### Audit Information
- Who made the change
- When the change occurred
- What changed
- Why it changed (notes)
- Complete timeline

### History View
```
┌─────────────────────────────────────────┐
│ LỊCH SỬ GIAO HÀNG                      │
├─────────────────────────────────────────┤
│ 🟡 15/01/2024 10:00 - Staff A          │
│    Tạo giao hàng                        │
│    Chờ giao → Waiting                   │
│                                         │
│ 🔵 15/01/2024 12:00 - Staff A          │
│    Shipper đã lấy hàng                  │
│    Note: Shipper 1 picked up            │
│                                         │
│ 🟢 15/01/2024 14:30 - Staff B          │
│    Giao hàng thành công                 │
│    Waiting → Delivered                  │
│    Note: Confirmed by customer          │
└─────────────────────────────────────────┘
```

## Integration Points

### Order Management
- Delivery linked to order
- Order status updated on delivery status change
- Order cannot be cancelled if delivery in progress

### Customer Management
- Customer contact information
- Delivery address
- Customer history

### Shipper Management
- Shipper assignment
- Performance tracking
- Workload distribution

### Inventory Management
- Re-import updates inventory
- Storage capacity adjustments
- Item status updates

## Notifications

### Customer Notifications
- Delivery scheduled
- Out for delivery
- Delivery successful
- Delivery failed
- Delivery rescheduled

### Internal Notifications
- New delivery created
- Delivery failed (alert)
- Resolution needed
- Delivery completed

## Performance Metrics

### Delivery Metrics
- Total deliveries
- Success rate (%)
- Average delivery time
- Failed delivery rate
- Resolution time

### Shipper Metrics
- Deliveries per shipper
- Success rate per shipper
- Average delivery time
- Customer satisfaction

### Time Analysis
- Peak delivery times
- Busiest days
- Average time to deliver
- Resolution duration

## Best Practices

### Delivery Process
1. Verify customer information
2. Assign reliable shipper
3. Provide tracking number
4. Communicate with customer
5. Confirm delivery promptly

### Failed Delivery Handling
1. Document failure reason clearly
2. Contact customer quickly
3. Evaluate resolution options
4. Process resolution promptly
5. Follow up with customer

### Resolution Selection
- **Re-import**: Quick turnaround needed
- **Return**: Quality/defect issues
- **Retry**: Customer request or temporary issue

## Error Handling

### Common Errors
- **Delivery not found**: Invalid ID
- **Order not ready**: Payment or fulfillment incomplete
- **Customer unreachable**: Contact issues
- **Address invalid**: Wrong or incomplete address

### Recovery Actions
- Update customer information
- Contact customer via phone
- Verify address with customer
- Reschedule delivery
- Cancel if unresolvable

## Security and Access Control

### Permissions
- **View deliveries**: All staff
- **Create delivery**: Warehouse staff, Admin
- **Update status**: Shipper, Warehouse staff, Admin
- **Mark failed**: Shipper, Admin
- **Process resolution**: Admin, Warehouse manager

### Audit Requirements
- All status changes logged
- User actions tracked
- Timestamps recorded
- Reason documentation

## Reporting

### Available Reports
- Delivery success rate
- Failed delivery analysis
- Shipper performance
- Resolution effectiveness
- Time-to-delivery metrics

### Export Options
- CSV export
- Excel export
- PDF reports
- Custom date ranges

## Related Routes
- `/orders` - View linked orders
- `/orders/[id]` - Order details
- `/customers` - Customer information
- `/storages` - Storage for re-import
- `/reports` - Delivery analytics

## Troubleshooting

### Delivery Not Created
- Check order payment status
- Verify order fulfillment
- Ensure no existing delivery
- Review order status

### Status Not Updating
- Check permissions
- Verify delivery ID
- Review validation rules
- Check database connection

### Resolution Failed
- Verify resolution type
- Check storage availability (re-import)
- Confirm shipper availability (retry)
- Review item status

## Future Enhancements

### Planned Features
- GPS tracking integration
- Photo proof of delivery
- Customer signature capture
- Automated shipper assignment
- Route optimization
- Real-time tracking
- SMS notifications
- Rating system
- Delivery time windows
