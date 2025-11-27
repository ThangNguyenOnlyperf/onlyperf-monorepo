# Webhook Retry System - Manual Retry Implementation

**Version:** 1.0
**Last Updated:** 2025-11-14
**Related:** [Customer Portal Documentation](./customer-portal.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Sync Monitoring Page](#sync-monitoring-page)
4. [Implementation Guide](#implementation-guide)
5. [UI Components](#ui-components)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

When a Shopify order is fulfilled in the warehouse, the system sends a webhook to OnlyPerf to create a `product_units` record for the customer portal. However, webhook delivery can fail due to:

- Network issues
- OnlyPerf server downtime
- Invalid payload data
- Authentication errors

This document describes a **manual retry system** that allows warehouse staff to:
- Monitor webhook delivery status
- View failed webhook attempts with error details
- Manually retry failed webhooks with a single click
- Bulk retry multiple failed webhooks

### Design Decisions

**Why Manual Retry (Not Automatic)?**
- ✅ **Simpler implementation** - No queue infrastructure needed
- ✅ **Staff oversight** - Team can investigate errors before retrying
- ✅ **Debugging friendly** - Easy to see what failed and why
- ✅ **Cost effective** - No background job system required
- ✅ **Similar to existing patterns** - Warehouse already has manual buttons (e.g., products table)

**Trade-offs:**
- ⚠️ Requires staff intervention for failed webhooks
- ⚠️ Not real-time (staff must check sync page)
- ⚠️ No automatic exponential backoff

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FULFILLMENT FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. Staff completes order fulfillment
        ↓
2. System triggers webhook to OnlyPerf
        ↓
3. Create sync_log record (status: pending)
        ↓
   ┌────┴────┐
   │  Success │  Webhook delivered (HTTP 200)
   │   ✓      │  → Update sync_log (status: success)
   └──────────┘  → Customer portal now available

   ┌────┴────┐
   │  Failed  │  Webhook failed (timeout, 500, etc.)
   │   ✗      │  → Update sync_log (status: failed, errorMessage)
   └──────────┘  → Log error details
                 → Staff can retry later

4. Staff views /sync page
        ↓
5. See failed webhooks with error messages
        ↓
6. Click "Retry" button
        ↓
7. System re-sends webhook with original payload
        ↓
8. Update sync_log with new result
```

---

## Database Schema

### onlyperf_sync_log Table (Warehouse App)

**Purpose:** Track all webhook delivery attempts to OnlyPerf

```typescript
// /warehouse-management/src/db/schema/onlyperf-sync-log.ts

import { pgTable, uuid, varchar, timestamp, jsonb, integer, pgEnum, text } from 'drizzle-orm/pg-core';
import { orders } from './orders';

export const syncStatusEnum = pgEnum('sync_status', [
  'pending',   // Webhook about to be sent
  'success',   // Webhook delivered successfully (HTTP 200)
  'failed'     // Webhook failed (network error, HTTP 4xx/5xx)
]);

export const syncEventEnum = pgEnum('sync_event', [
  'product.sold',      // Order fulfilled, product sold
  'product.returned',  // Product returned by customer
  'product.replaced'   // Product replaced (warranty)
]);

export const onlyperfSyncLog = pgTable('onlyperf_sync_log', {
  // Primary key
  id: uuid('id').defaultRandom().primaryKey(),

  // References
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),

  // Webhook details
  qrCode: varchar('qr_code', { length: 8 }).notNull(), // ABCD1234
  event: syncEventEnum('event').notNull(),

  // Status tracking
  status: syncStatusEnum('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),

  // Payload and response
  payload: jsonb('payload').notNull().$type<{
    event: string;
    data: {
      qrCode: string;
      shopifyOrderId: string;
      shopifyOrderNumber: string;
      customerId: string;
      productId: string;
      shopifyProductId: string;
      shopifyVariantId: string;
      purchaseDate: string;
      warrantyMonths: number;
      productDetails: Record<string, any>;
    };
  }>(),

  // Response details
  responseStatus: integer('response_status'), // HTTP status code (200, 500, etc.)
  errorMessage: text('error_message'), // Error details if failed

  // Timestamps
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  succeededAt: timestamp('succeeded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Indexes for performance
export const onlyperfSyncLogIndexes = {
  statusIdx: index('onlyperf_sync_log_status_idx').on(onlyperfSyncLog.status),
  orderIdIdx: index('onlyperf_sync_log_order_id_idx').on(onlyperfSyncLog.orderId),
  qrCodeIdx: index('onlyperf_sync_log_qr_code_idx').on(onlyperfSyncLog.qrCode)
};

// Type exports
export type OnlyperfSyncLog = typeof onlyperfSyncLog.$inferSelect;
export type NewOnlyperfSyncLog = typeof onlyperfSyncLog.$inferInsert;
```

### Migration

```bash
# In warehouse-management directory

# Generate migration
pnpm db:generate

# Review migration file in /drizzle folder

# Apply migration
pnpm db:migrate

# Verify in Drizzle Studio
pnpm db:studio
```

### Example Records

**Successful Sync:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "123e4567-e89b-12d3-a456-426614174000",
  "qrCode": "ABCD1234",
  "event": "product.sold",
  "status": "success",
  "attempts": 1,
  "payload": {
    "event": "product.sold",
    "data": {
      "qrCode": "ABCD1234",
      "shopifyOrderId": "gid://shopify/Order/123",
      "shopifyOrderNumber": "#1001",
      "customerId": "gid://shopify/Customer/456",
      "productId": "uuid",
      "shopifyProductId": "gid://shopify/Product/789",
      "shopifyVariantId": "gid://shopify/ProductVariant/101",
      "purchaseDate": "2025-11-14T10:30:00Z",
      "warrantyMonths": 12,
      "productDetails": { /* ... */ }
    }
  },
  "responseStatus": 200,
  "errorMessage": null,
  "lastAttemptAt": "2025-11-14T10:35:00Z",
  "succeededAt": "2025-11-14T10:35:00Z",
  "createdAt": "2025-11-14T10:35:00Z"
}
```

**Failed Sync:**
```json
{
  "id": "660f9511-f9ac-23e4-b567-537725285111",
  "orderId": "234f5678-f90c-23e4-b567-537725285111",
  "qrCode": "XYZW9876",
  "event": "product.sold",
  "status": "failed",
  "attempts": 1,
  "payload": { /* same structure as above */ },
  "responseStatus": 500,
  "errorMessage": "Connection timeout: OnlyPerf server did not respond within 10s",
  "lastAttemptAt": "2025-11-14T11:00:00Z",
  "succeededAt": null,
  "createdAt": "2025-11-14T11:00:00Z"
}
```

---

## Sync Monitoring Page

### Page Route

**Location:** `/warehouse-management/src/app/sync/page.tsx`

**Access:** Staff only (requires warehouse authentication)

### UI Design

```
┌──────────────────────────────────────────────────────────────┐
│  OnlyPerf Webhook Sync Monitor                   [Bulk Retry]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  🔍 Search: [_________________]  Filter: [All ▼]  [Refresh]  │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Order #  │ QR Code  │ Event         │ Status   │ Actions    │
├───────────┼──────────┼───────────────┼──────────┼────────────┤
│  #1001    │ ABCD1234 │ product.sold  │ ✓ Success│ [View]     │
│  #1002    │ EFGH5678 │ product.sold  │ ✗ Failed │ [Retry]    │
│           │          │               │          │ [View Log] │
│  #1003    │ IJKL9012 │ product.sold  │ ⧗ Pending│ [Cancel]   │
│  #1004    │ MNOP3456 │ product.sold  │ ✗ Failed │ [Retry]    │
│           │          │               │          │ [View Log] │
├──────────────────────────────────────────────────────────────┤
│  Showing 1-10 of 245            [◀ Prev]  [1] [2] [3]  [Next ▶]│
└──────────────────────────────────────────────────────────────┘

Status Legend:
✓ Success - Webhook delivered successfully
✗ Failed  - Webhook failed (see error details)
⧗ Pending - Webhook queued but not sent yet
```

### Features

1. **Status Filters**
   - All syncs
   - Failed only (most important)
   - Success only
   - Pending only

2. **Search**
   - By order number (#1001)
   - By QR code (ABCD1234)
   - By Shopify order ID

3. **Actions**
   - **Retry** - Re-send webhook (failed/pending only)
   - **View Log** - See full payload, response, error details
   - **Bulk Retry** - Retry all failed webhooks at once

4. **Auto-refresh**
   - Page refreshes every 30 seconds
   - Shows real-time status updates

---

## Implementation Guide

### Step 1: Update Webhook Function

**File:** `/warehouse-management/src/actions/webhooks.ts`

```typescript
'use server';

import { db } from '@/db';
import { orders, orderItems, onlyperfSyncLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ONLYPERF_WEBHOOK_URL = process.env.ONLYPERF_WEBHOOK_URL || 'https://onlyperf.com/api/webhooks/warehouse-sync';
const WEBHOOK_SECRET = process.env.ONLYPERF_WEBHOOK_SECRET;
const WEBHOOK_TIMEOUT = 10000; // 10 seconds

interface WebhookResult {
  success: boolean;
  status?: number;
  error?: string;
}

async function sendWebhookWithTimeout(payload: any): Promise<WebhookResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    const response = await fetch(ONLYPERF_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET!
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    return {
      success: true,
      status: response.status
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Connection timeout: OnlyPerf server did not respond within ${WEBHOOK_TIMEOUT / 1000}s`
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown network error'
    };
  }
}

export async function notifyOnlyPerfOrderFulfilled(orderId: string) {
  try {
    // 1. Get order with all items
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderItems: {
          with: {
            product: true,
            shipmentItem: true
          }
        }
      }
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 2. Send webhook for each item with QR code
    const results = await Promise.allSettled(
      order.orderItems
        .filter(item => item.qrCode && item.shipmentItem)
        .map(async (item) => {
          const payload = {
            event: 'product.sold',
            data: {
              qrCode: item.qrCode!,
              shopifyOrderId: order.shopifyOrderId!,
              shopifyOrderNumber: order.shopifyOrderNumber!,
              customerId: order.customerId || '',
              productId: item.product.id,
              shopifyProductId: item.product.shopifyProductId || '',
              shopifyVariantId: item.product.shopifyVariantId || '',
              purchaseDate: order.createdAt.toISOString(),
              warrantyMonths: 12,
              productDetails: {
                name: item.product.name,
                brand: item.product.brand,
                model: item.product.model,
                color: item.product.color,
                weight: item.product.weight,
                size: item.product.size,
                thickness: item.product.thickness,
                material: item.product.material,
                handleLength: item.product.handleLength,
                handleCircumference: item.product.handleCircumference,
                price: item.price
              }
            }
          };

          // Create sync log entry (pending)
          const [syncLog] = await db
            .insert(onlyperfSyncLog)
            .values({
              orderId: order.id,
              qrCode: item.qrCode!,
              event: 'product.sold',
              status: 'pending',
              payload,
              attempts: 1,
              lastAttemptAt: new Date()
            })
            .returning();

          // Send webhook
          const result = await sendWebhookWithTimeout(payload);

          // Update sync log with result
          await db
            .update(onlyperfSyncLog)
            .set({
              status: result.success ? 'success' : 'failed',
              responseStatus: result.status,
              errorMessage: result.error || null,
              succeededAt: result.success ? new Date() : null,
              lastAttemptAt: new Date()
            })
            .where(eq(onlyperfSyncLog.id, syncLog.id));

          if (!result.success) {
            console.error(`❌ Webhook failed for QR ${item.qrCode}:`, result.error);
          } else {
            console.log(`✅ Webhook succeeded for QR ${item.qrCode}`);
          }

          return { syncLogId: syncLog.id, ...result };
        })
    );

    // 3. Return summary
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    return {
      success: true,
      total: results.length,
      succeeded,
      failed
    };

  } catch (error) {
    console.error('Error sending OnlyPerf webhook:', error);
    throw error;
  }
}
```

### Step 2: Create Retry Action

**File:** `/warehouse-management/src/actions/webhookRetryActions.ts`

```typescript
'use server';

import { db } from '@/db';
import { onlyperfSyncLog } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const ONLYPERF_WEBHOOK_URL = process.env.ONLYPERF_WEBHOOK_URL || 'https://onlyperf.com/api/webhooks/warehouse-sync';
const WEBHOOK_SECRET = process.env.ONLYPERF_WEBHOOK_SECRET;
const WEBHOOK_TIMEOUT = 10000;

interface RetryResult {
  success: boolean;
  status?: number;
  error?: string;
}

async function sendWebhook(payload: any): Promise<RetryResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    const response = await fetch(ONLYPERF_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET!
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    return {
      success: true,
      status: response.status
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Connection timeout: OnlyPerf server did not respond within ${WEBHOOK_TIMEOUT / 1000}s`
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown network error'
    };
  }
}

/**
 * Retry a single failed webhook
 */
export async function retryWebhookAction(syncLogId: string) {
  try {
    // 1. Get sync log record
    const syncLog = await db.query.onlyperfSyncLog.findFirst({
      where: eq(onlyperfSyncLog.id, syncLogId)
    });

    if (!syncLog) {
      throw new Error(`Sync log ${syncLogId} not found`);
    }

    // 2. Check if already succeeded
    if (syncLog.status === 'success') {
      return {
        success: false,
        message: 'Webhook already succeeded, no retry needed'
      };
    }

    // 3. Re-send webhook with original payload
    const result = await sendWebhook(syncLog.payload);

    // 4. Update sync log
    await db
      .update(onlyperfSyncLog)
      .set({
        status: result.success ? 'success' : 'failed',
        responseStatus: result.status,
        errorMessage: result.error || null,
        attempts: syncLog.attempts + 1,
        lastAttemptAt: new Date(),
        succeededAt: result.success ? new Date() : syncLog.succeededAt
      })
      .where(eq(onlyperfSyncLog.id, syncLogId));

    // 5. Revalidate sync page
    revalidatePath('/sync');

    if (result.success) {
      return {
        success: true,
        message: `Webhook for QR ${syncLog.qrCode} succeeded`
      };
    } else {
      return {
        success: false,
        message: `Webhook failed: ${result.error}`
      };
    }

  } catch (error: any) {
    console.error('Retry webhook error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error'
    };
  }
}

/**
 * Bulk retry all failed webhooks
 */
export async function retryAllFailedWebhooksAction() {
  try {
    // 1. Get all failed sync logs
    const failedLogs = await db.query.onlyperfSyncLog.findMany({
      where: eq(onlyperfSyncLog.status, 'failed'),
      limit: 50 // Limit to avoid overwhelming the server
    });

    if (failedLogs.length === 0) {
      return {
        success: true,
        message: 'No failed webhooks to retry',
        total: 0,
        succeeded: 0,
        failed: 0
      };
    }

    // 2. Retry each webhook
    const results = await Promise.allSettled(
      failedLogs.map(async (syncLog) => {
        const result = await sendWebhook(syncLog.payload);

        await db
          .update(onlyperfSyncLog)
          .set({
            status: result.success ? 'success' : 'failed',
            responseStatus: result.status,
            errorMessage: result.error || null,
            attempts: syncLog.attempts + 1,
            lastAttemptAt: new Date(),
            succeededAt: result.success ? new Date() : syncLog.succeededAt
          })
          .where(eq(onlyperfSyncLog.id, syncLog.id));

        return result;
      })
    );

    // 3. Count results
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    // 4. Revalidate sync page
    revalidatePath('/sync');

    return {
      success: true,
      message: `Bulk retry completed: ${succeeded} succeeded, ${failed} failed`,
      total: failedLogs.length,
      succeeded,
      failed
    };

  } catch (error: any) {
    console.error('Bulk retry error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error',
      total: 0,
      succeeded: 0,
      failed: 0
    };
  }
}
```

### Step 3: Create Sync Monitoring Page

**File:** `/warehouse-management/src/app/sync/page.tsx`

```typescript
import { db } from '@/db';
import { onlyperfSyncLog } from '@/db/schema';
import { eq, desc, like, or } from 'drizzle-orm';
import { SyncTable } from '@/components/sync/SyncTable';
import { BulkRetryButton } from '@/components/sync/BulkRetryButton';

interface SyncPageProps {
  searchParams: Promise<{
    status?: 'all' | 'success' | 'failed' | 'pending';
    search?: string;
    page?: string;
  }>;
}

export default async function SyncPage({ searchParams }: SyncPageProps) {
  const params = await searchParams;
  const status = params.status || 'all';
  const search = params.search || '';
  const page = parseInt(params.page || '1');
  const perPage = 20;

  // Build query
  let query = db.select().from(onlyperfSyncLog);

  // Filter by status
  if (status !== 'all') {
    query = query.where(eq(onlyperfSyncLog.status, status));
  }

  // Search by order number or QR code
  if (search) {
    query = query.where(
      or(
        like(onlyperfSyncLog.qrCode, `%${search}%`)
        // TODO: Join with orders table to search by order number
      )
    );
  }

  // Order by most recent first
  query = query.orderBy(desc(onlyperfSyncLog.createdAt));

  // Pagination
  const offset = (page - 1) * perPage;
  const logs = await query.limit(perPage).offset(offset);

  // Count failed webhooks
  const failedCount = await db
    .select({ count: count() })
    .from(onlyperfSyncLog)
    .where(eq(onlyperfSyncLog.status, 'failed'));

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">OnlyPerf Webhook Sync Monitor</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track webhook delivery status to customer portal
          </p>
        </div>

        {failedCount[0].count > 0 && (
          <BulkRetryButton failedCount={failedCount[0].count} />
        )}
      </div>

      <SyncTable logs={logs} currentStatus={status} searchQuery={search} />
    </div>
  );
}
```

---

## UI Components

### 1. SyncTable Component

**File:** `/warehouse-management/src/components/sync/SyncTable.tsx`

```typescript
'use client';

import { OnlyperfSyncLog } from '@/db/schema';
import { SyncStatusBadge } from './SyncStatusBadge';
import { RetryButton } from './RetryButton';
import { ViewLogButton } from './ViewLogButton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';

interface SyncTableProps {
  logs: OnlyperfSyncLog[];
  currentStatus: string;
  searchQuery: string;
}

export function SyncTable({ logs, currentStatus, searchQuery }: SyncTableProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by QR code or order number..."
            defaultValue={searchQuery}
            className="w-full px-4 py-2 border rounded"
          />
        </div>

        <select
          defaultValue={currentStatus}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Order #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                QR Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Attempt
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Attempts
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/orders/${log.orderId}`}
                    className="text-blue-600 hover:underline"
                  >
                    {/* TODO: Display order number */}
                    {log.orderId.slice(0, 8)}...
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {log.qrCode}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.event}
                </td>
                <td className="px-4 py-3">
                  <SyncStatusBadge
                    status={log.status}
                    errorMessage={log.errorMessage}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.lastAttemptAt
                    ? formatDistanceToNow(log.lastAttemptAt, {
                        addSuffix: true,
                        locale: vi
                      })
                    : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.attempts}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {(log.status === 'failed' || log.status === 'pending') && (
                      <RetryButton syncLogId={log.id} qrCode={log.qrCode} />
                    )}
                    <ViewLogButton log={log} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No webhook sync logs found
        </div>
      )}
    </div>
  );
}
```

### 2. SyncStatusBadge Component

**File:** `/warehouse-management/src/components/sync/SyncStatusBadge.tsx`

```typescript
'use client';

