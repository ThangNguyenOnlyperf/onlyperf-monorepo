# Shopify Integration Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the Shopify integration. Each issue includes symptoms, root causes, solutions, and prevention strategies.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this checklist:

```bash
# 1. Check API credentials
echo $SHOPIFY_ADMIN_ACCESS_TOKEN | head -c 20

# 2. Test API connectivity
curl -X GET "https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ADMIN_ACCESS_TOKEN}"

# 3. Check database sync status
psql -c "SELECT entity_type, sync_status, COUNT(*) 
         FROM products GROUP BY entity_type, sync_status;"

# 4. Check recent sync errors
psql -c "SELECT * FROM sync_logs 
         WHERE status = 'failed' 
         ORDER BY created_at DESC LIMIT 10;"

# 5. Verify webhook endpoints
curl -X POST https://your-app.com/api/webhooks/shopify \
  -H "X-Shopify-Topic: test" \
  -d '{"test": true}'
```

## Common Issues and Solutions

### 1. Products Not Syncing to Shopify

#### Symptoms
- Products created locally but don't appear in Shopify
- `sync_status` remains 'pending'
- No errors in sync_logs

#### Diagnostic Steps
```sql
-- Check pending products
SELECT id, name, sku, sync_status, last_synced_at 
FROM products 
WHERE sync_status = 'pending' 
LIMIT 10;

-- Check sync logs for the product
SELECT * FROM sync_logs 
WHERE entity_id = 'product-uuid-here' 
ORDER BY created_at DESC;
```

#### Common Causes & Solutions

**Cause 1: Missing Required Fields**
```sql
-- Check for missing required fields
SELECT id, name, sku, price 
FROM products 
WHERE (name IS NULL OR name = '') 
   OR (sku IS NULL OR sku = '') 
   OR (price IS NULL OR price <= 0);
```

**Solution:**
```typescript
// Add validation before sync
async function validateProductForSync(product: Product): Promise<boolean> {
  const errors = [];
  
  if (!product.name?.trim()) errors.push('Missing product name');
  if (!product.sku?.trim()) errors.push('Missing SKU');
  if (!product.price || product.price <= 0) errors.push('Invalid price');
  
  if (errors.length > 0) {
    await logValidationError(product.id, errors);
    return false;
  }
  
  return true;
}
```

**Cause 2: API Token Invalid**
```bash
# Test token validity
curl -X GET "https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/products/count.json" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ADMIN_ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Solution:**
- Regenerate API token in Shopify admin
- Update `.env.local` file
- Restart application

**Cause 3: Sync Job Not Running**
```bash
# Check if cron jobs are running
ps aux | grep -E "node.*sync|cron"

# Check job logs
tail -f logs/sync-jobs.log
```

**Solution:**
```typescript
// Manually trigger sync
import { syncService } from '@/lib/shopify/sync-service';

async function manualProductSync() {
  const pendingProducts = await db.query.products.findMany({
    where: eq(products.syncStatus, 'pending'),
    limit: 10
  });
  
  for (const product of pendingProducts) {
    try {
      await syncService.syncProductToShopify(product.id);
      console.log(`Synced product: ${product.id}`);
    } catch (error) {
      console.error(`Failed to sync ${product.id}:`, error);
    }
  }
}
```

### 2. Inventory Discrepancies

#### Symptoms
- Shopify shows different inventory than local system
- Overselling or underselling
- Inventory reconciliation failures

#### Diagnostic Steps
```sql
-- Compare local vs Shopify inventory
SELECT 
  p.name,
  p.sku,
  COUNT(si.id) as local_inventory,
  p.shopify_inventory_level as shopify_inventory,
  COUNT(si.id) - p.shopify_inventory_level as discrepancy
FROM products p
LEFT JOIN shipment_items si ON si.product_id = p.id AND si.status = 'received'
GROUP BY p.id, p.name, p.sku, p.shopify_inventory_level
HAVING COUNT(si.id) != p.shopify_inventory_level;
```

#### Common Causes & Solutions

**Cause 1: Missed Status Updates**
```sql
-- Find items with status changes not synced
SELECT * FROM shipment_items 
WHERE status_changed_at > last_inventory_sync_at
  AND affects_inventory = true;
