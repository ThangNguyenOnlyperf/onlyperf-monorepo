'use server';

import { db } from '~/server/db';
import { shipmentItems, products, shipments, storages, colors } from '~/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ActionResult } from './types';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';
import type { ProductAttributes } from '~/lib/schemas/productSchema';

export interface ShipmentItemDetails {
  id: string;
  qrCode: string;
  status: string;
  quantity: number;
  scannedAt: Date | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string;
    description: string | null;
    category: string | null;
    // Dynamic product attributes
    attributes: ProductAttributes | null;
    colorName: string | null;
    colorHex: string | null;
  };
  shipment: {
    id: string;
    receiptNumber: string;
    receiptDate: string;
    supplierName: string;
    status: string;
  };
  storage: {
    id: string;
    name: string;
    location: string;
  } | null;
}

export async function getShipmentItemDetailsAction(itemId: string): Promise<ActionResult<ShipmentItemDetails>> {
  try {
    const { organizationId } = await requireOrgContext();

    const result = await db
      .select({
        item: shipmentItems,
        product: products,
        shipment: shipments,
        storage: storages,
        color: colors,
      })
      .from(shipmentItems)
      .innerJoin(products, eq(shipmentItems.productId, products.id))
      .innerJoin(shipments, eq(shipmentItems.shipmentId, shipments.id))
      .leftJoin(storages, eq(shipmentItems.storageId, storages.id))
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .where(and(
        eq(shipmentItems.id, itemId),
        eq(shipmentItems.organizationId, organizationId)
      ))
      .limit(1);

    if (result.length === 0) {
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm',
      };
    }

    const { item, product, shipment, storage, color } = result[0]!;

    const itemDetails: ShipmentItemDetails = {
      id: item.id,
      qrCode: item.qrCode,
      status: item.status,
      quantity: item.quantity,
      scannedAt: item.scannedAt,
      createdAt: item.createdAt,
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        description: product.description,
        category: product.category,
        attributes: product.attributes as ProductAttributes | null,
        colorName: color?.name ?? null,
        colorHex: color?.hex ?? null,
      },
      shipment: {
        id: shipment.id,
        receiptNumber: shipment.receiptNumber,
        receiptDate: shipment.receiptDate,
        supplierName: shipment.supplierName,
        status: shipment.status,
      },
      storage: storage
        ? {
            id: storage.id,
            name: storage.name,
            location: storage.location,
          }
        : null,
    };

    return {
      success: true,
      message: 'Đã tải thông tin sản phẩm',
      data: itemDetails,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching shipment item details:');
    return {
      success: false,
      message: 'Lỗi khi tải thông tin sản phẩm',
    };
  }
}

export async function updateShipmentItemStatusAction(
  itemId: string,
  status: 'pending' | 'received' | 'sold' | 'shipped'
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireOrgContext({ permissions: ['update:shipment-items'] });

    await db
      .update(shipmentItems)
      .set({
        status,
        scannedAt: status === 'received' ? new Date() : undefined,
      })
      .where(and(
        eq(shipmentItems.id, itemId),
        eq(shipmentItems.organizationId, organizationId)
      ));

    return {
      success: true,
      message: `Đã cập nhật trạng thái thành ${getStatusLabel(status)}`,
    };
  } catch (error) {
    logger.error({ error }, 'Error updating item status:');
    return {
      success: false,
      message: 'Lỗi khi cập nhật trạng thái',
    };
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Đang chờ',
    received: 'Đã nhận',
    sold: 'Đã bán',
    shipped: 'Đã giao',
  };
  return labels[status] || status;
}