# Returns and Cancellations Flow

## Overview
This document outlines the future implementation plan for handling returns and cancellations in the warehouse management system.

## Return Flow

### 1. Return Initiation
- **Return Window**: 7 days from sale date
- **Required Information**:
  - Original order number
  - QR codes of items to return
  - Return reason
  - Customer information verification

### 2. Return Process
```
1. Staff scans returned item QR code
2. System validates:
   - Item belongs to specified order
   - Within return window
   - Item not previously returned
3. Staff inspects physical condition
4. System updates status: 'sold' → 'received'
5. Process refund
6. Generate return receipt
```

### 3. Database Changes Required
```sql
-- Returns table
CREATE TABLE returns (
  id TEXT PRIMARY KEY,
  return_number TEXT UNIQUE NOT NULL,
  order_id TEXT REFERENCES orders(id),
  customer_id TEXT REFERENCES customers(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed
  refund_amount INTEGER,
  refund_method TEXT,
  processed_by TEXT REFERENCES user(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Return items table
CREATE TABLE return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT REFERENCES returns(id),
  order_item_id TEXT REFERENCES order_items(id),
  shipment_item_id TEXT REFERENCES shipment_items(id),
  condition TEXT, -- good, damaged, defective
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Status Transitions
- `sold` → `returning` → `received` (successful return)
- `sold` → `returning` → `sold` (return rejected)

## Cancellation Flow

### 1. Order Cancellation Rules
- **Before Processing**: Full cancellation allowed
- **After Processing**: Requires manager approval
- **Time Limit**: Within 24 hours of order creation

### 2. Cancellation Process
```
1. Retrieve order by order number
2. Check cancellation eligibility
3. If items already shipped:
   - Require manager override
   - Document cancellation reason
4. Revert item status: 'sold' → 'received'
5. Mark order as cancelled
6. Generate cancellation receipt
```

### 3. Database Changes Required
```sql
-- Add to orders table
ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN cancelled_by TEXT REFERENCES user(id);
```

## Implementation Components

### UI Components Needed

#### 1. Returns Management Page
- `/app/returns/page.tsx`
- Search orders by number/customer
- Return initiation form
- Return status tracking

#### 2. Return Scanner Component
- Validates QR codes against original order
- Batch scanning for multiple items
- Condition assessment interface

#### 3. Cancellation Modal
- Order lookup
- Cancellation reason form
- Manager approval workflow

### Server Actions Required

#### `returnActions.ts`
```typescript
// Process return
async function processReturn(returnData: ReturnData)

// Validate return eligibility
async function validateReturnEligibility(orderNumber: string, itemIds: string[])

// Update return status
async function updateReturnStatus(returnId: string, status: string)
```

#### `cancellationActions.ts`
```typescript
// Cancel order
async function cancelOrder(orderNumber: string, reason: string)

// Validate cancellation eligibility
async function validateCancellationEligibility(orderNumber: string)

// Revert item status
async function revertItemStatus(itemIds: string[])
```

## Business Rules

### Return Policy
1. **Eligible Items**:
   - Unused condition
   - Original packaging
   - All accessories included

2. **Non-Returnable Items**:
   - Damaged by customer
   - Missing parts
   - Beyond return window

3. **Refund Processing**:
   - Cash: Immediate refund
   - Bank Transfer: 3-5 business days
   - Store credit option available

### Cancellation Policy
1. **Free Cancellation**: Within 2 hours of order
2. **Cancellation Fee**: 10% after 2 hours
3. **Non-Cancellable**: After shipment dispatch

## Reports and Analytics

### Return Metrics
- Return rate by product
- Return reasons analysis
- Average return processing time
- Refund amounts by period

### Cancellation Metrics
- Cancellation rate
- Cancellation reasons
- Time to cancellation
- Revenue impact

## Security Considerations

1. **Authorization Levels**:
   - Staff: Initiate returns/cancellations
   - Manager: Approve high-value returns
   - Admin: Override policies

2. **Audit Trail**:
   - Log all status changes
   - Track who processed each action
   - Timestamp all operations

3. **Fraud Prevention**:
   - Verify customer identity
   - Check return history
   - Flag suspicious patterns

## Future Enhancements

1. **Automated Refunds**: Integration with payment gateway
2. **Exchange Options**: Allow product exchanges
3. **Partial Returns**: Return subset of order items
4. **Return Shipping Labels**: Generate prepaid labels
5. **Customer Portal**: Self-service returns
6. **Mobile App**: Staff mobile return processing

## Implementation Priority

### Phase 1 (MVP)
- Basic return flow
- Manual refund processing
- Simple cancellation

### Phase 2
- Manager approval workflow
- Return metrics dashboard
- Automated notifications

### Phase 3
- Customer self-service
- Advanced analytics
- Integration with accounting

## Testing Checklist

- [ ] Return within window period
- [ ] Return outside window period
- [ ] Partial order return
- [ ] Full order return
- [ ] Cancellation before processing
- [ ] Cancellation after processing
- [ ] Refund calculation accuracy
- [ ] Status transition validation
- [ ] Inventory update verification
- [ ] Report generation