import { Tooltip } from '@/components/ui/Tooltip';

interface SyncStatusBadgeProps {
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string | null;
}

export function SyncStatusBadge({ status, errorMessage }: SyncStatusBadgeProps) {
  const config = {
    success: {
      icon: '✓',
      label: 'Success',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    failed: {
      icon: '✗',
      label: 'Failed',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    pending: {
      icon: '⧗',
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  };

  const { icon, label, className } = config[status];

  const badge = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded ${className}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );

  if (status === 'failed' && errorMessage) {
    return (
      <Tooltip content={errorMessage}>
        {badge}
      </Tooltip>
    );
  }

  return badge;
}
```

### 3. RetryButton Component

**File:** `/warehouse-management/src/components/sync/RetryButton.tsx`

```typescript
'use client';

import { useState, useTransition } from 'react';
import { retryWebhookAction } from '@/actions/webhookRetryActions';
import { toast } from 'sonner';

interface RetryButtonProps {
  syncLogId: string;
  qrCode: string;
}

export function RetryButton({ syncLogId, qrCode }: RetryButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      const result = await retryWebhookAction(syncLogId);

      if (result.success) {
        toast.success(result.message || 'Webhook resent successfully');
      } else {
        toast.error(result.message || 'Failed to retry webhook');
      }
    });
  };

  return (
    <button
      onClick={handleRetry}
      disabled={isPending}
      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {isPending ? 'Retrying...' : 'Retry'}
    </button>
  );
}
```

### 4. BulkRetryButton Component

**File:** `/warehouse-management/src/components/sync/BulkRetryButton.tsx`

```typescript
'use client';

