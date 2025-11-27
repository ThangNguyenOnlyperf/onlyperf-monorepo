# API Endpoints Documentation

## Shipment Management

### Create New Shipment
**POST** `/api/shipments`

Creates a new shipment with associated products.

**Request Body:**
```json
{
  "receiptNumber": "RCP-2024-001",
  "receiptDate": "2024-12-25",
  "supplierName": "ABC Supplier Co.",
  "items": [
    {
      "brand": "Nike",
      "model": "Air Max 90",
      "quantity": 10
    },
    {
      "brand": "Adidas",
      "model": "Ultraboost",
      "quantity": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shipmentId": "shp_1234567890",
    "items": [
      {
        "id": "itm_1234567890",
        "productId": "prd_1234567890",
        "qrCode": "PB24122501",
        "quantity": 10
      }
    ]
  }
}
```

### Get Shipment Details
**GET** `/api/shipments/:id`

Retrieves details of a specific shipment.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "shp_1234567890",
    "receiptNumber": "RCP-2024-001",
    "receiptDate": "2024-12-25",
    "supplierName": "ABC Supplier Co.",
    "status": "pending",
    "items": [
      {
        "id": "itm_1234567890",
        "product": {
          "id": "prd_1234567890",
          "brand": "Nike",
          "model": "Air Max 90"
        },
        "quantity": 10,
        "qrCodes": ["PB24122501", "PB24122502", "..."]
      }
    ],
    "createdAt": "2024-12-25T10:00:00Z",
    "updatedAt": "2024-12-25T10:00:00Z"
  }
}
```

### List Shipments
**GET** `/api/shipments`

Lists all shipments with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20)
- `status` (string): Filter by status (pending, received, completed)
- `sortBy` (string): Sort field (createdAt, receiptDate)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "shp_1234567890",
      "receiptNumber": "RCP-2024-001",
      "receiptDate": "2024-12-25",
      "supplierName": "ABC Supplier Co.",
      "status": "pending",
      "itemCount": 15,
      "createdAt": "2024-12-25T10:00:00Z"
    }
  ],
  "metadata": {
    "currentPage": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 100
  }
}
```

## PDF Generation

### Generate QR Code PDF
**GET** `/api/shipments/:id/pdf`

Generates a PDF with QR codes for all items in a shipment.

**Query Parameters:**
- `format` (string): PDF format (labels, list) - default: labels
- `size` (string): QR code size (small, medium, large) - default: medium

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="shipment-{id}-qr-codes.pdf"`

**Error Response:**
```json
{
  "success": false,
  "error": "Shipment not found"
}
```

### Generate Single QR Code
**GET** `/api/qr/generate/:code`

Generates a single QR code image.

**Query Parameters:**
- `size` (number): Size in pixels (default: 295)
- `format` (string): Image format (png, svg) - default: png

**Response:**
- Content-Type: `image/png` or `image/svg+xml`

## QR Code Scanning

### Process QR Code Scan
**POST** `/api/qr/scan`

Processes a scanned QR code and returns associated product information.

**Request Body:**
```json
{
  "qrCode": "PB24122501",
  "action": "verify" // verify, receive, ship
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "prd_1234567890",
      "brand": "Nike",
      "model": "Air Max 90",
      "qrCode": "PB24122501"
    },
    "shipment": {
      "id": "shp_1234567890",
      "receiptNumber": "RCP-2024-001",
      "status": "pending"
    },
    "currentStatus": "pending",
    "history": [
      {
        "action": "created",
        "timestamp": "2024-12-25T10:00:00Z",
        "user": "John Doe"
      }
    ]
  }
}
```

### Batch QR Code Scan
**POST** `/api/qr/scan/batch`

Processes multiple QR codes at once.

**Request Body:**
```json
{
  "qrCodes": ["PB24122501", "PB24122502", "PB24122503"],
  "action": "receive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 3,
    "successful": 2,
    "failed": 1,
    "results": [
      {
        "qrCode": "PB24122501",
        "success": true,
        "message": "Item received successfully"
      },
      {
        "qrCode": "PB24122502",
        "success": true,
        "message": "Item received successfully"
      },
      {
        "qrCode": "PB24122503",
        "success": false,
        "error": "QR code not found"
      }
    ]
  }
}
```

## Product Management

### Search Products
**GET** `/api/products/search`

Search for products by brand or model.

**Query Parameters:**
- `q` (string): Search query
- `brand` (string): Filter by brand
- `limit` (number): Maximum results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prd_1234567890",
      "brand": "Nike",
      "model": "Air Max 90",
      "inStock": 25
    }
  ]
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional error details
}
```

### Common Error Codes:
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `INTERNAL_ERROR`: Server error

## Authentication

All endpoints require authentication via Better Auth session. Include the session cookie with all requests.

### Headers:
```
Cookie: session=<session_token>
Content-Type: application/json
```

## Rate Limiting

- **General endpoints**: 100 requests per minute
- **PDF generation**: 10 requests per minute
- **Batch operations**: 20 requests per minute

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets