# Test Payloads for Webhook Testing

This directory contains sample payloads for testing the Shopify order webhook without running the full end-to-end flow.

## Usage

```bash
# Test with specific payload
pnpm tsx tests/webhook/test-webhook.ts payloads/missing-sku.json
```

## Available Payloads

### `missing-sku.json`
Tests error handling when order contains a product that doesn't exist in the warehouse.

**Expected result:** 400 error with code `MISSING_SKU`

**Use case:** Verify webhook properly rejects orders for products not in warehouse inventory.

---

### `multi-item.json`
Tests order with multiple different products (3 items with different SKUs).

**Expected result:** 200 success if all SKUs exist in warehouse with sufficient inventory

**Use case:** Verify webhook can handle multiple line items and allocate inventory correctly.

---

## Creating Custom Payloads

### 1. Copy the template
```bash
cp tests/webhook/test-order-payload.json custom-test.json
```

### 2. Get real SKUs from your warehouse
```sql
SELECT
  p.id as sku,
  p.name,
  p.brand,
  COUNT(si.id) as available_items
FROM products p
JOIN shipment_items si ON si.product_id = p.id
WHERE si.status = 'received'
GROUP BY p.id, p.name, p.brand
HAVING COUNT(si.id) > 0
LIMIT 10;
```

### 3. Update the payload
Edit `custom-test.json` and replace the `lineItems[].sku` values with real product IDs from your warehouse.

### 4. Run the test
```bash
pnpm tsx tests/webhook/test-webhook.ts custom-test.json
```

## Payload Structure

```json
{
  "event": "order.paid",
  "provider": "sepay",
  "shopifyOrderId": "gid://shopify/Order/123",
  "shopifyOrderNumber": "#1001",
  "paymentCode": "ABC123",
  "amount": 500000,
  "currency": "VND",
  "paidAt": "2025-01-04T10:30:00.000Z",
  "referenceCode": "FT12345678",
  "gateway": "VIETCOMBANK",
  "lineItems": [
    {
      "sku": "YOUR_PRODUCT_ID",  // ← Must match products.id in warehouse
      "variantId": "gid://shopify/ProductVariant/456",
      "quantity": 2,
      "price": 250000,
      "title": "Product Name",
      "variantTitle": "Size M / Black"
    }
  ],
  "customer": {
    "email": "test@example.com",
    "name": "Customer Name",
    "phone": "+84912345678"
  },
  "shippingAddress": {
    "name": "Customer Name",
    "address1": "123 Street",
    "city": "Ho Chi Minh City",
    "province": "Ho Chi Minh",
    "zip": "700000",
    "country": "Vietnam",
    "phone": "+84912345678"
  }
}
```

## Testing Scenarios

### Happy Path
Use real SKUs with available inventory. Verify:
- Order created with `source='shopify'`
- Shipment items marked as `'sold'`
- Customer created/updated
- Response includes warehouse order number

### Error Cases

**Missing SKU:**
- Use non-existent SKU like `"NONEXISTENT123"`
- Expect 400 error with `code: "MISSING_SKU"`

**Insufficient Inventory:**
- Use real SKU but set `quantity` higher than available
- Expect 400 error with `code: "INSUFFICIENT_INVENTORY"`

**Invalid Signature:**
- Manually modify payload after running test
- Expect 401 Unauthorized

## Tips

1. **Keep test data:** Don't delete test orders from warehouse - use them for testing delivery flows

2. **Reset inventory:** After testing, you can reset shipment items:
   ```sql
   UPDATE shipment_items
   SET status = 'received', scanned_at = NULL
   WHERE status = 'sold'
   AND qr_code LIKE 'TEST%';
   ```

3. **Debug mode:** Check warehouse server logs for detailed error messages:
   ```bash
   # Watch logs in real-time
   pnpm dev | grep "Shopify order"
   ```