```

**Solution:**
```typescript
// Implement inventory change tracking
async function onShipmentItemStatusChange(
  itemId: string, 
  oldStatus: string, 
  newStatus: string
) {
  const affectsInventory = ['received', 'sold', 'returned'].includes(newStatus);
  
  if (affectsInventory) {
    const item = await db.query.shipmentItems.findFirst({
      where: eq(shipmentItems.id, itemId),
      with: { product: true }
    });
    
    if (item?.product?.shopifyInventoryItemId) {
      await syncService.syncInventoryToShopify(item.productId);
    }
  }
}
```

**Cause 2: Race Conditions**
```typescript
// Problem: Multiple simultaneous inventory updates
// Solution: Use database locks
async function updateInventoryWithLock(productId: string) {
  return await db.transaction(async (tx) => {
    // Lock the product row
    const product = await tx.query.products.findFirst({
      where: eq(products.id, productId),
      lock: 'FOR UPDATE'
    });
    
    // Calculate inventory
    const inventory = await tx.query.shipmentItems.count({
      where: and(
        eq(shipmentItems.productId, productId),
        eq(shipmentItems.status, 'received')
      )
    });
    
    // Update Shopify
    await shopifyClient.updateInventoryLevel(
      product.shopifyInventoryItemId,
      process.env.SHOPIFY_LOCATION_ID,
      inventory
    );
    
    // Update local cache
    await tx.update(products)
      .set({ shopifyInventoryLevel: inventory })
      .where(eq(products.id, productId));
  });
}
```

**Cause 3: Manual Shopify Changes**
- Someone updated inventory directly in Shopify

**Solution:**
```typescript
// Regular reconciliation job
async function reconcileInventory() {
  const products = await db.query.products.findMany({
    where: not(isNull(products.shopifyInventoryItemId))
  });
  
  for (const product of products) {
    // Get Shopify inventory
    const shopifyLevel = await shopifyClient.getInventoryLevel(
      product.shopifyInventoryItemId
    );
    
    // Get local inventory
    const localLevel = await calculateLocalInventory(product.id);
    
    // If different, local wins (as per business rule)
    if (shopifyLevel !== localLevel) {
      await shopifyClient.updateInventoryLevel(
        product.shopifyInventoryItemId,
        process.env.SHOPIFY_LOCATION_ID,
        localLevel
      );
      
      await logDiscrepancy(product.id, localLevel, shopifyLevel);
    }
  }
}
```

### 3. Webhook Processing Failures

#### Symptoms
- Orders not appearing in local system
- Webhook endpoint returning errors
- Missing or duplicate orders

#### Diagnostic Steps
```bash
# Check webhook logs
tail -f logs/webhooks.log | grep -E "ERROR|FAIL"

# Verify webhook registration
curl -X GET "https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ADMIN_ACCESS_TOKEN}"

# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/shopify \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-Hmac-Sha256: test" \
  -d '{"id": "test-order"}'
