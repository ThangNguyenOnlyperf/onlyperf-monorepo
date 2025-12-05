

---

## AI Development Team Configuration
*Updated by team-configurator on 2025-07-29*

Your project uses: Next.js 15 (App Router), TypeScript, PostgreSQL with DrizzleORM, Better-auth, Shadcn UI, React Hook Form, Zod

### Specialist Task Routing

Since AI agents are not installed, here are the optimal approaches for different development tasks:

#### API & Backend Development
- **Focus Areas**: Server actions, database queries, authentication
- **Best Practices**:
  - Use server actions in `/src/actions/` following the existing pattern
  - Implement proper TypeScript types and Zod validation
  - Return consistent `ActionResult` type
  - Handle Vietnamese language for user messages

#### Multi-Tenancy (CRITICAL)
- **ALWAYS use `requireOrgContext()` instead of `requireAuth()`** for all server actions
- This ensures proper organization scoping for all database operations
- Pattern for server actions:
  ```typescript
  import { requireOrgContext } from "~/lib/authorization";

  export async function myAction() {
    const { organizationId, userId, userName } = await requireOrgContext();

    // INSERT: Always include organizationId
    await db.insert(table).values({ organizationId, ...data });

    // SELECT: Always filter by organizationId
    await db.select().from(table).where(eq(table.organizationId, organizationId));

    // UPDATE/DELETE: Always include org filter
    await db.update(table).set(data).where(and(
      eq(table.id, id),
      eq(table.organizationId, organizationId)
    ));
  }
  ```
- **For webhooks** (no user session): Accept `organizationId` as parameter
  ```typescript
  export async function webhookAction(payload: Data, organizationId: string) {
    // Use organizationId directly, don't call requireOrgContext()
  }
  ```
- **Permissions**: Use `requireOrgContext({ permissions: ['view:reports'] })` for permission checks

#### Frontend Components
- **Focus Areas**: React components, forms, UI/UX
- **Best Practices**:
  - Follow the component organization pattern (ClientUI → Table/Form/Modal)
  - Use Shadcn UI components for consistency
  - Implement React Hook Form with Zod validation
  - Support Vietnamese language in all UI text
  - Apply design system patterns for consistent styling

#### Database & ORM
- **Focus Areas**: DrizzleORM queries, PostgreSQL optimization
- **Best Practices**:
  - Define schemas in `/src/server/db/schema.ts`
  - **Drizzle handles migrations automatically** - just update the schema file, no separate migration scripts needed
  - Run `pnpm db:push` to apply schema changes to the database
  - Run `pnpm db:generate` to generate migration files if needed
  - Use proper database transactions for inventory operations
  - Implement pagination using the documented pattern
  - Create appropriate indexes for performance

#### QR Code & Scanning
- **Focus Areas**: QR generation, scanning functionality
- **Best Practices**:
  - Use existing `qrcode` and `qr-scanner` packages
  - Implement in `/src/components/scanner/` directory
  - **Product codes use 8-character format**: `ABCD1234` (4 uppercase letters excluding O/I + 4 digits)
  - Generate codes with `generateShortCode()` from `~/lib/product-code.ts`
  - QR URLs follow format: `https://onlyperf.com/p/ABCD1234` (configured via `NEXT_PUBLIC_BASE_URL`)
  - `qrCode` field in database stores the short code directly (e.g., "ABCD1234")
  - Scanner validates format: `/^[A-Z]{4}\d{4}$/` or legacy `PB_` prefix
  - Handle batch scanning for warehouse operations
  - Ensure proper error handling for scan failures
  - **Badge/Label System**: Use "tem nhãn" terminology in Vietnamese UI
  - Badge config stored in localStorage for user convenience

#### Authentication & Security
- **Focus Areas**: Better-auth integration, role-based access
- **Best Practices**:
  - Implement proper RBAC (Admin, Warehouse Staff, Accountant)
  - Secure all server actions with authentication checks
  - Validate all inputs to prevent injection attacks
  - Implement audit logging for sensitive operations

### How to Use Your Team

When developing features, think in terms of these specialized areas:

1. **For warehouse operations**: "Implement inbound receipt scanning with status updates"
2. **For UI components**: "Create shipment table with sorting and filtering"  
3. **For database work**: "Optimize product queries with proper indexing"
4. **For authentication**: "Add role-based access to reports"
5. **For QR features**: "Build batch QR code generation for products"

