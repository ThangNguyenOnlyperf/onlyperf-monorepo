# Shopify Developer Implementation Guide

## Overview

This step-by-step guide will walk you through implementing the Shopify integration for your warehouse management system. Follow these steps in order to ensure a smooth integration.

## Prerequisites

Before starting, ensure you have:

1. **Shopify Partner Account**: Create at [partners.shopify.com](https://partners.shopify.com)
2. **Development Store**: Set up a test store for development
3. **Node.js 18+**: Required for the application
4. **PostgreSQL**: Database must be running
5. **ngrok or similar**: For testing webhooks locally

## Phase 1: Initial Setup (Day 1)

### Step 1: Create Shopify Private App

1. Log into your Shopify admin panel
2. Navigate to Settings → Apps and sales channels → Develop apps
3. Click "Create an app"
4. Name it "Warehouse Management Integration"
5. Configure API scopes:

```
Required Scopes:
- read_products, write_products
- read_inventory, write_inventory  
- read_customers, write_customers
- read_orders, write_orders
- read_fulfillments, write_fulfillments
- read_locations
- read_shipping, write_shipping
```

6. Install the app and note down:
   - Admin API access token
   - API key and secret key
   - Webhook signing secret

### Step 2: Configure Environment Variables

Create or update `.env.local`:

```bash
# Shopify Configuration
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2024-01
SHOPIFY_LOCATION_ID=gid://shopify/Location/xxxxxxxxxxxxx

# Sync Configuration  
SYNC_BATCH_SIZE=50
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY_MS=1000
INVENTORY_RECONCILE_INTERVAL_MINUTES=15
CUSTOMER_DEDUP_INTERVAL_HOURS=24

# Queue Configuration
REDIS_URL=redis://localhost:6379  # Optional: for production queue
MAX_CONCURRENT_SYNCS=5
SYNC_TIMEOUT_MS=30000
```

### Step 3: Install Required Packages

```bash
pnpm add @shopify/admin-api-client @shopify/shopify-api
pnpm add bull bull-board  # For queue management
pnpm add p-retry p-queue  # For retry and rate limiting
pnpm add node-cron  # For scheduled jobs
```

### Step 4: Update Database Schema

Run the migration to add Shopify fields:

```bash
# Create migration file
touch drizzle/0007_shopify_integration.sql
```

Add the following content:

```sql
-- drizzle/0007_shopify_integration.sql
-- Shopify Integration Schema Updates

-- Products table extensions
ALTER TABLE products 
ADD COLUMN shopify_product_id VARCHAR(255),
ADD COLUMN shopify_variant_id VARCHAR(255),
ADD COLUMN sku VARCHAR(255),
ADD COLUMN barcode VARCHAR(255),
ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN last_synced_at TIMESTAMP,
ADD COLUMN shopify_inventory_item_id VARCHAR(255);

CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_sync_status ON products(sync_status);

-- Customers table extensions
ALTER TABLE customers
ADD COLUMN shopify_customer_id VARCHAR(255),
ADD COLUMN email VARCHAR(255),
ADD COLUMN first_name VARCHAR(255),
ADD COLUMN last_name VARCHAR(255),
ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN last_synced_at TIMESTAMP;

CREATE INDEX idx_customers_shopify_id ON customers(shopify_customer_id);
CREATE INDEX idx_customers_email ON customers(email);

-- Orders table extensions
ALTER TABLE orders
ADD COLUMN shopify_order_id VARCHAR(255),
ADD COLUMN shopify_order_number VARCHAR(255),
ADD COLUMN fulfillment_status VARCHAR(50),
ADD COLUMN financial_status VARCHAR(50),
ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN last_synced_at TIMESTAMP;

CREATE INDEX idx_orders_shopify_id ON orders(shopify_order_id);

-- Sync logs table
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  shopify_id VARCHAR(255),
  operation VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_entity ON sync_logs(entity_type, entity_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
```

Run the migration:

```bash
pnpm drizzle-kit push:pg
```

## Phase 2: Core Implementation (Day 2-3)

### Step 5: Create Shopify Client

Create `/src/lib/shopify/client.ts`:

```typescript
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-01';

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: ['read_products', 'write_products', 'read_inventory', 'write_inventory'],
  hostName: process.env.SHOPIFY_APP_URL!,
  apiVersion: ApiVersion.January24,
  restResources,
});

// Create session for API calls
const session = new Session({
  id: 'offline_session',
  shop: process.env.SHOPIFY_SHOP_DOMAIN!,
  state: 'state',
  isOnline: false,
  accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
});

export class ShopifyClient {
  private client: any;
  
  constructor() {
    this.client = new shopify.clients.Rest({ session });
  }
  
  // Product operations
  async createProduct(productData: any) {
    try {
      const response = await this.client.post({
        path: 'products',
        data: { product: productData },
      });
      
      return response.body.product;
    } catch (error) {
      console.error('Error creating product in Shopify:', error);
      throw error;
    }
  }
  
  async updateProduct(productId: string, productData: any) {
    try {
      const response = await this.client.put({
        path: `products/${productId}`,
        data: { product: productData },
      });
      
      return response.body.product;
    } catch (error) {
      console.error('Error updating product in Shopify:', error);
      throw error;
    }
  }
  
  // Inventory operations
  async updateInventoryLevel(inventoryItemId: string, locationId: string, available: number) {
    try {
      const response = await this.client.post({
        path: 'inventory_levels/set',
        data: {
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          available,
        },
      });
      
      return response.body.inventory_level;
    } catch (error) {
      console.error('Error updating inventory in Shopify:', error);
      throw error;
    }
  }
  
  // Customer operations
  async createCustomer(customerData: any) {
    try {
      const response = await this.client.post({
        path: 'customers',
        data: { customer: customerData },
      });
      
      return response.body.customer;
    } catch (error) {
      console.error('Error creating customer in Shopify:', error);
      throw error;
    }
  }
  
  // Order operations
  async getFulfillmentOrders(orderId: string) {
    try {
      const response = await this.client.get({
        path: `orders/${orderId}/fulfillment_orders`,
      });
      
      return response.body.fulfillment_orders;
    } catch (error) {
      console.error('Error getting fulfillment orders:', error);
      throw error;
    }
  }
  
  async createFulfillment(fulfillmentData: any) {
    try {
      const response = await this.client.post({
        path: 'fulfillments',
        data: { fulfillment: fulfillmentData },
      });
      
      return response.body.fulfillment;
    } catch (error) {
      console.error('Error creating fulfillment:', error);
      throw error;
    }
  }
}

export const shopifyClient = new ShopifyClient();
```

### Step 6: Implement Rate Limiter

Create `/src/lib/shopify/rate-limiter.ts`:

```typescript
import PQueue from 'p-queue';

export class RateLimiter {
  private queue: PQueue;
  private bucketSize = 40; // Shopify allows 40 requests per minute
  private refillRate = 2; // 2 requests per second (40/60 rounded up)
  private tokens = this.bucketSize;
  private lastRefill = Date.now();
  
  constructor() {
    // Limit concurrent requests to 2
    this.queue = new PQueue({ 
      concurrency: 2,
      interval: 1000,
      intervalCap: this.refillRate
    });
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.queue.add(async () => {
      await this.waitForToken();
      
      try {
        return await fn();
      } catch (error: any) {
        // Handle rate limit errors
        if (error.statusCode === 429) {
          const retryAfter = parseInt(error.headers['Retry-After'] || '5');
          await this.sleep(retryAfter * 1000);
          return this.execute(fn); // Retry
        }
        throw error;
      }
    });
  }
  
  private async waitForToken() {
    this.refillTokens();
    
    if (this.tokens <= 0) {
      const waitTime = Math.ceil((1 - this.tokens) * (1000 / this.refillRate));
      await this.sleep(waitTime);
      this.refillTokens();
    }
    
    this.tokens--;
  }
  
  private refillTokens() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const rateLimiter = new RateLimiter();
```

### Step 7: Create Sync Service

Create `/src/lib/shopify/sync-service.ts`:

```typescript
import { db } from '@/server/db';
import { products, customers, orders } from '@/server/db/schema';
import { shopifyClient } from './client';
import { rateLimiter } from './rate-limiter';
import { eq } from 'drizzle-orm';

export class SyncService {
  // Product sync
  async syncProductToShopify(productId: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: { brand: true }
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    const shopifyData = this.transformProductForShopify(product);
    
    try {
      let shopifyProduct;
      
      if (product.shopifyProductId) {
        // Update existing product
        shopifyProduct = await rateLimiter.execute(() =>
          shopifyClient.updateProduct(product.shopifyProductId, shopifyData)
        );
      } else {
        // Create new product
        shopifyProduct = await rateLimiter.execute(() =>
          shopifyClient.createProduct(shopifyData)
        );
        
        // Save Shopify IDs
        await db.update(products)
          .set({
            shopifyProductId: shopifyProduct.id.toString(),
            shopifyVariantId: shopifyProduct.variants[0].id.toString(),
            shopifyInventoryItemId: shopifyProduct.variants[0].inventory_item_id.toString(),
            syncStatus: 'synced',
            lastSyncedAt: new Date()
          })
          .where(eq(products.id, productId));
      }
      
      // Log success
      await this.logSync(
        'product',
        productId,
        shopifyProduct.id.toString(),
        'create',
        'success'
      );
      
      return shopifyProduct;
    } catch (error) {
      // Log failure
      await this.logSync(
        'product',
        productId,
        null,
        'create',
        'failed',
        error
      );
      throw error;
    }
  }
  
  private transformProductForShopify(product: any) {
    return {
      title: product.name,
      body_html: product.description || '',
      vendor: product.brand?.name || 'Default Vendor',
      product_type: product.model || '',
      tags: product.category || '',
      variants: [{
        price: product.price?.toString() || '0',
        sku: product.sku || this.generateSku(product),
        barcode: product.barcode || product.qrCode,
        inventory_management: 'shopify',
        inventory_policy: 'deny',
        weight: product.weight || 0,
        weight_unit: 'g'
      }]
    };
  }
  
  private generateSku(product: any): string {
    const brandCode = product.brand?.name?.substring(0, 3).toUpperCase() || 'XXX';
    const modelCode = product.model?.replace(/[^A-Za-z0-9]/g, '').substring(0, 10) || 'MODEL';
    return `${brandCode}-${modelCode}-${Date.now()}`;
  }
  
  // Inventory sync
  async syncInventoryToShopify(productId: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId)
    });
    
    if (!product?.shopifyInventoryItemId) {
      console.log('Product not synced to Shopify yet');
      return;
    }
    
    // Calculate available inventory
    const availableCount = await db.query.shipmentItems.count({
      where: and(
        eq(shipmentItems.productId, productId),
        eq(shipmentItems.status, 'received')
      )
    });
    
    try {
      await rateLimiter.execute(() =>
        shopifyClient.updateInventoryLevel(
          product.shopifyInventoryItemId,
          process.env.SHOPIFY_LOCATION_ID!,
          availableCount
        )
      );
      
      await this.logSync(
        'inventory',
        productId,
        product.shopifyInventoryItemId,
        'update',
        'success'
      );
    } catch (error) {
      await this.logSync(
        'inventory',
        productId,
        product.shopifyInventoryItemId,
        'update',
        'failed',
        error
      );
      throw error;
    }
  }
  
  // Customer sync
  async syncCustomerToShopify(customerId: string) {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId)
    });
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    const shopifyData = this.transformCustomerForShopify(customer);
    
    try {
      let shopifyCustomer;
      
      if (customer.shopifyCustomerId) {
        // Update existing
        shopifyCustomer = await rateLimiter.execute(() =>
          shopifyClient.updateCustomer(customer.shopifyCustomerId, shopifyData)
        );
      } else {
        // Create new
        shopifyCustomer = await rateLimiter.execute(() =>
          shopifyClient.createCustomer(shopifyData)
        );
        
        // Save Shopify ID
        await db.update(customers)
          .set({
            shopifyCustomerId: shopifyCustomer.id.toString(),
            syncStatus: 'synced',
            lastSyncedAt: new Date()
          })
          .where(eq(customers.id, customerId));
      }
      
      return shopifyCustomer;
    } catch (error) {
      await this.logSync(
        'customer',
        customerId,
        null,
        'create',
        'failed',
        error
      );
      throw error;
    }
  }
  
  private transformCustomerForShopify(customer: any) {
    const [firstName, ...lastNameParts] = (customer.name || '').split(' ');
    
    return {
      first_name: firstName || 'Guest',
      last_name: lastNameParts.join(' ') || '',
      email: customer.email || `${customer.phone}@example.com`,
      phone: this.formatPhoneNumber(customer.phone),
      addresses: customer.address ? [{
        address1: customer.address,
        city: 'Ho Chi Minh City', // Default, should be parsed
        province: 'Ho Chi Minh',
        country: 'VN',
        zip: '700000'
      }] : [],
      tags: 'POS_Customer',
      verified_email: false,
      accepts_marketing: false
    };
  }
  
  private formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add Vietnam country code if needed
    if (cleaned.startsWith('0')) {
      cleaned = '84' + cleaned.substring(1);
    }
    
    return '+' + cleaned;
  }
  
  // Sync logging
  private async logSync(
    entityType: string,
    entityId: string,
    shopifyId: string | null,
    operation: string,
    status: string,
    error?: any
  ) {
    await db.insert(syncLogs).values({
      entityType,
      entityId,
      shopifyId,
      operation,
      status,
      errorMessage: error?.message,
      requestData: error?.request,
      responseData: error?.response,
      createdAt: new Date()
    });
  }
}

export const syncService = new SyncService();
```

### Step 8: Update Server Actions

Modify existing server actions to include Shopify sync. Example for `/src/actions/productActions.ts`:

```typescript
import { syncService } from '@/lib/shopify/sync-service';

export async function createProductAction(data: ProductInput): Promise<ActionResult> {
  try {
    // Existing product creation logic
    const product = await db.insert(products).values({
      // ... your existing fields
    }).returning();
    
    // Sync to Shopify (async, don't wait)
    syncService.syncProductToShopify(product[0].id).catch(error => {
      console.error('Failed to sync product to Shopify:', error);
      // Queue for retry
    });
    
    return {
      success: true,
      message: 'Sản phẩm đã được tạo thành công',
      data: product[0]
    };
  } catch (error) {
    return {
      success: false,
      message: 'Lỗi khi tạo sản phẩm',
      data: null
    };
  }
}

export async function updateProductPriceAction(
  productId: string,
  price: number
): Promise<ActionResult> {
  try {
    // Update local price
    await db.update(products)
      .set({ price })
      .where(eq(products.id, productId));
    
    // Sync to Shopify
    await syncService.syncProductToShopify(productId);
    
    return {
      success: true,
      message: 'Giá sản phẩm đã được cập nhật',
      data: null
    };
  } catch (error) {
    return {
      success: false,
      message: 'Lỗi khi cập nhật giá',
      data: null
    };
  }
}
```

## Phase 3: Webhook Implementation (Day 4)

### Step 9: Create Webhook Handler

Create `/src/app/api/webhooks/shopify/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/server/db';
import { orders, customers, orderItems } from '@/server/db/schema';

// Verify webhook signature
function verifyWebhook(rawBody: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return hash === signature;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-Shopify-Hmac-Sha256');
  const topic = request.headers.get('X-Shopify-Topic');
  
  // Verify webhook
  if (!signature || !verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const data = JSON.parse(rawBody);
  
  try {
    switch(topic) {
      case 'orders/create':
        await handleOrderCreate(data);
        break;
        
      case 'orders/cancelled':
        await handleOrderCancelled(data);
        break;
        
      case 'customers/create':
        await handleCustomerCreate(data);
        break;
        
      case 'customers/update':
        await handleCustomerUpdate(data);
        break;
        
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error processing webhook ${topic}:`, error);
    // Return 200 to prevent Shopify retry storm
    return NextResponse.json({ success: true });
  }
}

