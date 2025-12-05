'use server';

import { db } from '~/server/db';
import { shipmentItems, storages } from '~/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ActionResult } from './types';
import { queueInventorySync } from '~/lib/shopify/inventory';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';

export interface ScannedItem {
  id: string;
  qrCode: string;
  productId: string;
  shipmentId: string;
  status: string;
  storageId: string | null;
  scannedAt: Date | null;
}

export interface ScanResult {
  item: ScannedItem;
  isAlreadyReceived: boolean;
  message: string;
}

export async function scanItemAction(
  qrCode: string,
  storageId: string
): Promise<ActionResult<ScanResult>> {
  try {
    const { organizationId, userId, userName } = await requireOrgContext({ permissions: ['update:shipment-items'] });

    let productCode = qrCode;
    // Handle URL format: https://onlyperf.com/p/ABCD1234
    if (qrCode.includes('/p/')) {
      const parts = qrCode.split('/p/');
      productCode = parts[parts.length - 1] ?? qrCode;
    }

    const isShortCode = /^[A-Z]{4}\d{4}$/.test(productCode);

    if (!isShortCode) {
      logger.warn({ userId, userName, organizationId, qrCode: productCode }, 'Invalid QR code format scanned');
      return {
        success: false,
        error: 'Mã QR không hợp lệ',
      };
    }

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(shipmentItems)
        .where(and(
          eq(shipmentItems.qrCode, productCode),
          eq(shipmentItems.organizationId, organizationId)
        ))
        .limit(1);

      if (!item) {
        throw new Error('Không tìm thấy sản phẩm với mã QR này');
      }

      const isAlreadyReceived = item.status === 'received';

      if (isAlreadyReceived) {
        return {
          item: item as ScannedItem,
          isAlreadyReceived: true,
          message: 'Sản phẩm đã được nhận trước đó',
        };
      }

      const [storage] = await tx
        .select()
        .from(storages)
        .where(and(
          eq(storages.id, storageId),
          eq(storages.organizationId, organizationId)
        ))
        .limit(1);

      if (!storage) {
        throw new Error('Kho không tồn tại');
      }

      if (storage.usedCapacity >= storage.capacity) {
        throw new Error(`Kho ${storage.name} đã đầy`);
      }

      const [updatedItem] = await tx
        .update(shipmentItems)
        .set({
          status: 'received',
          storageId: storageId,
          scannedAt: new Date(),
        })
        .where(and(
          eq(shipmentItems.id, item.id),
          eq(shipmentItems.organizationId, organizationId)
        ))
        .returning();

      await tx
        .update(storages)
        .set({
          usedCapacity: sql`${storages.usedCapacity} + 1`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(storages.id, storageId),
          eq(storages.organizationId, organizationId)
        ));

      return {
        item: updatedItem as ScannedItem,
        isAlreadyReceived: false,
        message: `Đã nhận sản phẩm vào ${storage.name}`,
      };
    });

    if (!result.isAlreadyReceived) {
      queueInventorySync([result.item.productId], organizationId);
      logger.info({
        userId,
        userName,
        organizationId,
        qrCode: productCode,
        productId: result.item.productId,
        shipmentId: result.item.shipmentId,
        storageId,
        itemId: result.item.id,
      }, `User ${userName} scanned item ${productCode} into storage`);
    } else {
      logger.info({
        userId,
        userName,
        organizationId,
        qrCode: productCode,
        productId: result.item.productId,
      }, `User ${userName} rescanned already received item ${productCode}`);
    }

    return {
      success: true,
      message: result.message,
      data: result,
    };
  } catch (error) {
    logger.error({ error, qrCode }, 'Failed to scan item');
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi quét sản phẩm';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function bulkUpdateShipmentItemsAction(
  shipmentId: string,
  storageId: string
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const { organizationId, userId, userName } = await requireOrgContext({ permissions: ['update:shipment-items'] });

    const result = await db.transaction(async (tx) => {
      const pendingItems = await tx
        .select()
        .from(shipmentItems)
        .where(
          and(
            eq(shipmentItems.shipmentId, shipmentId),
            eq(shipmentItems.organizationId, organizationId),
            eq(shipmentItems.status, 'pending')
          )
        );

      if (pendingItems.length === 0) {
        return { updatedCount: 0, productIds: [] as string[] };
      }

      const [storage] = await tx
        .select()
        .from(storages)
        .where(and(
          eq(storages.id, storageId),
          eq(storages.organizationId, organizationId)
        ))
        .limit(1);

      if (!storage) {
        throw new Error('Kho không tồn tại');
      }

      const availableCapacity = storage.capacity - storage.usedCapacity;
      if (availableCapacity < pendingItems.length) {
        throw new Error(
          `Kho ${storage.name} chỉ còn ${availableCapacity} chỗ trống, không đủ cho ${pendingItems.length} sản phẩm`
        );
      }

      await tx
        .update(shipmentItems)
        .set({
          status: 'received',
          storageId: storageId,
          scannedAt: new Date(),
        })
        .where(
          and(
            eq(shipmentItems.shipmentId, shipmentId),
            eq(shipmentItems.organizationId, organizationId),
            eq(shipmentItems.status, 'pending')
          )
        );

      await tx
        .update(storages)
        .set({
          usedCapacity: sql`${storages.usedCapacity} + ${pendingItems.length}`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(storages.id, storageId),
          eq(storages.organizationId, organizationId)
        ));

      const productIds = Array.from(new Set(pendingItems.map(item => item.productId)));

      return {
        updatedCount: pendingItems.length,
        productIds,
      };
    });

    if (result.productIds.length > 0) {
      queueInventorySync(result.productIds, organizationId);
    }

    logger.info({
      userId,
      userName,
      organizationId,
      shipmentId,
      storageId,
      updatedCount: result.updatedCount,
      productIds: result.productIds,
    }, `User ${userName} bulk received ${result.updatedCount} items for shipment ${shipmentId}`);

    return {
      success: true,
      message: `Đã nhận ${result.updatedCount} sản phẩm`,
      data: { updatedCount: result.updatedCount },
    };
  } catch (error) {
    logger.error({ error, shipmentId, storageId }, 'Failed bulk receiving items');
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi cập nhật';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getShipmentScanProgressAction(
  shipmentId: string
): Promise<ActionResult<{
  totalItems: number;
  scannedItems: number;
  pendingItems: number;
}>> {
  try {
    const { organizationId } = await requireOrgContext();

    const stats = await db
      .select({
        status: shipmentItems.status,
        count: sql<number>`count(*)::int`,
      })
      .from(shipmentItems)
      .where(and(
        eq(shipmentItems.shipmentId, shipmentId),
        eq(shipmentItems.organizationId, organizationId)
      ))
      .groupBy(shipmentItems.status);

    const totalItems = stats.reduce((sum, stat) => sum + stat.count, 0);
    const scannedItems = stats
      .filter(stat => stat.status === 'received')
      .reduce((sum, stat) => sum + stat.count, 0);
    const pendingItems = stats
      .filter(stat => stat.status === 'pending')
      .reduce((sum, stat) => sum + stat.count, 0);

    return {
      success: true,
      message: 'Lấy tiến độ quét thành công',
      data: {
        totalItems,
        scannedItems,
        pendingItems,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error getting scan progress:');
    return {
      success: false,
      error: 'Lỗi khi lấy tiến độ quét',
    };
  }
}

export async function reconcileShipmentStatusAction(
  shipmentId: string
): Promise<ActionResult<{ statusUpdated: boolean }>> {
  try {
    const { organizationId } = await requireOrgContext();

    const stats = await db
      .select({
        status: shipmentItems.status,
        count: sql<number>`count(*)::int`,
      })
      .from(shipmentItems)
      .where(and(
        eq(shipmentItems.shipmentId, shipmentId),
        eq(shipmentItems.organizationId, organizationId)
      ))
      .groupBy(shipmentItems.status);

    const totalItems = stats.reduce((sum, stat) => sum + stat.count, 0);
    const scannedItems = stats
      .filter(stat => stat.status === 'received')
      .reduce((sum, stat) => sum + stat.count, 0);

    // If all items are scanned, update shipment status to received
    if (totalItems > 0 && scannedItems === totalItems) {
      const { updateShipmentStatusAction } = await import('./shipmentActions');
      await updateShipmentStatusAction(shipmentId, 'received');

      return {
        success: true,
        message: 'Trạng thái phiếu nhập đã được cập nhật thành "Đã nhận"',
        data: { statusUpdated: true },
      };
    }

    return {
      success: true,
      message: 'Không cần cập nhật trạng thái',
      data: { statusUpdated: false },
    };
  } catch (error) {
    logger.error({ error }, 'Error reconciling shipment status:');
    return {
      success: false,
      error: 'Lỗi khi kiểm tra và cập nhật trạng thái phiếu nhập',
    };
  }
}
