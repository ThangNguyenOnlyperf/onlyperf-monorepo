"use server";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { shipmentItems, ownershipTransfers } from "@perf/db/schema";
import type {
  TransferOwnershipInput,
  TransferOwnershipResult,
} from "@/lib/warranty/schema";

/**
 * Transfer ownership of a product to a new owner
 *
 * Note: In a production system, this should:
 * 1. Send confirmation email to new owner
 * 2. Only complete transfer after new owner confirms
 * 3. Possibly lookup new owner's customer ID from Shopify by email
 *
 * For now, this creates a transfer record and updates ownership immediately.
 */
export async function transferOwnership(
  input: TransferOwnershipInput,
  currentOwnerId: string,
): Promise<TransferOwnershipResult> {
  const { qrCode, newOwnerEmail } = input;

  // 1. Lookup shipment item (product unit)
  const unit = await db.query.shipmentItems.findFirst({
    where: eq(shipmentItems.qrCode, qrCode),
  });

  if (!unit) {
    return {
      success: false,
      error: "Sản phẩm không tồn tại",
      status: 404,
    };
  }

  // 2. Check ownership
  if (unit.currentOwnerId !== currentOwnerId) {
    return {
      success: false,
      error: "Bạn không phải chủ sở hữu của sản phẩm này",
      status: 403,
    };
  }

  // 3. For now, we'll use email as the new owner ID
  // In production, you'd look up the Shopify customer by email
  // or send a confirmation link that the new owner clicks
  const newOwnerId = `email:${newOwnerEmail}`;

  // 4. Create ownership transfer record
  const [transfer] = await db
    .insert(ownershipTransfers)
    .values({
      shipmentItemId: unit.id,
      fromOwnerId: currentOwnerId,
      toOwnerId: newOwnerId,
      warrantyTransferred: true,
      transferredAt: new Date(),
    })
    .returning();

  // 5. Update shipment item owner
  await db
    .update(shipmentItems)
    .set({
      currentOwnerId: newOwnerId,
    })
    .where(eq(shipmentItems.id, unit.id));

  console.log(
    `✅ Ownership transferred: ${qrCode} from ${currentOwnerId} to ${newOwnerId}`,
  );

  // TODO: Send confirmation email to new owner
  // TODO: Implement proper flow where new owner confirms before transfer completes

  return {
    success: true,
    transferId: transfer.id,
    message: "Quyền sở hữu đã được chuyển thành công",
  };
}
