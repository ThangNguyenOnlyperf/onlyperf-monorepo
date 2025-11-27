"use server";

import { eq } from "drizzle-orm";
import { env } from "@/env";
import { buildSignedHeaders } from "@/lib/security/hmac";
import { db } from "@/server/db";
import { shipmentItems } from "@perf/db/schema";
import type {
  WarehouseSyncEvent,
  WarehouseSyncResult,
  DeliveryCompletedData,
} from "@/lib/warehouse/schema";

type OrderPaidEvent = {
  event: "order.paid";
  provider: "sepay" | "cod";
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  paymentCode: string;
  amount: number;
  currency: "VND";
  paidAt: string;
  referenceCode: string;
  gateway: string;
  lineItems: Array<{
    sku: string;
    variantId: string;
    quantity: number;
    price: number;
    title: string;
    variantTitle?: string;
  }>;
  customer: {
    email: string;
    name: string | null;
    phone: string | null;
  };
  shippingAddress: {
    name?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    country?: string | null;
    phone?: string | null;
  };
};

export async function notifyWarehouseOrderPaid(payload: OrderPaidEvent) {
  if (!env.WAREHOUSE_WEBHOOK_URL || !env.WAREHOUSE_WEBHOOK_SECRET) {
    console.log("Warehouse webhook not configured, skipping notification");
    return;
  }

  const { raw, signature, timestamp } = buildSignedHeaders(
    payload,
    env.WAREHOUSE_WEBHOOK_SECRET,
  );

  const res = await fetch(env.WAREHOUSE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature": signature,
      "X-Timestamp": timestamp,
    },
    body: raw,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Warehouse webhook failed: ${res.status} ${text}`);
  }
}

// =============================================================================
// Warehouse Sync Event Handlers (incoming webhooks from warehouse)
// =============================================================================

/**
 * Handle delivery.completed event - activates warranty for delivered items
 */
export async function handleDeliveryCompleted(
  data: DeliveryCompletedData,
): Promise<WarehouseSyncResult> {
  const deliveredAt = new Date(data.deliveredAt);
  const processedItems: string[] = [];

  for (const item of data.items) {
    // Update the shipment item (which is already in the shared DB)
    // The warehouse app should have already set currentOwnerId when order was created
    // This webhook activates the warranty
    const [updated] = await db
      .update(shipmentItems)
      .set({
        deliveredAt,
        warrantyStatus: "active",
        warrantyMonths: item.warrantyMonths,
        currentOwnerId: data.customerId,
      })
      .where(eq(shipmentItems.qrCode, item.qrCode))
      .returning();

    if (updated) {
      processedItems.push(updated.id);
      console.log(`✅ Warranty activated: ${item.qrCode} → ${updated.id}`);
    } else {
      console.warn(`⚠️ Item not found: ${item.qrCode}`);
    }
  }

  // TODO: Send warranty activation email to customer

  return {
    success: true,
    processedCount: processedItems.length,
    shipmentItemIds: processedItems,
  };
}

/**
 * Handle product.returned event - voids warranty and removes owner
 */
export async function handleProductReturned(
  qrCode: string,
): Promise<WarehouseSyncResult> {
  const [updated] = await db
    .update(shipmentItems)
    .set({
      warrantyStatus: "void",
      currentOwnerId: null,
    })
    .where(eq(shipmentItems.qrCode, qrCode))
    .returning();

  if (!updated) {
    return {
      success: false,
      error: "Product not found",
      status: 404,
    };
  }

  console.log(`✅ Product returned: ${qrCode}`);
  return { success: true, shipmentItemId: updated.id };
}

/**
 * Handle product.replaced event - voids warranty on old product
 */
export async function handleProductReplaced(
  qrCode: string,
): Promise<WarehouseSyncResult> {
  const [updated] = await db
    .update(shipmentItems)
    .set({
      warrantyStatus: "void",
    })
    .where(eq(shipmentItems.qrCode, qrCode))
    .returning();

  if (!updated) {
    return {
      success: false,
      error: "Product not found",
      status: 404,
    };
  }

  console.log(`✅ Product replaced: ${qrCode}`);
  return { success: true, shipmentItemId: updated.id };
}

/**
 * Process a warehouse sync event
 */
export async function processWarehouseSyncEvent(
  event: WarehouseSyncEvent,
): Promise<WarehouseSyncResult> {
  switch (event.event) {
    case "delivery.completed":
      return handleDeliveryCompleted(event.data);
    case "product.returned":
      return handleProductReturned(event.data.qrCode);
    case "product.replaced":
      return handleProductReplaced(event.data.qrCode);
  }
}
