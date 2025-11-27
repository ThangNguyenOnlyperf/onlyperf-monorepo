# Storage Management - `/storages`

## Purpose
Manage warehouse storage locations with capacity tracking and utilization monitoring. Essential foundation for the inventory management system.

## Features

### Storage Location Management
- Create multiple storage locations/warehouses
- Define capacity for each location
- Set priority for automatic storage assignment
- Track real-time utilization
- Edit and delete storage locations

### Capacity Tracking
- **Total Capacity**: Maximum items the storage can hold
- **Used Capacity**: Current number of items stored
- **Utilization Rate**: Percentage of capacity in use
- **Available Space**: Remaining capacity

### Storage Metrics Dashboard
- Total number of storage locations
- Aggregate capacity across all storages
- Total items currently stored
- Overall system utilization rate

### Storage Priority
- Priority-based automatic assignment during inbound scanning
- Higher priority = preferred storage location
- Helps optimize warehouse space utilization

## User Flow

### Creating a Storage Location
```
1. Click "Thêm kho mới" (New Storage)
   ↓
2. Fill in details:
   - Name (e.g., "Kho A", "Tầng 1")
   - Location (address/description)
   - Capacity (max items)
   - Priority (for auto-assignment)
   ↓
3. Submit form
   ↓
4. Storage created and displayed in table
```

### Managing Storage Locations
```
1. View storage list with metrics
   ↓
2. Sort by: name, capacity, utilization
   ↓
3. Actions:
   - Edit: Update details
   - Delete: Remove unused storage
   - View: See details and contents
```

## Data Model

### Storage Table Schema
```typescript
{
  id: string;              // Unique identifier
  name: string;            // Display name
  location: string;        // Physical location
  capacity: number;        // Max items
  usedCapacity: number;    // Current items stored
  priority: number;        // Assignment priority (higher = preferred)
  createdBy: string;       // User ID
  createdAt: Date;
  updatedAt: Date;
}
```

## Technical Details

### Server Actions
- `getStoragesAction()` - Fetch paginated storage list
- `getStorageMetricsAction()` - Get aggregate metrics
- `createStorageAction()` - Create new storage
- `updateStorageAction()` - Update storage details
- `deleteStorageAction()` - Delete storage (if empty)

### Client Components
```
/storages/page.tsx                  # Server page
  └── StorageClientUI               # Main client component
      ├── StorageMetricsCards       # Metrics display
      ├── StorageTable              # Data table
      └── StorageModals             # Create/Edit modals
          └── StorageForm           # Reusable form
```

### Pagination
- Default: 10 items per page
- Supports sorting by multiple columns
- URL-based pagination state

### Validation (Zod Schema)
```typescript
{
  name: string (min 1 char)
  location: string (min 1 char)
  capacity: number (min 1)
  priority: number (optional, default 0)
}
```

## Integration with Other Features

### Inbound Scanning (`/shipments/[id]/scan`)
- Storage location assigned during item scanning
- `usedCapacity` incremented automatically
- Capacity validation prevents overflow

### Outbound Operations
- `usedCapacity` decremented when items sold
- Real-time capacity updates

### Storage Assignment Logic
1. Filter storages with available capacity
2. Sort by priority (descending)
3. Select highest priority with space
4. If all full → show error

## Business Rules

### Capacity Management
- Cannot exceed defined capacity
- Must have available space to receive items
- Warning shown when utilization > 90%

### Storage Deletion
- Can only delete if `usedCapacity` = 0
- System prevents deletion of storages with items
- Archive option for inactive storages

### Priority Assignment
- Higher number = higher priority
- Priority 0 = lowest priority
- Default priority: 0

## UI Components

### Metrics Cards
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ Tổng số kho         │ Tổng sức chứa      │ Đã sử dụng         │
│ {totalStorages}     │ {totalCapacity}     │ {usedCapacity}      │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### Storage Table
| Tên | Vị trí | Sức chứa | Đã dùng | Tỷ lệ | Thao tác |
|-----|--------|----------|---------|-------|----------|
| Kho A | Tầng 1 | 1000 | 750 | 75% | Sửa / Xóa |

### Utilization Indicator
- 0-70%: Green (Safe)
- 71-89%: Yellow (Caution)
- 90-100%: Red (Critical)

## Search and Filters
- Search by name or location
- Filter by utilization range
- Sort by any column

## API Endpoints (Server Actions)

### GET Storages
```typescript
getStoragesAction(params: PaginationParams)
→ Returns: PaginatedResult<Storage[]>
```

### GET Metrics
```typescript
getStorageMetricsAction()
→ Returns: {
  totalStorages: number
  totalCapacity: number
  totalUsedCapacity: number
  utilizationRate: number
}
```

### CREATE Storage
```typescript
createStorageAction(data: StorageFormData)
→ Returns: ActionResult with new storage
```

### UPDATE Storage
```typescript
updateStorageAction(id: string, data: StorageFormData)
→ Returns: ActionResult with updated storage
```

### DELETE Storage
```typescript
deleteStorageAction(id: string)
→ Returns: ActionResult (success/failure)
```

## Best Practices

### Setup Recommendations
1. Create storages before products
2. Use clear naming conventions (e.g., "Warehouse A", "Floor 1", "Section B")
3. Set realistic capacity based on physical space
4. Assign priorities based on picking efficiency

### Capacity Planning
- Monitor utilization regularly
- Add new storages before reaching 100%
- Consider physical constraints (aisles, shelving)

### Organization
- Group related products in same storage
- Higher priority for frequently accessed areas
- Lower priority for overflow/bulk storage

## Error Handling

### Common Errors
- **Capacity exceeded**: Cannot receive items beyond capacity
- **Duplicate name**: Storage names should be unique
- **Storage in use**: Cannot delete storage with items
- **Invalid capacity**: Capacity must be positive number

## Related Routes
- `/shipments/[id]/scan` - Assign storage during inbound
- `/products` - View products by storage location
- `/reports` - Storage utilization reports
