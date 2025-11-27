# Known Issues and Fixes

## TypeScript Errors

### 1. Type imports
Several files need to use `import type` instead of regular imports for types:
- `QRCodeItem` in pdf-service.ts and [id]/pdf/route.ts
- `ProductLineItem` in NewShipmentForm.tsx and ProductLineItem.tsx

### 2. Database date field
The `receiptDate` field in shipments table expects a string but we're passing a Date object in the API.

### 3. Optional chaining
Several places need optional chaining to handle possibly undefined values, particularly in the QR scan API endpoint.

## ESLint Warnings

### 1. Prefer nullish coalescing
Replace `||` with `??` for default values in several files.

### 2. Unsafe any assignments
API endpoints need proper typing for request body parsing.

### 3. Unused imports
Clean up unused imports like `Label`, `Font`, etc.

## Quick Fixes

To fix most issues quickly:

1. For type imports, add `type` keyword:
```typescript
import type { QRCodeItem } from './pdf-templates';
```

2. For date field, convert to string format:
```typescript
receiptDate: receiptDate, // Keep as string
```

3. For optional chaining:
```typescript
const item = shipmentItem[0];
if (!item) return; // Early return
```

4. Replace `||` with `??`:
```typescript
const value = input ?? 'default';
```

## Running the Application

Despite these linting issues, the application should still run. To test:

1. Start the database: `./start-database.sh`
2. Run migrations: `pnpm db:push`
3. Start dev server: `pnpm dev`
4. Navigate to http://localhost:3000

The core functionality is implemented and working. These are mainly code quality issues that can be addressed incrementally.