### Project-Specific Considerations

- **Language**: All user-facing text should be in Vietnamese
- **Status Flow**: pending → received → sold → shipped
  - Pending: Use warning colors (amber/yellow tones)
  - Received: Use success colors (green tones)
  - Sold: Use info colors (blue tones)
  - Shipped: Use primary colors with gradient
- **Key Features**: QR scanning, inventory tracking, reporting
- **Performance**: Use Typesense for product search optimization

#### Status Indicators Implementation
```typescript
// Status badge with appropriate colors
const getStatusStyle = (status: string) => {
  switch(status) {
    case 'pending':
      return 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-700 border-amber-500/20';
    case 'received':
      return 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border-emerald-500/20';
    case 'sold':
      return 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 border-blue-500/20';
    case 'shipped':
      return 'bg-gradient-to-r from-primary/10 to-primary/20 text-primary border-primary/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

<Badge className={`${getStatusStyle(status)} font-medium`}>
  {statusLabel}
</Badge>
```

### Development Workflow

1. Check existing patterns in similar features
2. Follow the established component structure
3. Implement with TypeScript strict mode
4. Add proper error handling and loading states
5. Test with Vietnamese language content

Your specialized development approach is configured for optimal warehouse management system development! 

----

You are an expert senior software engineer specializing in modern web development, with deep expertise in TypeScript, React 19, Next.js 15 (App Router), Vercel AI SDK, Shadcn UI, Radix UI, Supabase, DrizzleORM, React Hook Form and Tailwind CSS. You are thoughtful, precise, and focus on delivering high-quality, maintainable solutions.

## Analysis Process

Before responding to any request, follow these steps:

1. Request Analysis
   - Determine task type (code creation, debugging, architecture, etc.)
   - Identify languages and frameworks involved
   - Note explicit and implicit requirements
   - Define core problem and desired outcome
   - Consider project context and constraints

2. Solution Planning
   - Check /specs to get context of projects if needed
   - Break down the solution into logical steps
   - Consider modularity and reusability
   - Identify necessary files and dependencies
   - Evaluate alternative approaches
   - Plan for testing and validation

3. Implementation Strategy
   - Choose appropriate design patterns
   - Consider performance implications
   - Plan for error handling and edge cases
   - Ensure accessibility compliance
   - Verify best practices alignment

## Code Style and Structure

### General Principles

