# Quick Start - Webhook Testing

Test your Shopify webhook integration in seconds without the full checkout flow.

## Prerequisites

```bash
# 1. Ensure dev server is running
pnpm dev

# 2. Ensure SHOPIFY_WEBHOOK_SECRET is in .env
echo $SHOPIFY_WEBHOOK_SECRET  # Should output your secret
```

## Run Tests

### Basic Test (Default Payload)
```bash
pnpm tsx tests/webhook/test-webhook.ts
```

### Test with Real Warehouse Data

**Step 1:** Get available SKUs from your warehouse
```bash
# Connect to your database and run:
SELECT
  p.id as sku,
  p.name,
  COUNT(si.id) as available
FROM products p
JOIN shipment_items si ON si.product_id = p.id
WHERE si.status = 'received'
GROUP BY p.id, p.name
LIMIT 5;
```

**Step 2:** Create custom payload
```bash
cp tests/webhook/test-order-payload.json my-test.json
# Edit my-test.json - replace SKUs with real product IDs from step 1
```

**Step 3:** Run test
```bash
pnpm tsx tests/webhook/test-webhook.ts my-test.json
```

## Pre-made Test Scenarios

```bash
# Test missing SKU error handling
pnpm tsx tests/webhook/test-webhook.ts payloads/missing-sku.json

# Test multiple items
pnpm tsx tests/webhook/test-webhook.ts payloads/multi-item.json
```

## Expected Results

### ✅ Success
```
✅ SUCCESS!
Status: 200 OK
   Order Number: ORD-20250104-5678
   Items Fulfilled: 2
```

### ❌ Missing SKU
```
❌ FAILED!
Status: 400 Bad Request
💡 Issue: Products not found in warehouse
   Missing SKUs: PROD0099
```

### ❌ Insufficient Inventory
```
❌ FAILED!
Status: 400 Bad Request
💡 Issue: Not enough inventory
   Insufficient: Product Name (need 5, have 2)
```

### ❌ Server Not Running
```
❌ ERROR!
💡 Issue: Cannot connect to webhook server
   Fix: Start the warehouse dev server:
   $ pnpm dev
```

## Verify Results

### Check Database
```sql
-- View created order
SELECT * FROM orders
WHERE source = 'shopify'
ORDER BY created_at DESC
LIMIT 1;

-- View order items
SELECT
  oi.*,
  p.name as product_name
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = 'YOUR_ORDER_ID';

-- Check inventory status
SELECT * FROM shipment_items
WHERE status = 'sold'
ORDER BY scanned_at DESC
LIMIT 5;
```

### Check Logs
```bash
# In your warehouse dev server terminal, look for:
Processing Shopify order: #TEST-1001 (gid://shopify/Order/...)
✅ Successfully created warehouse order ORD-20250104-5678
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "SHOPIFY_WEBHOOK_SECRET not found" | Add `SHOPIFY_WEBHOOK_SECRET=your-secret` to `.env` |
| "Cannot connect to webhook server" | Run `pnpm dev` in another terminal |
| "Invalid HMAC signature" | Restart dev server after changing `.env` |
| "Missing SKUs" | Use real product IDs from your warehouse |
| "Insufficient inventory" | Reduce quantity or add more inventory |

## Reset Test Data

After testing, you can reset inventory:

```sql
-- Mark test items as available again
UPDATE shipment_items
SET status = 'received', scanned_at = NULL
WHERE qr_code LIKE '%TEST%'
AND status = 'sold';

-- Delete test orders (optional)
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE order_number LIKE '%TEST%'
);

DELETE FROM orders
WHERE order_number LIKE '%TEST%';
```

## Next Steps

1. ✅ Test with default payload
2. ✅ Test with real warehouse SKUs
3. ✅ Test error cases (missing SKU, insufficient inventory)
4. 📝 Document any edge cases you discover
5. 🚀 Deploy to production (see SHOPIFY_INTEGRATION.md)