```

#### Common Causes & Solutions

**Cause 1: Signature Verification Failing**
```typescript
// Debug webhook verification
function debugWebhookVerification(rawBody: string, signature: string) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  console.log('Secret exists:', !!secret);
  console.log('Secret length:', secret?.length);
  console.log('Signature:', signature);
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  console.log('Calculated hash:', hash);
  console.log('Hashes match:', hash === signature);
  
  return hash === signature;
}
```

**Solution:**
- Ensure webhook secret is correct in `.env`
- Use raw body, not parsed JSON
- Check for encoding issues

**Cause 2: Webhook Timeout**
```typescript
// Problem: Processing takes too long
// Solution: Queue for async processing
export async function POST(request: Request) {
  const rawBody = await request.text();
  
  // Quick validation
  if (!verifyWebhook(rawBody, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Queue for processing (don't wait)
  await webhookQueue.add({
    topic: request.headers.get('X-Shopify-Topic'),
    data: JSON.parse(rawBody),
    receivedAt: new Date()
  });
  
  // Return immediately
  return new Response('OK', { status: 200 });
}
```

**Cause 3: Duplicate Webhook Events**
```sql
-- Check for duplicate orders
SELECT shopify_order_id, COUNT(*) as count
FROM orders
GROUP BY shopify_order_id
HAVING COUNT(*) > 1;
```

**Solution:**
```typescript
// Implement idempotency
async function handleOrderWebhook(orderData: any) {
  const webhookId = orderData.id + '-' + orderData.updated_at;
  
  // Check if already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, webhookId)
  });
  
  if (existing) {
    console.log('Webhook already processed:', webhookId);
    return;
  }
  
  // Process webhook
  await db.transaction(async (tx) => {
    // Record webhook event
    await tx.insert(webhookEvents).values({
      eventId: webhookId,
      topic: 'orders/create',
      data: orderData,
      processedAt: new Date()
    });
    
    // Process order
    await processOrder(orderData, tx);
  });
}
```

### 4. Rate Limiting Issues

#### Symptoms
- 429 errors from Shopify API
- Slow sync performance
- Intermittent sync failures

#### Diagnostic Steps
```typescript
// Monitor rate limit usage
async function checkRateLimitStatus() {
  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/shop.json`,
    {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN
      }
    }
  );
  
  const limitHeader = response.headers.get('X-Shopify-Shop-Api-Call-Limit');
  const [used, total] = limitHeader.split('/').map(Number);
  const percentage = (used / total) * 100;
  
  console.log(`Rate limit: ${used}/${total} (${percentage.toFixed(1)}%)`);
  
  if (percentage > 80) {
    console.warn('Approaching rate limit!');
  }
}
```

#### Solutions

**Solution 1: Implement Proper Rate Limiting**
```typescript
import { RateLimiter } from 'limiter';

class ShopifyRateLimiter {
  private limiter: RateLimiter;
  
  constructor() {
    // 2 requests per second (Shopify's sustained rate)
    this.limiter = new RateLimiter({
      tokensPerInterval: 2,
      interval: 'second'
    });
  }
  
  async executeWithRateLimit<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    const remainingRequests = await this.limiter.removeTokens(1);
    
    if (remainingRequests < 0) {
      // Wait for token to be available
      await new Promise(resolve => 
        setTimeout(resolve, Math.abs(remainingRequests) * 500)
      );
    }
    
    try {
      return await fn();
    } catch (error: any) {
      if (error.statusCode === 429) {
        const retryAfter = parseInt(error.headers['Retry-After'] || '5');
        console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.executeWithRateLimit(fn);
      }
      throw error;
    }
  }
}
```

**Solution 2: Use GraphQL for Bulk Operations**
```typescript
// Instead of multiple REST calls
async function inefficientGetProducts() {
  const products = [];
  for (let i = 0; i < 100; i++) {
    const product = await shopifyClient.getProduct(productIds[i]);
    products.push(product);
  }
  return products;
}

// Use single GraphQL query
async function efficientGetProducts() {
  const query = `
    query GetProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          variants(first: 10) {
            edges {
              node {
                id
                sku
                price
              }
            }
          }
        }
      }
    }
  `;
  
  return await shopifyClient.graphql(query, { ids: productIds });
}
```

### 5. Data Sync Conflicts

#### Symptoms
- Data inconsistencies between systems
- Conflicting updates
- Lost changes

#### Diagnostic Steps
```sql
-- Find conflicts
SELECT 
  p.id,
  p.name as local_name,
  p.price as local_price,
  p.last_updated_at as local_update,
  sl.response_data->>'title' as shopify_name,
  sl.response_data->>'price' as shopify_price,
  sl.created_at as shopify_update
FROM products p
JOIN sync_logs sl ON sl.entity_id = p.id
WHERE sl.status = 'conflict'
ORDER BY sl.created_at DESC;
```

#### Solutions

**Solution 1: Implement Version Control**
```sql
-- Add version tracking
ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN shopify_version INTEGER DEFAULT 1;

-- Update version on changes
CREATE OR REPLACE FUNCTION update_product_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_version_trigger
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_version();
```

**Solution 2: Conflict Resolution Strategy**
```typescript
async function resolveConflict(
  localProduct: Product,
  shopifyProduct: ShopifyProduct
): Promise<ResolvedProduct> {
  // Compare timestamps
  const localTime = new Date(localProduct.updatedAt);
  const shopifyTime = new Date(shopifyProduct.updated_at);
  
  // Business rule: Local always wins for price/inventory
  // Shopify wins for marketing content
  return {
    // Local wins
    price: localProduct.price,
    sku: localProduct.sku,
    inventory: localProduct.inventory,
    
    // Shopify wins
    description: shopifyProduct.body_html,
    tags: shopifyProduct.tags,
    images: shopifyProduct.images,
    
    // Merge
    title: localTime > shopifyTime ? localProduct.name : shopifyProduct.title,
    
    // Metadata
    conflictResolved: true,
    resolutionStrategy: 'merge',
    resolvedAt: new Date()
  };
}
```

### 6. Memory and Performance Issues

#### Symptoms
- High memory usage during sync
- Slow batch operations
- Application crashes

