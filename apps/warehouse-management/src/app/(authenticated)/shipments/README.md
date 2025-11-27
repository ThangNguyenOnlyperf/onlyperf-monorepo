# Shipments Management - `/shipments`

## Purpose
Manage inbound shipments from suppliers, track receiving status, generate QR code labels, and scan items into warehouse storage. Core module for inventory receiving workflow.

## Routes Overview

```
/shipments                    # Shipment list and dashboard
/shipments/new                # Create new shipment
/shipments/[id]               # Shipment details
/shipments/[id]/pdf           # Generate QR code labels (PDF)
/shipments/[id]/scan          # Inbound scanning interface
```

## Features

### Shipment Dashboard (`/shipments`)
- View all shipments with pagination
- Filter by status, date range, supplier
- Search by receipt number
- Shipment metrics (total, pending, received)
- Quick actions (view, edit, scan, generate PDF)

### Create Shipment (`/shipments/new`)
- Select supplier/provider
- Set receipt date and number
- Add multiple products with quantities
- Generate shipment items automatically
- Create QR codes for each item

### Shipment Details (`/shipments/[id]`)
- View shipment information
- See all items grouped by product
- Track scanning progress
- Quick links to PDF and scan pages
- Edit shipment details

### QR Code Generation (`/shipments/[id]/pdf`)
- Generate printable QR code labels
- One label per physical item
- Includes product info and QR code
- PDF download for printing
- Ready to affix to items

### Inbound Scanning (`/shipments/[id]/scan`)
- QR code scanner interface
- Assign storage locations
- Track received items
- Real-time progress updates
- Duplicate scan prevention

## Shipment Lifecycle

```
1. CREATE SHIPMENT
   Status: pending
   - Enter supplier info
   - Add products and quantities
   - Generate shipment items with QR codes
   ↓
2. GENERATE QR LABELS
   - Open /shipments/[id]/pdf
   - Download and print labels
   - Affix labels to physical items
   ↓
3. SCAN ITEMS
   - Open /shipments/[id]/scan
   - Scan each item's QR code
   - Assign storage location
   - Item status: pending → received
   ↓
4. COMPLETE
   Status: received (when all items scanned)
   - Items available for sale
   - Inventory synced to Shopify
```

## Data Models