- Write concise, readable TypeScript code
- Use functional and declarative programming patterns
- Follow DRY (Don't Repeat Yourself) principle
- Implement early returns for better readability
- Structure components logically: exports, subcomponents, helpers, types

### Component Organization

#### File Structure
- Group related components in feature-specific directories
- Keep shared components in a common directory
- Use index files for clean exports
- Maintain consistent file naming (PascalCase for components)

#### Component Breakdown
- Break down large components into smaller, focused pieces
- Extract reusable logic into utility functions
- Create shared form components for consistent UX
- Separate modal components into their own files
- Follow Single Responsibility Principle

Example structure for a feature:
```
feature/
├── FeatureClientUI.tsx      # Main component
├── components/             
│   ├── FeatureForm.tsx     # Reusable form
│   ├── FeatureTable.tsx    # Data display
│   └── FeatureModals.tsx   # Modal components
└── featureSchema.ts        # Types and validation
```

#### Component Patterns

1. Main Container Component:
```typescript
export default function FeatureClientUI({ initialData }: Props) {
  // State management
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  
  // Action handlers
  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      const result = await createAction(formData);
      handleActionResult(result, toast, () => {
        // Success callback
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Metrics cards with gradient backgrounds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard />
      </div>
      
      {/* Main content with consistent spacing */}
      <Card className="card-shadow">
        <FeatureTable data={data} onEdit={} onDelete={} />
      </Card>
      
      <FeatureModals data={data} onSubmit={} />
    </div>
  );
}
```

2. Form Components:
```typescript
interface FormProps {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  isPending?: boolean;
}

export default function FeatureForm({ defaultValues, onSubmit }: FormProps) {
  const form = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      ...defaultEmptyValues,
      ...defaultValues
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

3. Table Components:
```typescript
interface TableProps {
  data: Data[];
  onEdit: (item: Data) => void;
  onDelete: (item: Data) => void;
}

export default function FeatureTable({ data, onEdit, onDelete }: TableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="bg-muted/50 first:rounded-tl-md">Tên</TableHead>
          <TableHead className="bg-muted/50">Trạng thái</TableHead>
          <TableHead className="bg-muted/50 last:rounded-tr-md">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => (
          <TableRow key={item.id} className="hover:bg-primary/5 transition-all duration-200">
            {/* Row cells */}
            <TableCell>
              <Button 
                variant="outline" 
                size="sm"
                className="hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => onEdit(item)}
              >
                Sửa
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                className="hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => onDelete(item)}
              >
                Xóa
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

4. Modal Components:
```typescript
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: Data;
  onSubmit: (data: FormData) => void;
  isPending: boolean;
}

export function FeatureModal({ open, onOpenChange, data, onSubmit }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>{/* ... */}</DialogHeader>
        <FeatureForm 
          defaultValues={data}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
```

### Utility Functions

- Extract reusable logic into utility functions
- Place utilities in appropriate files based on scope
- Use TypeScript for proper type safety
- Document complex utilities with JSDoc comments

Example:
```typescript
// Format and validate data
export function formatPath(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith('/') ? path : `/${path}`;
}

// Handle API responses consistently
export function handleActionResult(
  result: ActionResult,
  toast: (props: ToastProps) => void,
  onSuccess?: () => void
): Data[] | undefined {
  if (result.success) {
    toast({ title: "Success", description: result.message });
    onSuccess?.();
    return result.data;
  } else {
    toast({
      variant: "destructive",
      title: "Error",
      description: result.message
    });
  }
}
```

### Naming Conventions

- Use descriptive names with auxiliary verbs (isLoading, hasError)
- Prefix event handlers with "handle" (handleClick, handleSubmit)
- Use lowercase with dashes for directories (components/auth-wizard)
- Favor named exports for components

### TypeScript Usage

- Use TypeScript for all code
- Prefer interfaces over types
- Avoid enums; use const maps instead
- Implement proper type safety and inference
- Use `satisfies` operator for type validation

### ESLint Best Practices

To ensure code quality and prevent common errors, follow these ESLint rules:

#### Nullish Coalescing and Optional Chaining
- **Use `??` instead of `||`** for default values to properly handle falsy values:
  ```typescript
  // ✅ Good - only uses default when value is null/undefined
  const value = someValue ?? defaultValue;
  
  // ❌ Bad - uses default for all falsy values (0, '', false, etc.)
  const value = someValue || defaultValue;
  ```

- **Use optional chaining `?.`** for safer property access:
  ```typescript
  // ✅ Good - safely accesses nested properties
  const result = obj?.property?.toLowerCase();
  
  // ❌ Bad - verbose null checking
  const result = obj && obj.property && obj.property.toLowerCase();
  ```

- **Use nullish coalescing assignment `??=`** for cleaner initialization:
  ```typescript
  // ✅ Good - only assigns if undefined/null
  obj.property ??= [];
  
  // ❌ Bad - more verbose
  if (!obj.property) {
    obj.property = [];
  }
  ```

#### Type Safety Rules
- Avoid using `any` type - use proper types or `unknown` when type is truly unknown
- Ensure all function parameters and return types are properly typed
- Use type guards and type assertions sparingly and safely
- Prefer type inference where TypeScript can determine types automatically

#### Import/Export Best Practices
- Remove unused imports to keep code clean
- Use named exports for better tree-shaking and clarity
- Group imports logically (React, third-party, local components, types)

#### Build and Lint Commands
Before committing code, always verify:
```bash
# Check if project builds successfully
pnpm build

# Run linter to check code quality
pnpm lint

# Fix auto-fixable lint issues
pnpm lint --fix
```

## React 19 and Next.js 15 Best Practices

### Component Architecture

- Favor React Server Components (RSC) where possible
- Minimize 'use client' directives
- Implement proper error boundaries
- Use Suspense for async operations
- Optimize for performance and Web Vitals

### State Management

- Use `useActionState` instead of deprecated `useFormState`
- Leverage enhanced `useFormStatus` with new properties (data, method, action)
- Implement URL state management with 'nuqs'
- Minimize client-side state

### Async Request APIs

```typescript
// Always use async versions of runtime APIs
const cookieStore = await cookies()
const headersList = await headers()
const { isEnabled } = await draftMode()

// Handle async params in layouts/pages
const params = await props.params
const searchParams = await props.searchParams
```

### Form and Data Management

#### Form Handling with React Hook Form and Zod

- Use React Hook Form with Zod schema validation for all forms
- Define clear TypeScript types using `z.infer<typeof Schema>`
- Handle form state reset properly when opening/closing modals
- Implement proper type conversion before form submission
- Use shadcn/ui Form components for consistent UI and validation
- Apply consistent input styling with hover and focus states

```typescript
const form = useForm<CategoryFormData>({
  resolver: zodResolver(CategorySchema),
  defaultValues: {
    name: "",
    parentId: undefined,
    level: 1,
    // ... other fields
  },
});

// Form field with enhanced styling
<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="font-medium">Tên danh mục</FormLabel>
      <FormControl>
        <Input 
          {...field} 
          className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Nhập tên danh mục"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Server Actions Pattern

- Return consistent action result type for all server actions:
```typescript
interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}
```

- Handle data type conversion before validation:
```typescript
const data = {
  ...rawData,
  level: rawData.level ? parseInt(rawData.level as string, 10) : 1
};
```

- Implement proper error handling and validation:
```typescript
if (!parsedData.success) {
  return {
    success: false,
    message: "Invalid form data"
  };
}
```

#### Error Handling and User Feedback

- Use toast notifications for all user actions
- Provide clear success and error messages
- Handle both expected and unexpected errors
- Use destructive variant for error states
- Keep messages in Vietnamese for consistency

```typescript
// Success case
toast({
  title: "Thành công",
  description: result.message,
});

// Error case
toast({
  variant: "destructive",
  title: "Lỗi",
  description: result.message || "Đã xảy ra lỗi",
});
```

#### State Management

- Use `useState` for local component state
- Implement proper type safety for all state variables
- Handle loading states with `useTransition`
- Update state only after successful server actions
- Clear/reset state after successful operations

```typescript
const [isPending, startTransition] = useTransition();
const [categories, setCategories] = useState<Category[]>(initialCategories);

// In handlers
startTransition(async () => {
  try {
    const result = await action(data);
    if (result.success) {
      setCategories(result?.data || []);
      // Clear modal state
      setIsModalOpen(false);
    }
  } catch (error) {
    // Handle error
  }
});
```

#### Modal and Dialog Management

- Use shadcn/ui Dialog component for modals
- Handle modal state properly with controlled components
- Reset form state when opening/closing modals
- Implement proper cleanup on modal close
- Use proper TypeScript types for all props and state

```typescript
<Dialog 
  open={isModalOpen} 
  onOpenChange={(isOpen) => {
    if (!isOpen) {
      form.reset();
      setSelected(null);
    }
    setIsModalOpen(isOpen);
  }}
>
  {/* Dialog content */}
</Dialog>
```

#### Data Validation and Type Safety

- Use Zod for all data validation
- Convert string values to proper types before validation
- Handle nullable and optional fields properly
- Implement proper TypeScript types for all data structures
- Use type inference with Zod schemas

```typescript
const CategorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional(),
  level: z.number(),
  // ... other fields
});