#### Diagnostic Steps
```bash
# Monitor memory usage
node --trace-gc --expose-gc app.js

# Profile performance
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Check database query performance
psql -c "SELECT query, calls, mean_exec_time 
         FROM pg_stat_statements 
         WHERE query LIKE '%products%' 
         ORDER BY mean_exec_time DESC 
         LIMIT 10;"
```

#### Solutions

**Solution 1: Stream Large Data Sets**
```typescript
// Instead of loading all at once
async function badBatchSync() {
  const allProducts = await db.query.products.findMany(); // 10,000 products
  for (const product of allProducts) {
    await syncProduct(product);
  }
}

// Use streaming with cursor
async function goodBatchSync() {
  const stream = db.selectFrom('products')
    .selectAll()
    .stream();
  
  for await (const product of stream) {
    await syncProduct(product);
    
    // Periodic garbage collection
    if (Math.random() < 0.01) {
      global.gc?.();
    }
  }
}
```

**Solution 2: Optimize Database Queries**
```typescript
// Add proper indexes
await db.execute(sql`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sync 
  ON products(sync_status, last_synced_at) 
  WHERE sync_status != 'synced';
  
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_items_inventory 
  ON shipment_items(product_id, status) 
  WHERE status = 'received';
`);

// Use efficient queries
async function getProductsForSync() {
  return await db.query.products.findMany({
    where: or(
      eq(products.syncStatus, 'pending'),
      and(
        eq(products.syncStatus, 'synced'),
        lt(products.lastSyncedAt, sql`NOW() - INTERVAL '24 hours'`)
      )
    ),
    limit: 50,
    orderBy: [asc(products.lastSyncedAt)]
  });
}
```

## Monitoring and Alerting

### Health Check Endpoint

Create `/src/app/api/health/shopify/route.ts`:

```typescript
export async function GET() {
  const checks = {
    api: await checkShopifyAPI(),
    webhooks: await checkWebhooks(),
    syncQueue: await checkSyncQueue(),
    inventory: await checkInventoryAccuracy(),
    database: await checkDatabase()
  };
  
  const status = Object.values(checks).every(c => c.status === 'healthy')
    ? 'healthy'
    : 'unhealthy';
  
  return Response.json({
    status,
    timestamp: new Date().toISOString(),
    checks
  });
}

async function checkShopifyAPI() {
  try {
    const response = await shopifyClient.getShop();
    return {
      status: 'healthy',
      latency: response.latency,
      rateLimit: response.rateLimit
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkInventoryAccuracy() {
  const discrepancies = await db.query.inventorySync.count({
    where: not(eq(inventorySync.discrepancy, 0))
  });
  
  return {
    status: discrepancies === 0 ? 'healthy' : 'warning',
    discrepancies
  };
}
```

### Monitoring Queries

```sql
-- Daily sync report
CREATE OR REPLACE VIEW daily_sync_report AS
SELECT 
  DATE(created_at) as date,
  entity_type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), entity_type, status
ORDER BY date DESC, entity_type;

-- Failed sync summary
CREATE OR REPLACE VIEW failed_sync_summary AS
SELECT 
  entity_type,
  error_message,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM sync_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY entity_type, error_message
ORDER BY error_count DESC;

-- Sync performance metrics
CREATE OR REPLACE VIEW sync_performance AS
SELECT 
  entity_type,
  operation,
  COUNT(*) as total_syncs,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'success' THEN 1 END) / COUNT(*), 2) as success_rate,
  AVG(retry_count) as avg_retries
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY entity_type, operation;
```

### Alert Configuration

```typescript
// Alert thresholds
const ALERT_THRESHOLDS = {
  syncFailureRate: 0.05, // 5%
  inventoryDiscrepancy: 0, // Zero tolerance
  webhookQueueSize: 100,
  apiRateLimit: 0.8, // 80%
  syncDelay: 300, // 5 minutes
};

async function checkAlerts() {
  const alerts = [];
  
  // Check sync failure rate
  const failureRate = await calculateSyncFailureRate();
  if (failureRate > ALERT_THRESHOLDS.syncFailureRate) {
    alerts.push({
      level: 'critical',
      message: `High sync failure rate: ${(failureRate * 100).toFixed(1)}%`,
      metric: 'sync_failure_rate',
      value: failureRate
    });
  }
  
  // Check inventory discrepancies
  const discrepancies = await getInventoryDiscrepancies();
  if (discrepancies.length > ALERT_THRESHOLDS.inventoryDiscrepancy) {
    alerts.push({
      level: 'warning',
      message: `Inventory discrepancies detected: ${discrepancies.length} products`,
      metric: 'inventory_discrepancy',
      value: discrepancies.length,
      details: discrepancies.slice(0, 10)
    });
  }
  
  // Send alerts
  for (const alert of alerts) {
    await sendAlert(alert);
  }
}
```