### Shipment Schema
```typescript
{
  id: string;
  receiptNumber: string;     // Unique receipt number
  receiptDate: Date;          // Date of receipt
  supplierName: string;       // Supplier name
  providerId?: string;        // FK to providers
  status: string;             // 'pending' | 'received'
  notes?: string;
  createdBy?: string;         // User ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Shipment Item Schema
```typescript
{
  id: string;
  shipmentId: string;         // FK to shipments
  productId: string;          // FK to products
  quantity: number;           // Always 1 (one row per item)
  qrCode: string;             // Unique QR code (ABCD1234)
  status: string;             // pending → received → sold
  storageId?: string;         // Assigned during scanning
  scannedAt?: Date;           // When received
  createdAt: Date;
}
```

### Provider Schema
```typescript
{
  id: string;
  type: string;               // 'supplier' | 'customer' | 'both'
  name: string;
  taxCode?: string;
  address?: string;
  telephone: string;
  accountNo?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Technical Details

### Server Actions

**Shipment Management**
```typescript
getShipmentsWithItemsAction(filters, params)  // Paginated list
getShipmentMetricsAction()                    // Dashboard metrics
getShipmentByIdAction(id)                     // Single shipment
getShipmentWithItemsAction(id)                // With items grouped
createShipmentAction(data)                    // Create shipment
updateShipmentAction(id, data)                // Update shipment
deleteShipmentAction(id)                      // Delete shipment
```

**Scanning Actions**
```typescript
scanShipmentItemAction(qrCode, storageId)     // Scan item
getShipmentScanProgressAction(id)             // Scan progress
```

**Provider Actions**
```typescript
getProvidersAction()                          // All providers
createProviderAction(data)                    // Create provider
```

### Component Structure

```
/shipments/page.tsx
  └── ShipmentsDashboardUI
      ├── ShipmentMetricsCards
      ├── ShipmentFilters
      ├── ShipmentsTable
      └── ShipmentModals

/shipments/new/page.tsx
  └── CreateShipmentForm
      ├── SupplierSelection
      ├── ProductSelection
      └── QuantityInputs

/shipments/[id]/page.tsx
  └── ShipmentDetailsPage
      ├── ShipmentInfo
      ├── ItemsGroupedByProduct
      └── ActionButtons

/shipments/[id]/pdf/page.tsx
  └── ShipmentPDFClient
      └── QRCodeLabels (PDF generation)

/shipments/[id]/scan/page.tsx
  └── ShipmentScanUI
      ├── QRScanner
      ├── StorageSelector
      ├── ScanProgress
      └── ScannedItemsList
```

### Validation Schemas

**Shipment Creation**
```typescript
{
  receiptNumber: string (min 1, unique)
  receiptDate: date
  supplierName: string (min 1)
  providerId?: string
  items: array (min 1) [
    {
      productId: string
      quantity: number (min 1)
    }
  ]
  notes?: string
}
```

## Shipment Dashboard (`/shipments`)

### Metrics Cards
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Tổng phiếu   │ Chờ nhập    │ Đã nhập     │ Tổng items   │
│ {total}      │ {pending}   │ {received}  │ {totalItems} │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Filters
- **Search**: Receipt number, supplier name
- **Status**: All, Pending, Received
- **Date Range**: Start date, End date
- **Sort**: Date, Receipt number, Status

### Table Columns
| Số phiếu | Ngày nhập | Nhà cung cấp | Số lượng | Trạng thái | Thao tác |
|----------|-----------|--------------|----------|------------|----------|
| PN001 | 2024-01-15 | Supplier A | 100 | Đã nhập | Xem / PDF / Quét |

### Actions
- **Xem**: View shipment details
- **PDF**: Generate QR labels
- **Quét**: Open scanning interface
- **Sửa**: Edit shipment
- **Xóa**: Delete shipment (if not scanned)

## Create Shipment (`/shipments/new`)

### Form Sections

1. **Shipment Information**
   - Receipt number (auto-generated or manual)
   - Receipt date (date picker)
   - Supplier selection (dropdown + create new)
   - Notes (optional)

2. **Products Selection**
   - Product dropdown with search
   - Quantity input
   - Add multiple products
   - Remove product rows

3. **Summary**
   - Total products
   - Total items
   - Preview before creation

### Create Flow
```
1. Fill shipment info
   ↓
2. Select products and quantities
   ↓
3. Submit form
   ↓
4. System generates:
   - Shipment record (status: pending)
   - N shipmentItems (one per physical item)
   - Unique QR code for each item
   ↓
5. Redirect to shipment details
   ↓
6. User generates PDF and prints labels
```

### Validation Rules
- Receipt number must be unique
- Must have at least one product
- Quantity must be positive integer
- Supplier must be selected

## QR Code Generation (`/shipments/[id]/pdf`)

### PDF Content
Each label contains:
- Product name
- Brand and model
- Color
- QR code (scannable)
- Unique code (text)

### Label Format
```
┌─────────────────────────┐
│ Tennis Racket Pro       │
│ Wilson TR-2024          │
│ Color: Red              │
│                         │
│    ███ ███ ███ ███     │
│    ███ ███ ███ ███     │  ← QR Code
│    ███ ███ ███ ███     │
│                         │
│    ABCD1234             │
└─────────────────────────┘
```

### Usage
1. Open PDF page
2. PDF generated in browser
3. Download or print directly
4. Cut and affix labels to items
5. Labels ready for scanning

### Technical Implementation
- Client-side PDF generation
- QR code library: `qrcode`
- Printable size: configurable
- Multiple labels per page

## Inbound Scanning (`/shipments/[id]/scan`)

### Scanner Interface

**Components**
1. **QR Scanner**
   - Camera-based scanning
   - Manual code entry option
   - Scan success/error feedback
   - Duplicate detection

2. **Storage Selector**
   - Dropdown of available storages
   - Shows capacity and availability
   - Auto-select by priority

3. **Scan Progress**
   - Items scanned / Total items
   - Progress bar
   - Completion status

4. **Scanned Items List**
   - Recently scanned items
   - Product info
   - Storage assignment
   - Timestamp

### Scanning Flow
```
1. Open scanner page
   ↓
2. Point camera at QR code
   ↓
3. System validates:
   - QR code exists
   - Belongs to this shipment
   - Not already scanned
   - Storage has capacity
   ↓
4. If valid:
   - Mark item as received
   - Assign storage
   - Increment storage usedCapacity
   - Sync to Shopify (if enabled)
   - Show success message
   ↓
5. Continue scanning until all items received
   ↓
6. Shipment status → received (auto)
```

### Validation Rules
- QR code must exist in shipmentItems
- Must belong to current shipment
- Status must be 'pending'
- Storage must have available capacity
- No duplicate scans

### Error Handling
- **Invalid QR**: Show error, allow retry
- **Already scanned**: Show warning with details
- **Wrong shipment**: Show which shipment it belongs to
- **No capacity**: Prompt to select different storage

### Auto-complete
- When all items scanned, shipment status → 'received'
- User redirected to shipment details
- Success message displayed

## Shipment Details (`/shipments/[id]`)

### Information Sections

1. **Shipment Header**
   - Receipt number
   - Receipt date
   - Supplier name
   - Status badge
   - Action buttons

2. **Items Summary**
   - Grouped by product
   - Quantity per product
   - Scanned count
   - Status indicators

3. **Action Buttons**
   - **Tạo PDF**: Generate QR labels
   - **Quét hàng**: Open scanner
   - **Sửa**: Edit shipment
   - **Xóa**: Delete shipment

4. **Items Table**
   - Product name
   - QR code
   - Status
   - Storage location
   - Scanned timestamp

### Status Badges
- **Chờ nhập** (Pending): Yellow badge
- **Đã nhập** (Received): Green badge

## Integration Points

### Products (`/products`)
- Shipments create shipmentItems for products
- Stock levels updated on scan
- Available stock calculation

### Storage (`/storages`)
- Storage assigned during scan
- Capacity updated automatically
- Storage utilization tracking

### Shopify (if enabled)
- Inventory synced on item scan
- Stock levels updated in real-time
- Error handling for sync failures

### Search (Typesense)
- Shipments indexed for search
- Fast search by receipt number
- Vietnamese text support

## Best Practices

### Creating Shipments
1. Use unique, sequential receipt numbers
2. Accurate receipt dates
3. Complete supplier information
4. Verify product quantities before submission

### QR Code Labels
1. Print on durable labels
2. Affix securely to items
3. Test scanability before mass printing
4. Keep labels clean and visible

### Scanning
1. Use good lighting
2. Stable camera position
3. Verify each scan
4. Check storage capacity before starting
5. Complete all scans in one session

### Storage Assignment
1. Use priority-based assignment
2. Group similar products
3. Consider picking efficiency
4. Monitor capacity

## Performance Optimization

### Batch Operations
- Bulk QR code generation
- Optimized database queries
- Indexed columns (receiptNumber, status)

### Pagination
- Default: 10 shipments per page
- Efficient queries with DrizzleORM
- URL-based pagination state

### Real-time Updates
- Optimistic UI updates
- Automatic progress calculation
- Efficient re-fetching

## Error Handling

### Common Errors
- **Duplicate receipt number**: Must be unique
- **Invalid product**: Product must exist
- **Scan errors**: QR code validation
- **Storage capacity**: Check before scanning
- **Network issues**: Retry logic

### Recovery Strategies
- Save progress during scanning
- Allow partial shipments
- Resume scanning sessions
- Error logging for debugging

## Related Routes
- `/products` - Product catalog
- `/storages` - Storage locations
- `/outbound` - Selling items
- `/reports` - Shipment analytics
