# Product Management - `/products`

## Purpose
Comprehensive product catalog management with stock tracking, Shopify integration, and detailed product attributes. Central hub for managing all product information.

## Features

### Product Catalog
- Create and manage products with detailed attributes
- Brand management with auto-complete
- Color selection from predefined catalog
- Stock level tracking (pending, received, sold, available)
- Product search and filtering
- Individual product detail pages

### Product Attributes
- **Basic Info**: Name, brand, model
- **Physical Attributes**: Color, size, weight, thickness
- **Material Details**: Material type, composition
- **Handle Specs**: Length, circumference (for tools/equipment)
- **Pricing**: Price in VND
- **QR Code**: Unique product identifier

### Stock Tracking
- **Total Items**: All items for this product
- **Available**: Items ready for sale (status: received)
- **Sold Items**: Completed sales
- **Real-time Updates**: Automatic sync on inbound/outbound

### Shopify Integration (Optional)
- Sync products to Shopify store
- Maintain inventory levels across platforms
- Track sync status and errors
- One-click sync from product details

### Product Metrics
- Total products in catalog
- Total items across all products
- Available items for sale
- Sold items count

## User Flow

### Creating a Product
```
1. Click "Thêm sản phẩm mới" (New Product)
   ↓
2. Fill in product details:
   - Name (e.g., "Tennis Racket Pro")
   - Brand (select or create new)
   - Model (e.g., "TR-2024")
   - Color (select from catalog)
   - Physical attributes (size, weight, etc.)
   - Material specifications
   - Price
   ↓
3. Submit form
   ↓
4. Product created with unique QR code
   ↓
5. (Optional) Sync to Shopify
```

### Syncing to Shopify
```
1. View product details (/products/[id])
   ↓
2. Click "Sync to Shopify"
   ↓
3. System creates:
   - Shopify product
   - Shopify variant
   - Inventory item
   - Links via shopifyProducts table
   ↓
4. Future inventory changes auto-sync
```

## Data Model

### Product Schema
```typescript
{
  id: string;
  name: string;              // Product name
  brand: string;             // Legacy field
  brandId: string;           // FK to brands table
  model: string;             // Model number
  qrCode: string;            // Unique code (ABCD1234)
  description?: string;
  category?: string;
  color: string;             // FK to colors table
  weight?: string;
  size?: string;
  thickness?: string;
  material?: string;
  handleLength?: string;
  handleCircumference?: string;
  price: number;             // Price in VND (integer)
  createdAt: Date;
  updatedAt: Date;
}
```

### Related Tables