async function handleOrderCreate(orderData: any) {
  // Check if customer exists
  let customer = await db.query.customers.findFirst({
    where: eq(customers.shopifyCustomerId, orderData.customer.id.toString())
  });
  
  if (!customer && orderData.customer) {
    // Create customer
    customer = await db.insert(customers).values({
      shopifyCustomerId: orderData.customer.id.toString(),
      name: `${orderData.customer.first_name} ${orderData.customer.last_name}`,
      email: orderData.customer.email,
      phone: orderData.customer.phone,
      address: orderData.shipping_address?.address1
    }).returning()[0];
  }
  
  // Create order
  const order = await db.insert(orders).values({
    shopifyOrderId: orderData.id.toString(),
    shopifyOrderNumber: orderData.order_number.toString(),
    orderNumber: `SH-${orderData.order_number}`,
    customerId: customer?.id,
    totalAmount: parseFloat(orderData.total_price),
    paymentMethod: orderData.gateway || 'manual',
    paymentStatus: orderData.financial_status,
    fulfillmentStatus: orderData.fulfillment_status || 'unfulfilled',
    processedBy: 'shopify_webhook'
  }).returning()[0];
  
  // Create order items
  for (const lineItem of orderData.line_items) {
    // Find local product by SKU or Shopify ID
    const product = await db.query.products.findFirst({
      where: or(
        eq(products.shopifyVariantId, lineItem.variant_id?.toString()),
        eq(products.sku, lineItem.sku)
      )
    });
    
    if (product) {
      // Reserve inventory
      const availableItems = await db.query.shipmentItems.findMany({
        where: and(
          eq(shipmentItems.productId, product.id),
          eq(shipmentItems.status, 'received')
        ),
        limit: lineItem.quantity
      });
      
      // Update status to reserved
      for (const item of availableItems) {
        await db.update(shipmentItems)
          .set({ status: 'sold' })
          .where(eq(shipmentItems.id, item.id));
      }
      
      // Create order item
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: product.id,
        quantity: lineItem.quantity,
        price: parseFloat(lineItem.price),
        shopifyLineItemId: lineItem.id.toString()
      });
    }
  }
}

