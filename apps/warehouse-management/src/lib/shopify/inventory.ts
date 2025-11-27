import { eq, sql } from "drizzle-orm";

import { env } from "~/env";
import { db } from "~/server/db";
import { shipmentItems } from "~/server/db/schema";

import { shopifyRestRequest, ShopifyApiError } from "./client";
import {
  findShopifyProductMapping,
  updateShopifyProductSyncState,
  type Database,
} from "./repository";
import type { ShopifyInventorySyncResult } from "./types";
import { SHOPIFY_ENABLED, shopifyIntegrationDisabledMessage } from "./config";
import { logger } from '~/lib/logger';

const SHOPIFY_SYNC_DELAY_MS = 250;

const DEFAULT_DATABASE: Database = db;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function calculateAvailableQuantity(
  productId: string,
  database: Database = DEFAULT_DATABASE
): Promise<number> {
  const [result] = await database
    .select({
      available: sql<number>`COALESCE(SUM(CASE WHEN ${shipmentItems.status} = 'received' THEN ${shipmentItems.quantity} ELSE 0 END), 0)::int`,
    })
    .from(shipmentItems)
    .where(eq(shipmentItems.productId, productId));

  return result?.available ?? 0;
}

export async function syncInventoryForProduct(
  productId: string,
  database: Database = DEFAULT_DATABASE
): Promise<ShopifyInventorySyncResult> {
  if (!SHOPIFY_ENABLED) {
    const quantity = await calculateAvailableQuantity(productId, database);
    return {
      productId,
      status: "skipped",
      quantity,
      message: shopifyIntegrationDisabledMessage(),
      shopifyInventoryItemId: null,
    };
  }

  const availableQuantity = await calculateAvailableQuantity(productId, database);
  const mapping = await findShopifyProductMapping(productId, database);

  if (!mapping) {
    return {
      productId,
      status: "skipped",
      quantity: availableQuantity,
      message: "Sản phẩm chưa được liên kết với Shopify",
    };
  }

  if (!mapping.shopifyInventoryItemId) {
    const message = "Thiếu Shopify inventory item id";
    await updateShopifyProductSyncState(productId, {
      lastSyncedAt: new Date(),
      lastSyncStatus: "error",
      lastSyncError: message,
    }, database);

    return {
      productId,
      status: "error",
      quantity: availableQuantity,
      message,
      shopifyInventoryItemId: null,
    };
  }

  const locationId = env.SHOPIFY_LOCATION_ID;
  if (!locationId) {
    throw new Error("Thiếu cấu hình SHOPIFY_LOCATION_ID để đồng bộ tồn kho Shopify");
  }

  const normalizedLocationId = normalizeShopifyNumericId(locationId);
  const normalizedInventoryItemId = normalizeShopifyNumericId(
    mapping.shopifyInventoryItemId
  );

  try {
    await shopifyRestRequest<unknown>("inventory_levels/set.json", {
      method: "POST",
      body: JSON.stringify({
        inventory_item_id: normalizedInventoryItemId,
        location_id: normalizedLocationId,
        available: availableQuantity,
      }),
    });

    await updateShopifyProductSyncState(productId, {
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      lastSyncError: null,
    }, database);

    return {
      productId,
      status: "success",
      quantity: availableQuantity,
      shopifyInventoryItemId: mapping.shopifyInventoryItemId,
    };
  } catch (error) {
    const message = buildErrorMessage(error);

    await updateShopifyProductSyncState(productId, {
      lastSyncedAt: new Date(),
      lastSyncStatus: "error",
      lastSyncError: message,
    }, database);

    return {
      productId,
      status: "error",
      quantity: availableQuantity,
      message,
      shopifyInventoryItemId: mapping.shopifyInventoryItemId,
    };
  }
}

export async function syncInventoryForProducts(
  productIds: string[],
  database: Database = DEFAULT_DATABASE
): Promise<ShopifyInventorySyncResult[]> {
  const results: ShopifyInventorySyncResult[] = [];

  for (const productId of productIds) {
    try {
      const result = await syncInventoryForProduct(productId, database);
      results.push(result);
    } catch (error) {
      const message = buildErrorMessage(error);
      const quantity = await calculateAvailableQuantity(productId, database);
      results.push({
        productId,
        status: "error",
        quantity,
        message,
      });
    }

    if (productIds.length > 1) {
      await sleep(SHOPIFY_SYNC_DELAY_MS);
    }
  }

  return results;
}

export function queueInventorySync(
  productIds: string[],
  database: Database = DEFAULT_DATABASE
): void {
  if (productIds.length === 0) {
    return;
  }

  if (!SHOPIFY_ENABLED) {
    return;
  }

  syncInventoryForProducts(productIds, database).catch((error) => {
    logger.error({ error }, 'Shopify batch inventory sync failed:');
  });
}

function normalizeShopifyNumericId(rawId: string): number {
  const cleaned = rawId.includes("/") ? rawId.split("/").pop() ?? rawId : rawId;
  const numeric = Number.parseInt(cleaned, 10);

  if (!Number.isFinite(numeric)) {
    throw new Error(`Không thể chuyển đổi Shopify ID "${rawId}" sang dạng số`);
  }

  return numeric;
}

function buildErrorMessage(error: unknown): string {
  if (error instanceof ShopifyApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Không thể đồng bộ tồn kho với Shopify";
}