## Emergency Procedures

### 1. Complete Sync Failure

```bash
# 1. Stop sync jobs
pm2 stop sync-worker

# 2. Check Shopify status
curl https://status.shopify.com/api/v2/status.json

# 3. Verify API credentials
./scripts/test-shopify-connection.sh

# 4. Clear sync queue
psql -c "UPDATE sync_queue SET status = 'cancelled' WHERE status = 'pending';"

# 5. Reset sync status
psql -c "UPDATE products SET sync_status = 'pending' WHERE sync_status = 'syncing';"

# 6. Restart sync with small batch
node scripts/sync-products.js --limit 10 --debug

# 7. If successful, resume normal operations
pm2 restart sync-worker
```

### 2. Data Corruption Recovery

```sql
-- Backup current state
CREATE TABLE products_backup_YYYYMMDD AS SELECT * FROM products;

-- Identify corrupted records
SELECT * FROM products 
WHERE shopify_product_id IS NOT NULL 
  AND (name IS NULL OR sku IS NULL OR price IS NULL);

-- Reset corrupted records
UPDATE products 
SET sync_status = 'pending',
    shopify_product_id = NULL,
    shopify_variant_id = NULL
WHERE id IN (SELECT id FROM corrupted_products);

-- Trigger resync
INSERT INTO sync_queue (entity_type, entity_id, operation, priority)
SELECT 'product', id, 'create', 1
FROM products
WHERE sync_status = 'pending';
```

### 3. Rollback Procedure

```bash
# 1. Disable webhooks
curl -X DELETE "https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/webhooks/${WEBHOOK_ID}.json" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ADMIN_ACCESS_TOKEN}"

# 2. Stop sync processes
pm2 stop all

# 3. Rollback database
psql < backups/pre-shopify-integration.sql

# 4. Rollback code
git revert --no-commit HEAD~5..HEAD
git commit -m "Rollback Shopify integration"
git push origin main

# 5. Deploy rollback
npm run deploy

# 6. Verify system stability
./scripts/health-check.sh
```

## Performance Optimization Tips

### 1. Database Optimization

```sql
-- Analyze tables for query optimization
ANALYZE products;
ANALYZE shipment_items;
ANALYZE sync_logs;

-- Vacuum to reclaim space
VACUUM ANALYZE products;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('products', 'orders', 'customers')
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
```

### 2. Caching Strategy

```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

async function getCachedProduct(productId: string) {
  const cached = cache.get(productId);
  if (cached) return cached;
  
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId)
  });
  
  cache.set(productId, product);
  return product;
}
```

### 3. Batch Processing Optimization

```typescript
// Optimize batch sizes based on performance
const OPTIMAL_BATCH_SIZES = {
  products: 50,    // Balanced for product complexity
  inventory: 200,  // Simple updates, can handle more
  customers: 100,  // Medium complexity
  orders: 25       // Complex with multiple relations
};

async function adaptiveBatchSync(entityType: string) {
  let batchSize = OPTIMAL_BATCH_SIZES[entityType] || 50;
  let successRate = 1.0;
  
  while (true) {
    const items = await getItemsForSync(entityType, batchSize);
    if (items.length === 0) break;
    
    const results = await syncBatch(items);
    successRate = results.filter(r => r.success).length / results.length;
    
    // Adapt batch size based on success rate
    if (successRate < 0.9) {
      batchSize = Math.max(10, Math.floor(batchSize * 0.8));
    } else if (successRate === 1.0) {
      batchSize = Math.min(250, Math.floor(batchSize * 1.2));
    }
    
    await sleep(1000); // Rate limiting
  }
}
```

## Support Contacts

### Internal Support
- Development Team: dev-team@company.com
- Database Admin: dba@company.com
- On-call Engineer: +84-XXX-XXX-XXXX

### Shopify Support
- API Support: https://help.shopify.com/en/api/support
- Partner Support: https://partners.shopify.com/support
- Status Page: https://status.shopify.com

### Escalation Path
1. Check this troubleshooting guide
2. Check Shopify API documentation
3. Contact internal development team
4. Open Shopify support ticket if needed
5. Escalate to Shopify Partner support for critical issues