async function handleOrderCancelled(orderData: any) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.shopifyOrderId, orderData.id.toString()),
    with: { orderItems: true }
  });
  
  if (order) {
    // Release inventory
    for (const item of order.orderItems) {
      await db.update(shipmentItems)
        .set({ status: 'received' })
        .where(and(
          eq(shipmentItems.productId, item.productId),
          eq(shipmentItems.status, 'sold')
        ))
        .limit(item.quantity);
    }
    
    // Update order status
    await db.update(orders)
      .set({
        paymentStatus: 'cancelled',
        fulfillmentStatus: 'cancelled'
      })
      .where(eq(orders.id, order.id));
  }
}

async function handleCustomerCreate(customerData: any) {
  // Check if customer already exists by email or phone
  const existing = await db.query.customers.findFirst({
    where: or(
      eq(customers.email, customerData.email),
      eq(customers.phone, customerData.phone)
    )
  });
  
  if (!existing) {
    await db.insert(customers).values({
      shopifyCustomerId: customerData.id.toString(),
      name: `${customerData.first_name} ${customerData.last_name}`,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.default_address?.address1,
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    });
  } else {
    // Update with Shopify ID
    await db.update(customers)
      .set({
        shopifyCustomerId: customerData.id.toString(),
        syncStatus: 'synced',
        lastSyncedAt: new Date()
      })
      .where(eq(customers.id, existing.id));
  }
}

