"use server";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { shipmentItems, customerScans } from "@perf/db/schema";

// =============================================================================
// Types
// =============================================================================

export type ShipmentItemWithProduct = Awaited<
  ReturnType<typeof getShipmentItemByQrCode>
>;

// =============================================================================
// Data Fetching
// =============================================================================

/**
 * Lookup shipment item (product unit) with full product data
 */
export async function getShipmentItemByQrCode(qrCode: string) {
  return db.query.shipmentItems.findFirst({
    where: eq(shipmentItems.qrCode, qrCode),
    with: {
      product: {
        with: {
          shopifyProduct: true,
          color: true,
          brand: true,
        },
      },
    },
  });
}

// =============================================================================
// Customer Scan Tracking
// =============================================================================

/**
 * Track customer scan event and update scan counts
 */
export async function trackCustomerScan(
  qrCode: string,
  shipmentItemId: string,
  customerId: string | null,
  currentScanCount: number,
  firstScannedAt: Date | null,
): Promise<void> {
  // 1. Insert scan record
  await db.insert(customerScans).values({
    qrCode,
    shipmentItemId,
    customerId,
    scannedAt: new Date(),
  });

  // 2. Update shipment item scan stats
  await db
    .update(shipmentItems)
    .set({
      lastScannedByCustomerAt: new Date(),
      customerScanCount: currentScanCount + 1,
      firstScannedByCustomerAt: firstScannedAt || new Date(),
    })
    .where(eq(shipmentItems.id, shipmentItemId));
}
