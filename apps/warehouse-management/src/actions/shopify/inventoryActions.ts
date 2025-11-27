'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import type { ActionResult } from '../types';
import { db } from '~/server/db';
import { products, shipmentItems, colors } from '~/server/db/schema';
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
import { SHOPIFY_ENABLED, shopifyIntegrationDisabledMessage } from '~/lib/shopify/config';
import { logger } from '~/lib/logger';

export async function syncShopifyInventoryForProductAction(
  productId: string
): Promise<ActionResult<ShopifyInventorySyncResult>> {
  if (!productId) {
    return {
      success: false,
      message: 'Thiếu mã sản phẩm để đồng bộ tồn kho',
    };
  }

  if (!SHOPIFY_ENABLED) {
    const message = shopifyIntegrationDisabledMessage();
    return {
      success: false,
      message,
      error: message,
    };
  }

  try {
    const result = await syncInventoryForProduct(productId);
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

  if (!SHOPIFY_ENABLED) {
    const message = shopifyIntegrationDisabledMessage();
    return {
      success: false,
      message,
      error: message,
    };
  }

  try {
    // Get product with color info in a single JOIN query
    const [productWithColor] = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        brandId: products.brandId,
        model: products.model,
        qrCode: products.qrCode,
        description: products.description,
        category: products.category,
        colorId: products.colorId,
        colorHex: colors.hex,
        colorName: colors.name,
        weight: products.weight,
        size: products.size,
        thickness: products.thickness,
        material: products.material,
        handleLength: products.handleLength,
        handleCircumference: products.handleCircumference,
        price: products.price,
        productType: products.productType,
        isPackProduct: products.isPackProduct,
        packSize: products.packSize,
        baseProductId: products.baseProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(colors, eq(colors.id, products.colorId))
      .where(eq(products.id, productId))
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
    const inventorySync = await syncInventoryForProduct(productId);

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

  if (!SHOPIFY_ENABLED) {
    const message = shopifyIntegrationDisabledMessage();
    return {
      success: false,
      message,
      error: message,
    };
  }

  try {
    const shipmentItemsProducts = await db
      .select({ productId: shipmentItems.productId })
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, shipmentId));

    const productIds = Array.from(new Set(shipmentItemsProducts.map((item) => item.productId))).filter(Boolean);

    if (productIds.length === 0) {
      return {
        success: true,
        message: 'Không có sản phẩm nào cần đồng bộ Shopify',
        data: { results: [] },
      };
    }

    const results = await syncInventoryForProducts(productIds);

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

export async function queueShipmentInventorySync(shipmentId: string): Promise<void> {
  if (!SHOPIFY_ENABLED) {
    return;
  }

  try {
    const shipmentItemsProducts = await db
      .select({ productId: shipmentItems.productId })
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, shipmentId));

    const productIds = Array.from(new Set(shipmentItemsProducts.map((item) => item.productId))).filter(Boolean);

    if (productIds.length === 0) {
      return;
    }

    queueInventorySync(productIds);
  } catch (error) {
    logger.error({ error }, 'Background Shopify sync failed');
  }
}
