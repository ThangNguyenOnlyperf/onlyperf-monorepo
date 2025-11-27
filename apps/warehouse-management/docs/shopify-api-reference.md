# Shopify API Reference

## Overview

This document provides a comprehensive reference for all Shopify API endpoints used in our integration, including authentication, rate limits, and request/response examples.

## Authentication

### Admin API Access Token

All API requests require authentication using an Admin API access token in the header:

```http
X-Shopify-Access-Token: shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### API Version

We use API version `2024-01` for stability. Include in URL:

```
https://{shop}.myshopify.com/admin/api/2024-01/
```

## Rate Limiting

### REST API Limits

| Limit Type | Value | Description |
|------------|-------|-------------|
| Burst | 40 requests/minute | Maximum requests in 1 minute |
| Sustained | 2 requests/second | Average rate |
| Daily | No limit | Unlimited daily requests |

### GraphQL API Limits

| Limit Type | Value | Description |
|------------|-------|-------------|
| Cost Points | 1000 points | Available points |
| Refill Rate | 50 points/second | Points restoration rate |
| Query Cost | Varies | Based on query complexity |

### Rate Limit Headers

Monitor these response headers:

```http
X-Shopify-Shop-Api-Call-Limit: 32/40
Retry-After: 2.0
```

## Products API

### Create Product

**Endpoint:** `POST /admin/api/2024-01/products.json`

**Request:**
```json
{
  "product": {
    "title": "Búa thợ mộc",
    "body_html": "<p>Búa chất lượng cao</p>",
    "vendor": "Stanley",
    "product_type": "Hand Tools",
    "tags": "tools, hammer, construction",
    "status": "active",
    "variants": [
      {
        "price": "250000",
        "sku": "STAN-HAM-001",
        "barcode": "1234567890",
        "inventory_management": "shopify",
        "inventory_policy": "deny",
        "inventory_quantity": 50,
        "weight": 500,
        "weight_unit": "g"
      }
    ],
    "options": [
      {
        "name": "Size",
        "values": ["Standard"]
      }
    ]
  }
}
```

**Response:**
```json
{
  "product": {
    "id": 7654321234567,
    "title": "Búa thợ mộc",
    "handle": "bua-tho-moc",
    "status": "active",
    "variants": [
      {
        "id": 44556677889900,
        "product_id": 7654321234567,
        "sku": "STAN-HAM-001",
        "price": "250000.00",
        "inventory_item_id": 45678901234567,
        "inventory_quantity": 50
      }
    ],
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### Update Product

**Endpoint:** `PUT /admin/api/2024-01/products/{product_id}.json`

**Request:**
```json
{
  "product": {
    "id": 7654321234567,
    "title": "Búa thợ mộc cập nhật",
    "variants": [
      {
        "id": 44556677889900,
        "price": "275000"
      }
    ]
  }
}
```

### Get Product

**Endpoint:** `GET /admin/api/2024-01/products/{product_id}.json`

**Response:** Same as create response

### List Products

**Endpoint:** `GET /admin/api/2024-01/products.json`

**Query Parameters:**
- `limit`: Maximum 250 (default 50)
- `page`: Page number
- `since_id`: Products after this ID
- `status`: active, archived, draft
- `vendor`: Filter by vendor
- `product_type`: Filter by type
- `fields`: Comma-separated fields to include

### Delete Product

**Endpoint:** `DELETE /admin/api/2024-01/products/{product_id}.json`

**Response:** `200 OK` with empty body

### Product Metafields

**Create Metafield:**
```json
POST /admin/api/2024-01/products/{product_id}/metafields.json
{
  "metafield": {
    "namespace": "warehouse",
    "key": "storage_location",
    "value": "A-12-3",
    "type": "single_line_text_field"
  }
}
```

## Inventory API

### Get Inventory Levels

**Endpoint:** `GET /admin/api/2024-01/inventory_levels.json`

**Query Parameters:**
- `inventory_item_ids`: Comma-separated IDs
- `location_ids`: Comma-separated location IDs

**Response:**
```json
{
  "inventory_levels": [
    {
      "inventory_item_id": 45678901234567,
      "location_id": 65432109876543,
      "available": 50,
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Update Inventory Level

**Endpoint:** `POST /admin/api/2024-01/inventory_levels/set.json`

**Request:**
```json
{
  "location_id": 65432109876543,
  "inventory_item_id": 45678901234567,
  "available": 75
}
```

**Response:**
```json
{
  "inventory_level": {
    "inventory_item_id": 45678901234567,
    "location_id": 65432109876543,
    "available": 75,
    "updated_at": "2024-01-15T10:05:00Z"
  }
}
```

### Adjust Inventory Level

**Endpoint:** `POST /admin/api/2024-01/inventory_levels/adjust.json`

**Request:**
```json
{
  "location_id": 65432109876543,
  "inventory_item_id": 45678901234567,
  "available_adjustment": -5
}
```

## Orders API

### Get Order

**Endpoint:** `GET /admin/api/2024-01/orders/{order_id}.json`

**Response:**
```json
{
  "order": {
    "id": 4567890123456,
    "order_number": 1001,
    "name": "#1001",
    "email": "customer@example.com",
    "financial_status": "paid",
    "fulfillment_status": "unfulfilled",
    "total_price": "500000.00",
    "subtotal_price": "450000.00",
    "total_tax": "50000.00",
    "currency": "VND",
    "customer": {
      "id": 5678901234567,
      "email": "customer@example.com",
      "first_name": "Nguyen",
      "last_name": "Van A"
    },
    "line_items": [
      {
        "id": 9876543210987,
        "variant_id": 44556677889900,
        "product_id": 7654321234567,
        "title": "Búa thợ mộc",
        "quantity": 2,
        "price": "250000.00",
        "sku": "STAN-HAM-001",
        "vendor": "Stanley",
        "fulfillment_status": null,
        "fulfillable_quantity": 2
      }
    ],
    "shipping_address": {
      "first_name": "Nguyen",
      "last_name": "Van A",
      "address1": "123 Nguyen Hue",
      "city": "Ho Chi Minh",
      "province": "Ho Chi Minh",
      "country": "Vietnam",
      "zip": "700000",
      "phone": "+84901234567"
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### List Orders

**Endpoint:** `GET /admin/api/2024-01/orders.json`

**Query Parameters:**
- `status`: open, closed, cancelled, any
- `financial_status`: pending, paid, refunded, voided
- `fulfillment_status`: shipped, partial, unshipped, unfulfilled
- `created_at_min`: ISO 8601 date
- `created_at_max`: ISO 8601 date
- `limit`: Maximum 250
- `since_id`: Orders after this ID

### Update Order

**Endpoint:** `PUT /admin/api/2024-01/orders/{order_id}.json`

**Request:**
```json
{
  "order": {
    "id": 4567890123456,
    "note": "Customer requested gift wrapping",
    "tags": "vip, gift"
  }
}
```

### Cancel Order

**Endpoint:** `POST /admin/api/2024-01/orders/{order_id}/cancel.json`

**Request:**
```json
{
  "reason": "customer",
  "email": true,
  "restock": true
}
```

## Fulfillments API

### Create Fulfillment

**Endpoint:** `POST /admin/api/2024-01/fulfillments.json`

**Request:**
```json
{
  "fulfillment": {
    "order_id": 4567890123456,
    "location_id": 65432109876543,
    "tracking_number": "VN123456789",
    "tracking_company": "Vietnam Post",
    "notify_customer": true,
    "line_items": [
      {
        "id": 9876543210987,
        "quantity": 2
      }
    ]
  }
}
```

**Response:**
```json
{
  "fulfillment": {
    "id": 3456789012345,
    "order_id": 4567890123456,
    "status": "success",
    "tracking_number": "VN123456789",
    "tracking_company": "Vietnam Post",
    "tracking_urls": ["https://tracking.vnpost.vn/VN123456789"],
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

### Update Tracking

**Endpoint:** `PUT /admin/api/2024-01/fulfillments/{fulfillment_id}.json`

**Request:**
```json
{
  "fulfillment": {
    "tracking_number": "VN123456789-UPDATE",
    "tracking_company": "Giao Hang Nhanh",
    "notify_customer": true
  }
}
```

## Customers API

### Create Customer

**Endpoint:** `POST /admin/api/2024-01/customers.json`

**Request:**
```json
{
  "customer": {
    "first_name": "Nguyen",
    "last_name": "Van B",
    "email": "nguyenvanb@example.com",
    "phone": "+84901234568",
    "verified_email": false,
    "addresses": [
      {
        "address1": "456 Le Loi",
        "city": "Ho Chi Minh",
        "province": "Ho Chi Minh",
        "country": "VN",
        "zip": "700000",
        "phone": "+84901234568",
        "default": true
      }
    ],
    "tags": "POS_Customer, VIP",
    "accepts_marketing": false,
    "tax_exempt": false,
    "note": "Prefers morning delivery"
  }
}
```

**Response:**
```json
{
  "customer": {
    "id": 5678901234568,
    "email": "nguyenvanb@example.com",
    "first_name": "Nguyen",
    "last_name": "Van B",
    "phone": "+84901234568",
    "state": "enabled",
    "verified_email": false,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "orders_count": 0,
    "total_spent": "0.00",
    "addresses": [...]
  }
}
```

### Update Customer

**Endpoint:** `PUT /admin/api/2024-01/customers/{customer_id}.json`

### Search Customers

**Endpoint:** `GET /admin/api/2024-01/customers/search.json`

**Query Parameters:**
- `query`: Search string (email, name, phone)
- `limit`: Maximum 250
- `fields`: Comma-separated fields

**Example:** `query=phone:+84901234567`

### Get Customer

**Endpoint:** `GET /admin/api/2024-01/customers/{customer_id}.json`

## Webhooks API

### Register Webhook

**Endpoint:** `POST /admin/api/2024-01/webhooks.json`

**Request:**
```json
{
  "webhook": {
    "topic": "orders/create",
    "address": "https://yourapp.com/api/webhooks/shopify",
    "format": "json"
  }
}
```

**Response:**
```json
{
  "webhook": {
    "id": 1234567890,
    "address": "https://yourapp.com/api/webhooks/shopify",
    "topic": "orders/create",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "format": "json",
    "api_version": "2024-01"
  }
}
```

### List Webhooks

**Endpoint:** `GET /admin/api/2024-01/webhooks.json`

### Update Webhook

**Endpoint:** `PUT /admin/api/2024-01/webhooks/{webhook_id}.json`

### Delete Webhook

**Endpoint:** `DELETE /admin/api/2024-01/webhooks/{webhook_id}.json`

### Available Webhook Topics

| Topic | Description | Payload |
|-------|-------------|---------|
| `orders/create` | New order created | Full order object |
| `orders/updated` | Order updated | Full order object |
| `orders/cancelled` | Order cancelled | Full order object |
| `orders/fulfilled` | Order fulfilled | Full order object |
| `orders/paid` | Order paid | Full order object |
| `customers/create` | Customer created | Full customer object |
| `customers/update` | Customer updated | Full customer object |
| `customers/delete` | Customer deleted | Customer ID only |
| `products/create` | Product created | Full product object |
| `products/update` | Product updated | Full product object |
| `products/delete` | Product deleted | Product ID only |
| `inventory_levels/update` | Inventory updated | Inventory level object |

### Webhook Verification

Verify webhook authenticity:

```typescript
import crypto from 'crypto';

function verifyWebhook(rawBody: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return hash === signature;
}

// In your webhook handler
const signature = request.headers.get('X-Shopify-Hmac-Sha256');
const topic = request.headers.get('X-Shopify-Topic');
const shopDomain = request.headers.get('X-Shopify-Shop-Domain');
```

## GraphQL API

### Products Query

```graphql
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        title
        handle
        status
        vendor
        productType
        tags
        variants(first: 100) {
          edges {
            node {
              id
              sku
              price
              inventoryItem {
                id
                tracked
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      available
                      location {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Bulk Operations

For large-scale operations, use bulk queries:

```graphql
mutation {
  bulkOperationRunQuery(
    query: """
    {
      products {
        edges {
          node {
            id
            title
            variants {
              edges {
                node {
                  id
                  sku
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
    """
  ) {
    bulkOperation {
      id
      status
      url
    }
    userErrors {
      field
      message
    }
  }
}
```

Check bulk operation status:

```graphql
query {
  node(id: "gid://shopify/BulkOperation/1234567890") {
    ... on BulkOperation {
      id
      status
      errorCode
      createdAt
      completedAt
      url
    }
  }
}
```

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Unauthorized | Check API token |
| 403 | Forbidden | Check API scopes |
| 404 | Not Found | Verify resource ID |
| 422 | Unprocessable Entity | Validate request data |
| 429 | Too Many Requests | Implement rate limiting |
| 500 | Internal Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Retry later |

### Error Response Format

```json
{
  "errors": {
    "product": [
      "Title can't be blank",
      "Vendor can't be blank"
    ],
    "base": [
      "You need to add at least one product variant"
    ]
  }
}
```

### GraphQL Error Format

```json
{
  "errors": [
    {
      "message": "Field 'id' doesn't exist on type 'Product'",
      "extensions": {
        "code": "GRAPHQL_VALIDATION_FAILED"
      }
    }
  ]
}
```

## Testing

### Development Store

Use a development store for testing:
- Free and permanent
- Full API access
- Test data generation
- No real transactions

### API Sandbox

Shopify doesn't provide a sandbox, but you can:
1. Use development stores
2. Create test products with specific tags
3. Use test payment gateways
4. Generate test orders

### cURL Examples

**Get Products:**
```bash
curl -X GET "https://your-store.myshopify.com/admin/api/2024-01/products.json" \
  -H "X-Shopify-Access-Token: shpat_xxxxx" \
  -H "Content-Type: application/json"
```

**Create Product:**
```bash
curl -X POST "https://your-store.myshopify.com/admin/api/2024-01/products.json" \
  -H "X-Shopify-Access-Token: shpat_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "title": "Test Product",
      "vendor": "Test Vendor",
      "product_type": "Test Type"
    }
  }'
```

## Best Practices

### 1. Pagination

Always paginate large result sets:

```typescript
async function getAllProducts() {
  let products = [];
  let params = { limit: 250 };
  
  do {
    const response = await shopifyClient.get('products', params);
    products = [...products, ...response.products];
    
    // Get next page ID
    const linkHeader = response.headers.link;
    params = parseNextPageParams(linkHeader);
  } while (params);
  
  return products;
}
```

### 2. Field Selection

Only request needed fields to reduce payload:

```
GET /admin/api/2024-01/products.json?fields=id,title,variants
```

### 3. Batch Operations

Use GraphQL for bulk operations:
- Fetching many resources
- Updating multiple items
- Complex queries with relationships

### 4. Idempotency

Make operations idempotent:
- Use unique idempotency keys
- Check for existing resources before creating
- Handle duplicate webhook events

### 5. Error Recovery

Implement robust error handling:
- Exponential backoff for retries
- Dead letter queues for failed operations
- Logging and monitoring
- Graceful degradation

## API Limits and Quotas

| Resource | Limit | Notes |
|----------|-------|-------|
| Products | 100,000 | Per store |
| Variants | 100 | Per product |
| Options | 3 | Per product |
| Images | 250 | Per product |
| Collections | 5,000 | Per store |
| Customers | Unlimited | No hard limit |
| Orders | Unlimited | No hard limit |
| Metafields | 20 | Per resource (non-Plus) |
| Webhooks | 20 | Per topic |
| Locations | 20 | Per store (non-Plus) |

## Support Resources

- [Shopify API Documentation](https://shopify.dev/docs/admin-api)
- [API Changelog](https://shopify.dev/changelog)
- [GraphQL Explorer](https://shopify.dev/tools/graphiql-admin-api)
- [Community Forums](https://community.shopify.com/c/shopify-apis-and-sdks)
- [API Status](https://status.shopify.com)