**brands**
```typescript
{
  id: string;
  name: string;              // Brand name (unique)
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**colors**
```typescript
{
  id: string;
  name: string;              // Color name (unique)
  hex: string;               // Hex code (e.g., #FF0000)
  createdAt: Date;
  updatedAt: Date;
}
```

**shopifyProducts**
```typescript
{
  productId: string;         // FK to products
  shopifyProductId: string;  // Shopify product GID
  shopifyVariantId: string;  // Shopify variant GID
  shopifyInventoryItemId?: string;
  lastSyncedAt?: Date;
  lastSyncStatus: string;    // pending, success, error
  lastSyncError?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Technical Details

### Server Actions

**Product Management**
```typescript
getProductsWithStockAction(params)  // Paginated list with stock
getProductMetricsAction()           // Aggregate metrics
createProductAction(data)           // Create new product
updateProductAction(id, data)       // Update product
deleteProductAction(id)             // Delete product
```

**Brand Management**
```typescript
getBrandsAction()                   // All brands
createBrandAction(data)             // Create brand
```

**Color Management**
```typescript
getColorsAction()                   // All colors
```

### Client Components
```
/products/page.tsx                  # Server page
  └── ProductsClientUI              # Main client
      ├── ProductMetricsCards       # Metrics
      ├── ProductTable              # Data table
      └── ProductModals             # CRUD modals
          └── ProductForm           # Form component

/products/[id]/page.tsx             # Product details
  └── ProductDetailPage             # Detail view
      ├── ProductInfo               # Basic info
      ├── StockSummary              # Stock levels
      ├── ShopifySync               # Sync controls
      └── ItemHistory               # Item list
```

### Validation (Zod Schema)
```typescript
{
  name: string (min 1)
  brandId: string (min 1)
  model: string (min 1)
  color: string (min 1)
  price: number (min 0)
  weight?: string
  size?: string
  thickness?: string
  material?: string
  handleLength?: string
  handleCircumference?: string
  description?: string
  category?: string
}
```

### QR Code Format
- **Format**: `ABCD1234` (8 characters)
- **Letters**: A-Z excluding O and I (to avoid confusion)
- **Digits**: 0-9
- **Total combinations**: 331,776,000 unique codes
- **Collision checking**: Automatic retry on duplicates

## Shopify Integration

### Configuration
```env
SHOPIFY_ENABLED=true              # Enable/disable integration
SHOPIFY_STORE_DOMAIN=...
SHOPIFY_ADMIN_API_ACCESS_TOKEN=...
SHOPIFY_API_VERSION=2025-04
SHOPIFY_LOCATION_ID=...           # Warehouse location
```

### Sync Flow
```
1. Product created in warehouse system
   ↓
2. User clicks "Sync to Shopify"
   ↓
3. System calls Shopify Admin API:
   - Create product
   - Create variant (with SKU = productId)
   - Get inventory item ID
   - Set inventory level
   ↓
4. Save sync data to shopifyProducts table
   ↓
5. Future stock changes auto-sync inventory levels
```

### Inventory Sync
- **Inbound scanning**: Increment Shopify inventory
- **Outbound scanning**: Decrement Shopify inventory
- **Real-time updates**: Immediate sync on stock changes
- **Error handling**: Retry logic + error logging

### Sync Status
- `pending`: Not yet synced
- `success`: Successfully synced
- `error`: Sync failed (check lastSyncError)

## Stock Calculation

### Available Stock
```sql
SELECT COUNT(*)
FROM shipmentItems
WHERE productId = ?
  AND status = 'received'
```

### Sold Items
```sql
SELECT COUNT(*)
FROM shipmentItems
WHERE productId = ?
  AND status = 'sold'
```

### Total Items
```sql
SELECT COUNT(*)
FROM shipmentItems
WHERE productId = ?
```

## UI Components

### Metrics Cards
```
┌───────────────────┬───────────────────┬───────────────────┬───────────────────┐
│ Tổng sản phẩm     │ Tổng số lượng     │ Còn hàng          │ Đã bán           │
│ {totalProducts}   │ {totalItems}      │ {availableItems}  │ {soldItems}      │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┘
```

### Product Table
| Tên | Thương hiệu | Model | Màu | Giá | Tồn kho | Thao tác |
|-----|-------------|-------|-----|-----|---------|----------|
| Tennis Racket | Wilson | TR-2024 | Red | 1,500,000đ | 25/30 | Xem / Sửa / Xóa |

### Color Display
- Visual color swatch with hex value
- Color name in Vietnamese
- Consistent color selection UI

## Features in Detail

### Brand Management
- Auto-complete dropdown
- Create new brands inline
- Brand-product relationship
- Brand-based filtering

### Color Catalog
- Pre-defined color list
- Consistent color selection
- Visual color picker
- Hex code storage for display

### Price Handling
- Stored as integer (VND)
- No decimal issues
- Display formatted with commas
- Price history tracking

### Product Search
- Search by name, brand, model
- Filter by color, brand
- Sort by any column
- Vietnamese text support

## Product Detail Page (`/products/[id]`)

### Information Sections
1. **Product Overview**
   - All attributes
   - QR code display
   - Edit/Delete actions

2. **Stock Summary**
   - Available items
   - Sold items
   - Storage locations

3. **Shopify Integration**
   - Sync status
   - Sync button
   - Error messages
   - Last sync timestamp

4. **Item History**
   - All shipment items for this product
   - QR codes
   - Status history
   - Storage locations

## Best Practices

### Product Creation
1. Create brands and colors first
2. Use consistent naming conventions
3. Fill in all relevant attributes
4. Set accurate pricing
5. Sync to Shopify after verification

### Brand Management
- Use official brand names
- Avoid duplicates
- Maintain brand descriptions
- Keep brand list organized

### Color Catalog
- Use standard color names
- Maintain hex codes for display
- Add colors as needed
- Keep color list manageable

### Pricing
- Store prices in VND without decimals
- Update prices centrally (not per-item)
- Track price history for reporting

## Integration Points

### Inbound (`/shipments/[id]/scan`)
- Scan creates shipmentItems linked to product
- Increments available stock
- Syncs to Shopify if enabled

### Outbound (`/outbound`)
- Scan finds product by QR code
- Displays product info and price
- Decrements stock on sale

### Fulfillment (`/fulfillment`)
- Links products to Shopify orders
- Allocates stock for online orders
- Syncs fulfillment to Shopify

## Error Handling

### Common Errors
- **Duplicate QR code**: Automatic retry with new code
- **Invalid brand**: Brand must exist
- **Invalid color**: Color must exist
- **Price validation**: Must be non-negative
- **Shopify sync failure**: Logged for retry

### Shopify Integration Errors
- **Missing credentials**: Check environment variables
- **API errors**: Check Shopify admin access
- **Network issues**: Retry with exponential backoff
- **Invalid product data**: Validate before sync

## Related Routes
- `/shipments` - Inbound inventory for products
- `/outbound` - Sell products
- `/fulfillment` - Fulfill online product orders
- `/orders` - View product sales history
- `/reports/products` - Product analytics