async function handleCustomerUpdate(customerData: any) {
  await db.update(customers)
    .set({
      name: `${customerData.first_name} ${customerData.last_name}`,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.default_address?.address1,
      lastSyncedAt: new Date()
    })
    .where(eq(customers.shopifyCustomerId, customerData.id.toString()));
}
```

### Step 10: Register Webhooks

Create `/src/lib/shopify/webhook-registration.ts`:

```typescript
import { shopifyClient } from './client';

export async function registerWebhooks() {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify`;
  
  const webhooks = [
    { topic: 'orders/create', address: webhookUrl },
    { topic: 'orders/cancelled', address: webhookUrl },
    { topic: 'orders/fulfilled', address: webhookUrl },
    { topic: 'customers/create', address: webhookUrl },
    { topic: 'customers/update', address: webhookUrl },
    { topic: 'products/update', address: webhookUrl }
  ];
  
  for (const webhook of webhooks) {
    try {
      await shopifyClient.registerWebhook(webhook);
      console.log(`Webhook registered: ${webhook.topic}`);
    } catch (error) {
      console.error(`Failed to register webhook ${webhook.topic}:`, error);
    }
  }
}

// Run this once during deployment
// You can create a script or API endpoint to trigger this
```

## Phase 4: Batch Jobs (Day 5)

### Step 11: Create Scheduled Jobs

Create `/src/lib/jobs/sync-jobs.ts`:

```typescript
import cron from 'node-cron';
import { syncService } from '@/lib/shopify/sync-service';
import { db } from '@/server/db';
import { products, customers, orders } from '@/server/db/schema';
import { eq, lt, or, isNull } from 'drizzle-orm';

export function initializeSyncJobs() {
  // Product sync - every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Starting hourly product sync...');
    await syncPendingProducts();
  });
  
  // Inventory reconciliation - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Starting inventory reconciliation...');
    await reconcileInventory();
  });
  
  // Customer deduplication - daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Starting customer deduplication...');
    await deduplicateCustomers();
  });
  
  // Failed sync retry - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Retrying failed syncs...');
    await retryFailedSyncs();
  });
}

async function syncPendingProducts() {
  const pendingProducts = await db.query.products.findMany({
    where: or(
      eq(products.syncStatus, 'pending'),
      lt(products.lastSyncedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
    ),
    limit: 50
  });
  
  for (const product of pendingProducts) {
    try {
      await syncService.syncProductToShopify(product.id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
    } catch (error) {
      console.error(`Failed to sync product ${product.id}:`, error);
    }
  }
}

async function reconcileInventory() {
  const productsWithShopify = await db.query.products.findMany({
    where: not(isNull(products.shopifyInventoryItemId))
  });
  
  for (const product of productsWithShopify) {
    try {
      await syncService.syncInventoryToShopify(product.id);
    } catch (error) {
      console.error(`Failed to sync inventory for ${product.id}:`, error);
    }
  }
}

async function deduplicateCustomers() {
  // Find duplicate customers by phone or email
  const duplicates = await db.execute(sql`
    SELECT phone, email, COUNT(*) as count
    FROM customers
    WHERE phone IS NOT NULL OR email IS NOT NULL
    GROUP BY phone, email
    HAVING COUNT(*) > 1
  `);
  
  for (const dup of duplicates) {
    const customers = await db.query.customers.findMany({
      where: or(
        eq(customers.phone, dup.phone),
        eq(customers.email, dup.email)
      ),
      orderBy: [desc(customers.createdAt)]
    });
    
    if (customers.length > 1) {
      // Keep the first (newest) and merge others
      const primary = customers[0];
      const toMerge = customers.slice(1);
      
      for (const customer of toMerge) {
        // Update orders to point to primary
        await db.update(orders)
          .set({ customerId: primary.id })
          .where(eq(orders.customerId, customer.id));
        
        // Delete duplicate
        await db.delete(customers)
          .where(eq(customers.id, customer.id));
      }
    }
  }
}

async function retryFailedSyncs() {
  const failedSyncs = await db.query.syncLogs.findMany({
    where: and(
      eq(syncLogs.status, 'failed'),
      lt(syncLogs.retryCount, 3)
    ),
    limit: 20
  });
  
  for (const sync of failedSyncs) {
    try {
      switch(sync.entityType) {
        case 'product':
          await syncService.syncProductToShopify(sync.entityId);
          break;
        case 'customer':
          await syncService.syncCustomerToShopify(sync.entityId);
          break;
        case 'inventory':
          await syncService.syncInventoryToShopify(sync.entityId);
          break;
      }
      
      // Update sync log
      await db.update(syncLogs)
        .set({ status: 'success' })
        .where(eq(syncLogs.id, sync.id));
        
    } catch (error) {
      // Increment retry count
      await db.update(syncLogs)
        .set({ retryCount: sync.retryCount + 1 })
        .where(eq(syncLogs.id, sync.id));
    }
  }
}
```

### Step 12: Initialize Jobs on Server Start

Update `/src/app/layout.tsx` or create a server initialization file:

```typescript
// /src/lib/server-init.ts
import { initializeSyncJobs } from '@/lib/jobs/sync-jobs';

let initialized = false;

export function initializeServer() {
  if (initialized) return;
  
  // Initialize scheduled jobs
  if (process.env.NODE_ENV === 'production') {
    initializeSyncJobs();
    console.log('Sync jobs initialized');
  }
  
  initialized = true;
}

// Call this in your root layout or API route
initializeServer();
```

## Phase 5: Testing (Day 6)

### Step 13: Create Test Suite

Create `/tests/shopify-integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncService } from '@/lib/shopify/sync-service';
import { db } from '@/server/db';

describe('Shopify Integration', () => {
  let testProduct: any;
  let testCustomer: any;
  
  beforeEach(async () => {
    // Create test data
    testProduct = await db.insert(products).values({
      name: 'Test Product',
      price: 100000,
      sku: 'TEST-001'
    }).returning()[0];
    
    testCustomer = await db.insert(customers).values({
      name: 'Test Customer',
      phone: '0901234567',
      email: 'test@example.com'
    }).returning()[0];
  });
  
  afterEach(async () => {
    // Cleanup
    await db.delete(products).where(eq(products.id, testProduct.id));
    await db.delete(customers).where(eq(customers.id, testCustomer.id));
  });
  
  describe('Product Sync', () => {
    it('should sync product to Shopify', async () => {
      const result = await syncService.syncProductToShopify(testProduct.id);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(testProduct.name);
      
      // Check that Shopify ID was saved
      const updated = await db.query.products.findFirst({
        where: eq(products.id, testProduct.id)
      });
      
      expect(updated.shopifyProductId).toBeDefined();
    });
  });
  
  describe('Customer Sync', () => {
    it('should sync customer to Shopify', async () => {
      const result = await syncService.syncCustomerToShopify(testCustomer.id);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(testCustomer.email);
    });
  });
  
  describe('Inventory Sync', () => {
    it('should calculate and sync inventory', async () => {
      // Create shipment items
      await db.insert(shipmentItems).values([
        { productId: testProduct.id, status: 'received' },
        { productId: testProduct.id, status: 'received' },
        { productId: testProduct.id, status: 'sold' }
      ]);
      
      await syncService.syncInventoryToShopify(testProduct.id);
      
      // Verify inventory level (should be 2)
      // This would check against Shopify API in real test
    });
  });
});
```

### Step 14: Manual Testing Checklist

Create a checklist for manual testing:

```markdown
# Shopify Integration Testing Checklist

## Product Sync
- [ ] Create product locally → Verify appears in Shopify
- [ ] Update product price → Verify price updates in Shopify
- [ ] Update product details → Verify changes sync
- [ ] Delete product → Verify handling (should not delete in Shopify)

## Inventory Sync
- [ ] Receive shipment → Verify inventory increases in Shopify
- [ ] Process sale → Verify inventory decreases
- [ ] Cancel order → Verify inventory restored

## Order Processing
- [ ] Create order in Shopify → Verify appears locally
- [ ] Cancel order in Shopify → Verify status updates locally
- [ ] Fulfill order locally → Verify fulfillment syncs to Shopify

## Customer Sync
- [ ] Create customer locally → Verify appears in Shopify
- [ ] Create customer in Shopify → Verify appears locally
- [ ] Update customer → Verify changes sync both ways

## Error Handling
- [ ] Disconnect network → Verify graceful failure
- [ ] Invalid data → Verify validation errors
- [ ] Rate limiting → Verify retry logic works

## Performance
- [ ] Sync 100+ products → Verify completes within 5 minutes
- [ ] Process 50 orders → Verify no timeouts
- [ ] Reconcile 1000+ inventory items → Verify accuracy
```

## Phase 6: Deployment (Day 7)

### Step 15: Production Deployment Checklist

```markdown
# Production Deployment Checklist

## Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Backup current database
- [ ] Shopify app approved and installed

## Deployment Steps
1. [ ] Deploy database migrations
2. [ ] Deploy application code
3. [ ] Register webhooks
4. [ ] Run initial product sync
5. [ ] Verify webhook endpoints accessible
6. [ ] Start scheduled jobs
7. [ ] Monitor logs for errors

## Post-Deployment
- [ ] Verify products syncing
- [ ] Test order creation flow
- [ ] Check inventory levels
- [ ] Monitor sync metrics
- [ ] Set up alerts

## Rollback Plan
1. [ ] Stop scheduled jobs
2. [ ] Unregister webhooks
3. [ ] Revert code deployment
4. [ ] Restore database if needed
```

### Step 16: Monitoring Setup

Create `/src/app/admin/shopify-sync/page.tsx` for monitoring:

```typescript
export default async function ShopifySyncPage() {
  const syncStats = await db.query.syncLogs.groupBy({
    by: ['entityType', 'status'],
    _count: true
  });
  
  const recentErrors = await db.query.syncLogs.findMany({
    where: eq(syncLogs.status, 'failed'),
    orderBy: [desc(syncLogs.createdAt)],
    limit: 10
  });
  
  const pendingItems = await db.query.products.count({
    where: eq(products.syncStatus, 'pending')
  });
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Shopify Sync Dashboard</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            {syncStats.map(stat => (
              <div key={`${stat.entityType}-${stat.status}`}>
                {stat.entityType}: {stat.status} ({stat._count})
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pending Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{pendingItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            {recentErrors.map(error => (
              <div key={error.id} className="text-sm">
                {error.entityType}: {error.errorMessage}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## Troubleshooting Common Issues

### Issue 1: Rate Limiting
**Solution**: Implement exponential backoff and queue management

### Issue 2: Webhook Timeout
**Solution**: Process webhooks asynchronously using queues

### Issue 3: Data Inconsistency
**Solution**: Implement reconciliation jobs and monitoring

### Issue 4: Network Failures
**Solution**: Implement retry logic and dead letter queues

## Next Steps

1. Test thoroughly in development environment
2. Set up staging environment with test Shopify store
3. Train staff on new integration features
4. Document operational procedures
5. Plan phased rollout to production

## Support Resources

- [Shopify API Documentation](https://shopify.dev/docs/admin-api)
- [Next.js Documentation](https://nextjs.org/docs)
- [DrizzleORM Documentation](https://orm.drizzle.team/docs)
- Internal Slack channel: #shopify-integration