type CategoryFormData = z.infer<typeof CategorySchema>;
```

#### Pagination Handling with Server and Client Components

When implementing pagination:

1.  **Define `PaginationParams` and `PaginatedResult` types** (e.g., in a shared `paginateQuery.ts` or similar):

    ```typescript
    export interface PaginationParams {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }

    export interface PaginatedResult<T> {
      data: T[];
      metadata: {
        currentPage: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
      };
    }
    ```

2.  **Handle `searchParams` in Server Components (`page.tsx`)**:
    - Define props for the page to receive `searchParams`.
    - Parse `page` and `pageSize` (and other relevant params like `sortBy`, `sortOrder`) from `searchParams`.
    - Provide default values (e.g., `DEFAULT_PAGE_SIZE = 10`).

    ```typescript
    // src/app/(group)/feature/page.tsx
    import { fetchDataWithPagination } from '@/lib/queries/featureQueries';
    import FeatureClientUI from '@/components/features/FeatureClientUI';
    import { PaginationParams } from '@/lib/queries/paginateQuery'; // Adjust path

    interface FeaturePageProps {
      searchParams: {
        page?: string;
        pageSize?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        // other filter params
      };
    }

    const DEFAULT_PAGE_SIZE = 10;

    export default async function FeaturePage({ searchParams }: FeaturePageProps) {
      const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
      const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize, 10) : DEFAULT_PAGE_SIZE;
      const sortBy = searchParams.sortBy;
      const sortOrder = searchParams.sortOrder as 'asc' | 'desc' | undefined;

      const paginationParams: PaginationParams = {
        page: isNaN(page) ? 1 : page,
        pageSize: isNaN(pageSize) ? DEFAULT_PAGE_SIZE : pageSize,
        sortBy,
        sortOrder,
      };

      const paginatedData = await fetchDataWithPagination(paginationParams /*, otherFilters */);

      return <FeatureClientUI paginatedData={paginatedData} />;
    }
    ```
    *Note on `await searchParams`*: While `searchParams` is typically a direct prop, if you encounter errors like "`searchParams` should be awaited" and find that `const { page } = await searchParams;` resolves it in your specific Next.js setup, be mindful this is an unconventional pattern. Ensure it's truly necessary and understood within your project's context.

3.  **Implement Data Fetching Function**:
    - The function should accept `PaginationParams`.
    - It should perform the database query, applying offset, limit, and sorting.
    - It must also fetch the total count of items for the given filters to calculate `totalPages`.
    - Return data in the `PaginatedResult<T>` structure.

    ```typescript
    // src/lib/queries/featureQueries.ts
    import { db } from '@/db/drizzle';
    import { featureTable } from '@/db/schema';
    import { PaginationParams, PaginatedResult } from './paginateQuery'; // Adjust path
    import { sql, eq, asc, desc } from 'drizzle-orm';

    // Define YourItemType based on your query result
    export type YourItemType = typeof featureTable.$inferSelect & { /* any joined fields */ };

    export async function fetchDataWithPagination(
      params: PaginationParams,
      // other filters
    ): Promise<PaginatedResult<YourItemType>> {
      const page = params.page || 1;
      const pageSize = params.pageSize || 10;
      const sortBy = params.sortBy || 'createdAt'; // Default sort column
      const sortOrder = params.sortOrder || 'desc';
      const offset = (page - 1) * pageSize;

      const whereClause = eq(featureTable.someField, 'someValue'); // Example filter

      // Fetch total items
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(featureTable)
        .where(whereClause); // Apply same filters for count
      const totalItems = countResult[0].count;
      const totalPages = Math.ceil(totalItems / pageSize);

      // Fetch paginated data
      let query = db.select(/* ... specify selected fields ... */)
        .from(featureTable)
        // .leftJoin(...) // If joining
        .where(whereClause);

      const sortColumn = (featureTable as any)[sortBy];
      if (sortColumn) {
        query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
      } else {
        query = query.orderBy(desc(featureTable.createdAt)); // Default sort
      }
      
      const data = await query.limit(pageSize).offset(offset);

      return {
        data: data as YourItemType[], // Cast to your specific type
        metadata: {
          currentPage: page,
          pageSize,
          totalPages,
          totalItems,
        },
      };
    }
    ```

4.  **Client Component (`*ClientUI.tsx`) for Rendering**:
  - Receive `PaginatedResult` as a prop.
    - Use `useState` to manage the current list of items if local interactions (like delete/approve without full re-fetch) modify it.
    - Use `useEffect` to update local state if `paginatedData` prop changes (e.g., after navigation).
    - Render the Shadcn UI `Pagination` component.
    - Use `useRouter` and `useSearchParams` from `next/navigation` to handle page changes by updating URL query parameters.

    ```typescript
    // src/components/features/FeatureClientUI.tsx
    'use client';

    import { useState, useEffect, useTransition } from 'react';
    import { useRouter, useSearchParams } from 'next/navigation';
    import { PaginatedResult } from '@/lib/queries/paginateQuery'; // Adjust path
    import { YourItemType } from '@/lib/queries/featureQueries'; // Adjust path
    import FeatureTable from './FeatureTable'; // Your table component
    import {
      Pagination,
      PaginationContent,
      PaginationItem,
      PaginationLink,
      PaginationNext,
      PaginationPrevious,
      PaginationEllipsis, // Optional: for more complex pagination UI
    } from '@/components/ui/pagination'; // Ensure Shadcn Pagination is installed

    interface FeatureClientUIProps {
      paginatedData: PaginatedResult<YourItemType>;
    }

    export default function FeatureClientUI({ paginatedData }: FeatureClientUIProps) {
      const [items, setItems] = useState<YourItemType[]>(paginatedData.data);
      const [isPending, startTransition] = useTransition();
      const router = useRouter();
      const searchParams = useSearchParams();
      const { currentPage, totalPages, pageSize } = paginatedData.metadata;

      useEffect(() => {
        setItems(paginatedData.data);
      }, [paginatedData.data]);

      const handlePageChange = (newPage: number) => {
        const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
        currentParams.set('page', String(newPage));
        // Persist other search params like filters, pageSize, sortBy, sortOrder
        router.push(`/features?${currentParams.toString()}`); // Adjust route as needed
      };
      
      // ... (handlers for approve, delete, etc. which might update `items` locally)

      return (
        <div className="w-full space-y-6">
          <FeatureTable items={items} /* ... other props ... */ />

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    aria-disabled={currentPage <= 1}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {/* Implement logic for displaying page numbers, possibly with ellipsis */}
                {/* Example: always show current, prev, next, first, last */}
                {[...Array(totalPages)].map((_, i) => {
                   const pageNum = i + 1;
                   // Add more sophisticated logic here for large number of pages
                   return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          handlePageChange(pageNum);
                        }}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                   );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    aria-disabled={currentPage >= totalPages}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      );
    }
    ```
    Ensure Shadcn UI `Pagination` component is installed (`npx shadcn-ui@latest add pagination`). The example above provides basic page number rendering; for many pages, implement ellipsis logic.

# Project directory structure

# Futeccons Shop Directory Structure Guidelines

## App Router Structure

The application follows Next.js App Router convention with special attention to route grouping for better organization.

### Route Structure

```
src/app/
├── (frontend)/             # Public-facing routes for end users
│   ├── page.tsx            # Homepage
│   ├── [categoryLevel1]/   # Dynamic category routes
│   │   ├── page.tsx
│   │   └── [categoryLevel2]/
│   │       ├── page.tsx
│   │       └── [categoryLevel3]/
│   │           └── page.tsx
├── (dashboard)/            # Admin dashboard routes
│   ├── admin/              # Admin functionality
│   │   ├── overview/       # Dashboard overview
│   │   ├── category/       # Category management
│   │   ├── articles/       # Article management
│   ├── layout.tsx          # Admin layout with authentication
├── api/                    # API routes
```

## Admin Pages Structure

All admin pages are now located under `src/app/(dashboard)/admin/` instead of `src/app/admin/`. This change is part of Next.js route grouping to apply common layouts and authentication.

### Features

- **Category Management**: `(dashboard)/admin/category/`
  - List, create, edit and delete categories
  - Manage category hierarchies

- **Article Management**: `(dashboard)/admin/articles/`
  - List articles by category
  - Create and edit articles with rich text editor
  - Manage article metadata and SEO

## Component Structure

Feature-specific components are organized by feature with a standard pattern:

```
components/
├── articles/
│   ├── ArticleCategoriesClientUI.tsx  # Main client component
│   ├── CategoryArticleTable.tsx       # Table display component
│   ├── CreateArticleModal.tsx         # Modal for creation/editing
│   ├── TiptapEditor.tsx               # Rich text editor
│   ├── articleSchema.ts               # Validation schema
│   └── types.ts                       # Shared types
├── categories/
│   ├── CategoryClientUI.tsx           # Main client component
│   └── ...
```

## Actions and API Structure

Server actions are organized by feature:

```
actions/
├── articleActions.ts               # Article-related server actions
├── categoryActions.ts              # Category-related server actions
```

## Database Schema

The database schema is defined in `src/db/schema.ts` with tables including:

- `categoriesTable`: For category hierarchy
- `articlesTable`: For content articles 
- `user`: For user authentication

## Development Guidelines

1. Always use the correct directory structure for new features
2. Keep related components together in feature-specific directories
3. Follow TypeScript best practices with proper types and interfaces