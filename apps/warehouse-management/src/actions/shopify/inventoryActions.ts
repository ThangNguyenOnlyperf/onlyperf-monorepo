'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';

import type { ActionResult } from '../types';
import { db } from '~/server/db';
import { products, shipmentItems, colors, shipments } from '~/server/db/schema';
import { createShopifyProductFromWarehouse } from '~/lib/shopify/products';
import {
  queueInventorySync,
  syncInventoryForProduct,
  syncInventoryForProducts,
} from '~/lib/shopify/inventory';
import type {
  ShopifyFullSyncResult,
  ShopifyInventorySyncResult,
} from '~/lib/shopify/types';
import { getOrgShopifyConfig } from '~/lib/shopify/org-client';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';

export async function syncShopifyInventoryForProductAction(
  productId: string
): Promise<ActionResult<ShopifyInventorySyncResult>> {
  if (!productId) {
    return {
      success: false,
      message: 'Thiếu mã sản phẩm để đồng bộ tồn kho',
    };
  }

  try {
    const { organizationId } = await requireOrgContext();

    // Check if Shopify is configured for this org
    const config = await getOrgShopifyConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Shopify chưa được cấu hình cho tổ chức này',
        error: 'Shopify chưa được cấu hình cho tổ chức này',
      };
    }

    const result = await syncInventoryForProduct(productId, organizationId);
    const success = result.status === 'success';

    const message = success
      ? `Đã cập nhật tồn kho Shopify (${result.quantity} sản phẩm)`
      : result.status === 'skipped'
        ? result.message ?? 'Sản phẩm chưa được liên kết với Shopify'
        : `Không thể cập nhật tồn kho Shopify: ${result.message ?? 'Lỗi không xác định'}`;

    return {
      success,
      message,
      data: result,
      error: success ? undefined : message,
    };
  } catch (error) {
    logger.error({ error }, 'Error syncing Shopify inventory');
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể đồng bộ tồn kho Shopify';

    return {
      success: false,
      message,
      error: message,
    };
  }
}

export async function syncShopifyProductAction(
  productId: string
): Promise<ActionResult<ShopifyFullSyncResult>> {
  if (!productId) {
    return {
      success: false,
      message: 'Thiếu mã sản phẩm để đồng bộ với Shopify',
    };
  }

  try {
    const { organizationId } = await requireOrgContext();

    // Check if Shopify is configured for this org
    const config = await getOrgShopifyConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Shopify chưa được cấu hình cho tổ chức này',
        error: 'Shopify chưa được cấu hình cho tổ chức này',
      };
    }

    // Get product with color info in a single JOIN query (must be in same org)
    const [productWithColor] = await db
      .select({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        brand: products.brand,
        brandId: products.brandId,
        model: products.model,
        sku: products.sku,
        qrCode: products.qrCode,
        description: products.description,
        category: products.category,
        // Dynamic attributes as JSONB
        attributes: products.attributes,
        colorHex: colors.hex,
        colorName: colors.name,
        price: products.price,
        productType: products.productType,
        isPackProduct: products.isPackProduct,
        packSize: products.packSize,
        baseProductId: products.baseProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .where(and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId)
      ))
      .limit(1);

    if (!productWithColor) {
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm',
      };
    }

    const productSync = await createShopifyProductFromWarehouse(
      productWithColor,
      db,
      { colorHex: productWithColor.colorHex ?? null }
    );
    const inventorySync = await syncInventoryForProduct(productId, organizationId);

    const success = inventorySync.status === 'success';

    const baseMessage =
      productSync.status === 'success'
        ? 'Đã đồng bộ sản phẩm với Shopify. '
        : 'Sản phẩm đã tồn tại trên Shopify. ';

    let message: string;

    if (inventorySync.status === 'success') {
      message = `${baseMessage}Đã cập nhật tồn kho (${inventorySync.quantity} sản phẩm).`;
    } else if (inventorySync.status === 'skipped') {
      message = `${baseMessage}Không thể cập nhật tồn kho: ${inventorySync.message ?? 'Thiếu liên kết Shopify'}.`;
    } else {
      message = `${baseMessage}Không thể cập nhật tồn kho: ${inventorySync.message ?? 'Lỗi không xác định'}.`;
    }

    revalidatePath('/products');

    return {
      success,
      message,
      data: {
        product: productSync,
        inventory: inventorySync,
      },
      error: success ? undefined : message,
    };
  } catch (error) {
    logger.error({ error }, 'Error syncing Shopify product');
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể đồng bộ sản phẩm với Shopify';

    return {
      success: false,
      message,
      error: message,
    };
  }
}

export async function syncShipmentInventoryAction(
  shipmentId: string
): Promise<ActionResult<{ results: ShopifyInventorySyncResult[] }>> {
  if (!shipmentId) {
    return {
      success: false,
      message: 'Thiếu mã phiếu nhập để đồng bộ Shopify',
    };
  }

  try {
    const { organizationId } = await requireOrgContext();

    // Check if Shopify is configured for this org
    const config = await getOrgShopifyConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Shopify chưa được cấu hình cho tổ chức này',
        error: 'Shopify chưa được cấu hình cho tổ chức này',
      };
    }

    // Get shipment items (must be in same org)
    const shipmentItemsProducts = await db
      .select({ productId: shipmentItems.productId })
      .from(shipmentItems)
      .where(and(
        eq(shipmentItems.shipmentId, shipmentId),
        eq(shipmentItems.organizationId, organizationId)
      ));

    const productIds = Array.from(new Set(shipmentItemsProducts.map((item) => item.productId))).filter(Boolean);

    if (productIds.length === 0) {
      return {
        success: true,
        message: 'Không có sản phẩm nào cần đồng bộ Shopify',
        data: { results: [] },
      };
    }

    const results = await syncInventoryForProducts(productIds, organizationId);

    const hasError = results.some((result) => result.status === 'error');
    const message = hasError
      ? 'Đã đồng bộ Shopify nhưng có lỗi với một số sản phẩm'
      : 'Đã đồng bộ Shopify thành công cho toàn bộ sản phẩm';

    return {
      success: !hasError,
      message,
      data: { results },
    };
  } catch (error) {
    logger.error({ error }, 'Error syncing shipment inventory');
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể đồng bộ tồn kho Shopify';

    return {
      success: false,
      message,
      error: message,
    };
  }
}

/**
 * Queue shipment inventory sync for background processing
 * Accepts organizationId as parameter since this may be called from webhooks
 */
export async function queueShipmentInventorySync(
  shipmentId: string,
  organizationId: string
): Promise<void> {
  try {
    // Get shipment items for this org
    const shipmentItemsProducts = await db
      .select({ productId: shipmentItems.productId })
      .from(shipmentItems)
      .where(and(
        eq(shipmentItems.shipmentId, shipmentId),
        eq(shipmentItems.organizationId, organizationId)
      ));

    const productIds = Array.from(new Set(shipmentItemsProducts.map((item) => item.productId))).filter(Boolean);

    if (productIds.length === 0) {
      return;
    }

    queueInventorySync(productIds, organizationId);
  } catch (error) {
    logger.error({ error, organizationId }, 'Background Shopify sync failed');
  }
}
