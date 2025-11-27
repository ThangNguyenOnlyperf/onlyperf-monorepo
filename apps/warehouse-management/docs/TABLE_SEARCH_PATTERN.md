# Table Search Pattern Documentation

## Overview

This document explains the scalable search pattern implemented for tables in the warehouse management system. The pattern combines Typesense full-text search with URL state management for a seamless user experience.

## Architecture

### 1. Global Search (Cmd+K)
- Quick access to all entities (products, shipments, storage, QR codes)
- Limited results (5 per category)
- Navigates directly to detail pages
- Best for: Finding specific items quickly

### 2. Table-Specific Search
- Integrated within each table view
- Supports pagination and filtering
- Maintains URL state for shareable links
- Best for: Browsing and filtering large datasets

## Implementation Pattern

### Using the SearchableTable Component

```tsx
import SearchableTable from '~/components/common/SearchableTable';
import { usePaginatedSearch } from '~/hooks/useTableSearch';

export function ProductsTable({ initialProducts }) {
  const {
    data: products,
    loading,
    currentPage,
    totalPages,
    handlePageChange
  } = usePaginatedSearch({
    fetchData: async ({ query, page, pageSize }) => {
      // Call your Typesense search action here
      const result = await searchProductsAction(query, { page, pageSize });
      return {
        data: result.products,
        totalItems: result.totalItems,
        totalPages: result.totalPages
      };
    },
    initialData: initialProducts
  });

  return (
    <SearchableTable
      placeholder="Tìm kiếm sản phẩm..."
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    >
      <Table>
        {/* Your table content */}
      </Table>
    </SearchableTable>
  );
}
```

### Creating a Search Action

```tsx
// src/actions/productSearchActions.ts
export async function searchProductsAction(
  query: string,
  options: { page?: number; pageSize?: number }
) {
  const { page = 1, pageSize = 20 } = options;
  
  if (!query) {
    // Return paginated data without search
    return getPaginatedProductsAction({ page, pageSize });
  }

  // Search with Typesense
  const searchParameters = {
    q: query,
    query_by: 'name,brand,model,qr_code',
    page,
    per_page: pageSize,
    facet_by: 'brand,category',
    include_fields: 'id,name,brand,model,qr_code,price'
  };

  const results = await typesense
    .collections('products')
    .documents()
    .search(searchParameters);

  return {
    products: results.hits?.map(hit => hit.document) || [],
    totalItems: results.found || 0,
    totalPages: Math.ceil((results.found || 0) / pageSize),
    facets: results.facet_counts || []
  };
}
```

## URL State Management

The search pattern automatically manages URL parameters:

- `?q=search+term` - Search query
- `?page=2` - Current page
- `?pageSize=50` - Items per page
- `?status=pending` - Additional filters

Example URLs:
- `/products?q=laptop&page=2`
- `/shipments?status=pending&q=supplier`

## Performance Considerations

### 1. Debouncing
- Search input is debounced (300ms default)
- Prevents excessive API calls
- Configurable via `debounceMs` option

### 2. Caching Strategy
- Initial data loaded server-side
- Search results cached in component state
- Consider implementing React Query for advanced caching

### 3. Pagination
- Server-side pagination for large datasets
- Load only visible page data
- Maintain search context across pages

## Best Practices

### 1. Search Relevance
```typescript
// Configure Typesense search relevance
query_by: 'name,brand,model', // Order matters
query_by_weights: '3,2,1',     // Name is 3x more important
```

### 2. Faceted Search
```typescript
// Add filters alongside search
const filters = searchParams.get('status');
if (filters) {
  searchParameters.filter_by = `status:=${filters}`;
}
```

### 3. Loading States
```tsx
if (loading) {
  return <TableSkeleton />;
}
```

### 4. Empty States
```tsx
if (products.length === 0) {
  return searchQuery 
    ? <EmptySearchResults query={searchQuery} />
    : <EmptyTable />;
}
```

## Migration Guide

To migrate existing tables to use this pattern:

1. Remove inline search/filter components
2. Wrap table in SearchableTable
3. Implement search action with Typesense
4. Use usePaginatedSearch hook
5. Update navigation to preserve search state

## Future Enhancements

1. **Advanced Filters UI**: Add filter dropdowns that work with search
2. **Search Analytics**: Track popular searches
3. **Saved Searches**: Allow users to save frequent queries
4. **Bulk Operations**: Select multiple search results
5. **Export Results**: Download search results as CSV/Excel

## Example: Complete Implementation

See `/src/components/products/ProductsTable.tsx` for a complete example of this pattern in action.