# Collection Type Filtering Guide

## Overview

This guide explains how to configure and use collection type filtering in your Shopify-based e-commerce application. The collection type filtering system allows you to control which collections appear in different contexts by using a metafield with comma-separated values.

## What is Collection Type Filtering?

Collection type filtering is a mechanism that uses the `custom.type` metafield on Shopify collections to determine where and how collections should be displayed. This system supports multiple types per collection by using comma-separated values.

### Example Use Cases

- **Category Collections**: Collections that should appear in `/collections/` navigation
- **Homepage Collections**: Collections featured on the homepage
- **Special Purpose Collections**: Collections for marketing campaigns, seasonal displays, etc.

## Shopify Setup

### 1. Creating the Metafield

1. Go to your Shopify Admin
2. Navigate to **Settings** → **Custom data**
3. Select **Collections**
4. Click **Add definition**
5. Configure the metafield as follows:
   - **Namespace**: `custom`
   - **Key**: `type`
   - **Name**: Collection Type
   - **Description**: Defines where this collection should appear (comma-separated values)
   - **Type**: Single line text
   - **Validation**: Optional
   - **Required**: No

### 2. Configuring Collection Types

For each collection, edit its details and set the `Collection Type` metafield. Use comma-separated values to assign multiple types:

#### Examples:
- `category` - Shows in products navigation
- `homepage,category` - Shows on homepage and in navigation
- `featured` - Special featured collections
- `seasonal,winter,holiday` - Multi-purpose seasonal collections

#### Recommended Type Values:
- `category` - Collections that should appear in `/collections/` navigation
- `homepage` - Collections that can be featured on the homepage
- `featured` - Highlighted collections for special purposes
- `hidden` - Collections that should not appear in automated listings

## Technical Implementation

### GraphQL Query Updates

The system queries the `custom.type` metafield in two places:

1. **COLLECTIONS_QUERY**: Fetches all collections with their types
2. **COLLECTION_BY_HANDLE_PRODUCTS_QUERY**: Fetches individual collections with type validation

```graphql
type: metafield(namespace: "custom", key: "type") {
  value
}
```

### Type Filtering Logic

The filtering logic is implemented in `src/lib/shopify/collections.ts`:

```typescript
export function filterCollectionsByType(
  collections: StorefrontCollectionSummary[],
  targetType: string
): StorefrontCollectionSummary[] {
  return collections.filter((collection) => {
    if (!collection.type) {
      return false;
    }

    // Split the comma-separated values and trim whitespace
    const types = collection.type.split(',').map(t => t.trim().toLowerCase());

    // Check if the target type is included
    return types.includes(targetType.toLowerCase());
  });
}
```

### Integration Points

#### 1. Catalog Pages (`/collections/`)

- **Main page**: Only shows collections with `category` type
- **Category pages**: Validates that accessed collections have `category` type

#### 2. Homepage Integration

Collections with `homepage` type can be used in homepage features:

```typescript
// Example: Get homepage collections
const homepageCollections = filterCollectionsByType(allCollections, 'homepage');
```

## Usage Examples

### Setting Up Collections

1. **Sports Equipment Collection**
   - Handle: `sports-equipment`
   - Type: `category,featured`
   - Result: Appears in navigation and can be featured

2. **Winter Sale Collection**
   - Handle: `winter-sale-2024`
   - Type: `seasonal,winter,promotion`
   - Result: Used for seasonal marketing, not in main navigation

3. **New Arrivals**
   - Handle: `new-arrivals`
   - Type: `homepage,category`
   - Result: Shows on homepage and in navigation

### Code Integration

```typescript
// Get category collections for navigation
const categoryCollections = await getCatalogCollections(); // Automatically filtered for 'category'

// Get all collections for admin features
const allCollections = await getAllCollections(); // No filtering applied

// Filter collections programmatically
const featuredCollections = filterCollectionsByType(allCollections, 'featured');
```

## URL Structure

With collection type filtering enabled:

- `/collections/` - Shows all collections with `category` type
- `/collections/[handle]` - Shows individual collection if it has `category` type
- Collections without `category` type will return 404 when accessed directly

## Troubleshooting

### Common Issues

#### Collection Not Showing in Navigation
1. Check that the `custom.type` metafield exists
2. Verify it contains `category` in the comma-separated list
3. Ensure there are no extra spaces: use `category,homepage` not `category , homepage`

#### 404 Error on Collection Page
1. Verify the collection handle is correct
2. Check that the collection has `category` type
3. Ensure the collection is published and not hidden

#### Metafield Not Working
1. Confirm namespace is exactly `custom` (lowercase)
2. Confirm key is exactly `type` (lowercase)
3. Check metafield permissions in your Shopify API token

### Debugging Steps

1. **Check GraphQL Response**:
```graphql
{
  collections(first: 10) {
    edges {
      node {
        title
        handle
        type: metafield(namespace: "custom", key: "type") {
          value
        }
      }
    }
  }
}
```

2. **Verify Filtering Logic**:
```typescript
console.log('Collection types:', collection.type);
console.log('Is category?', filterCollectionsByType([collection], 'category'));
```

## Best Practices

### Metafield Management
- Use consistent type naming conventions
- Document your type values for team members
- Review collection types regularly for consistency

### Performance Considerations
- The filtering happens server-side before sending to client
- GraphQL query includes metafield to minimize API calls
- Consider caching for large catalogs

### SEO Implications
- Collections without `category` type won't be accessible via direct URLs
- Ensure important collections are included in appropriate types
- Use descriptive handles for collections that appear in navigation

## Migration Guide

### Existing Collections
For existing collections that should appear in `/collections/`:

1. Go to each collection in Shopify Admin
2. Add the `Collection Type` metafield
3. Set value to `category` (or `category,other-types` as needed)

### Bulk Updates
For large catalogs, consider using Shopify's bulk editor or API to update multiple collections at once.

## Future Enhancements

Potential improvements to the collection type system:

1. **Admin Interface**: Build a custom admin interface for managing collection types
2. **Advanced Filtering**: Support for more complex type combinations
3. **Analytics**: Track which collection types perform best
4. **A/B Testing**: Test different collection type configurations

## Support

If you encounter issues with collection type filtering:

1. Check the Shopify metafield configuration
2. Verify GraphQL queries are returning the expected data
3. Test the filtering logic in isolation
4. Check browser console for JavaScript errors
5. Verify API permissions for metafield access

## Related Documentation

- [Shopify Metafields Documentation](https://shopify.dev/docs/apps/build/custom-data/metafields)
- [Storefront API Reference](https://shopify.dev/docs/api/storefront)
- [Products V2 Setup Guide](./collections-setup.md)