import { useState, useTransition } from 'react';
import { retryAllFailedWebhooksAction } from '@/actions/webhookRetryActions';
import { toast } from 'sonner';

interface BulkRetryButtonProps {
  failedCount: number;
}

export function BulkRetryButton({ failedCount }: BulkRetryButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleBulkRetry = () => {
    if (!confirm(`Retry all ${failedCount} failed webhooks?`)) {
      return;
    }

    startTransition(async () => {
      const result = await retryAllFailedWebhooksAction();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <button
      onClick={handleBulkRetry}
      disabled={isPending}
      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
    >
      {isPending ? 'Retrying...' : `Bulk Retry (${failedCount})`}
    </button>
  );
}
```

### 5. ViewLogButton Component

**File:** `/warehouse-management/src/components/sync/ViewLogButton.tsx`

```typescript
'use client';

import { useState } from 'react';
import { OnlyperfSyncLog } from '@/db/schema';
import { Dialog } from '@/components/ui/Dialog';

interface ViewLogButtonProps {
  log: OnlyperfSyncLog;
}

export function ViewLogButton({ log }: ViewLogButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        View Log
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="max-w-3xl">
          <h2 className="text-xl font-bold mb-4">Webhook Sync Log</h2>

          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">QR Code</p>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {log.qrCode}
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">{log.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">HTTP Status</p>
                <p className="font-medium">{log.responseStatus || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Attempts</p>
                <p className="font-medium">{log.attempts}</p>
              </div>
            </div>

            {/* Error message */}
            {log.errorMessage && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Error Message</p>
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">{log.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Payload */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Webhook Payload</p>
              <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
```

---

## Troubleshooting

### Common Webhook Failures

#### 1. Connection Timeout

**Error:** `Connection timeout: OnlyPerf server did not respond within 10s`

**Causes:**
- OnlyPerf server is down
- Network issues between warehouse and OnlyPerf
- OnlyPerf server is overloaded

**Solutions:**
- Check OnlyPerf server status (visit onlyperf.com)
- Wait a few minutes and retry
- Check network connectivity
- Contact DevOps if persistent

#### 2. HTTP 401 Unauthorized

**Error:** `HTTP 401: Unauthorized`

**Causes:**
- Webhook secret mismatch
- Webhook secret not configured in OnlyPerf

**Solutions:**
- Verify `ONLYPERF_WEBHOOK_SECRET` matches in both apps
- Check `.env` files in warehouse and OnlyPerf
- Restart both servers after changing secrets

#### 3. HTTP 400 Bad Request

**Error:** `HTTP 400: Invalid payload`

**Causes:**
- Missing required fields in payload
- Invalid data format (e.g., invalid Shopify GID)
- QR code format incorrect

**Solutions:**
- View log details to see validation errors
- Check product data completeness
- Verify Shopify IDs are correct GID format

#### 4. HTTP 500 Internal Server Error

**Error:** `HTTP 500: Internal server error`

**Causes:**
- Database error in OnlyPerf
- OnlyPerf code bug
- Data migration issue

**Solutions:**
- Check OnlyPerf server logs
- Contact development team
- May need code fix

### Investigating Failed Webhooks

**Step-by-step debugging:**

1. **View Log Details**
   - Click "View Log" button
   - Read error message carefully
   - Check HTTP status code

2. **Verify Payload**
   - Ensure all required fields present
   - Check data formats (dates, IDs, etc.)
   - Validate QR code format: `/^[A-Z]{4}\d{4}$/`

3. **Check OnlyPerf Logs**
   ```bash
   # In OnlyPerf server
   tail -f /var/log/onlyperf/app.log | grep "warehouse-sync"
   ```

4. **Test Webhook Manually**
   ```bash
   # Use curl to test webhook endpoint
   curl -X POST https://onlyperf.com/api/webhooks/warehouse-sync \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: YOUR_SECRET" \
     -d @payload.json
   ```

5. **Retry After Fix**
   - Fix underlying issue (server, data, config)
   - Click "Retry" button in sync page
   - Verify success

### When to Manually Intervene

**Automatic retry is NOT recommended for:**
- ❌ Configuration errors (wrong secret, wrong URL)
- ❌ Data validation errors (missing fields)
- ❌ Persistent server errors (need code fix)

**Manual retry works well for:**
- ✅ Temporary network issues
- ✅ OnlyPerf server was down briefly
- ✅ Database connection timeout
- ✅ Rate limiting (wait and retry)

---

## Future Enhancements

### Phase 2 Features

1. **Automatic Retry Queue**
   - Exponential backoff (1min, 5min, 15min, 1hr)
   - Max 5 attempts before giving up
   - Background job processing

2. **Email Alerts**
   - Notify staff when webhook fails
   - Daily digest of failed webhooks
   - Alert on repeated failures

3. **Analytics Dashboard**
   - Success rate over time
   - Average delivery time
   - Most common errors

4. **Webhook Replay from OnlyPerf**
   - OnlyPerf can request re-sync for missing products
   - Two-way sync validation

---

## Summary

### Implementation Checklist

**Database (Warehouse):**
- [ ] Create `onlyperf_sync_log` table
- [ ] Run migration
- [ ] Verify in Drizzle Studio

**Webhook Logic (Warehouse):**
- [ ] Update `notifyOnlyPerfOrderFulfilled()` to log attempts
- [ ] Add timeout handling (10s)
- [ ] Create `retryWebhookAction()`
- [ ] Create `retryAllFailedWebhooksAction()`

**UI (Warehouse):**
- [ ] Create `/sync` page
- [ ] Build SyncTable component
- [ ] Build RetryButton component
- [ ] Build BulkRetryButton component
- [ ] Build ViewLogButton component
- [ ] Add status badges

**Testing:**
- [ ] Test normal fulfillment → webhook success
- [ ] Test OnlyPerf down → webhook failure logged
- [ ] Test manual retry → webhook succeeds
- [ ] Test bulk retry
- [ ] Test error display in UI

**Documentation:**
- [x] Webhook retry system docs
- [ ] Update customer portal docs
- [ ] Add troubleshooting guide to wiki

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Author:** Development Team
**Status:** Ready for Implementation
