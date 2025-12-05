import { eq, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { shipmentItems } from "~/server/db/schema";

import { OrgShopifyApiError } from "./org-client";
import {
  findShopifyProductMapping,
  updateShopifyProductSyncState,
  type Database,
} from "./repository";
import type { ShopifyInventorySyncResult } from "./types";
import { logger } from '~/lib/logger';
import { getOrgShopifyConfig, createOrgShopifyClient, type OrgShopifyClient, type OrgShopifyConfig } from "./org-client";

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
  organizationId: string,
  database: Database = DEFAULT_DATABASE
): Promise<ShopifyInventorySyncResult> {
  // Get org-specific Shopify config
  const config = await getOrgShopifyConfig(organizationId);

  if (!config) {
    const quantity = await calculateAvailableQuantity(productId, database);
    return {
      productId,
      status: "skipped",
      quantity,
      message: "Shopify chưa được cấu hình cho tổ chức này",
      shopifyInventoryItemId: null,
    };
  }

  const client = createOrgShopifyClient(config, organizationId);

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

  // Use locationId from org config, fallback to default if not set
  const locationId = config.locationId;
  if (!locationId) {
    const message = "Thiếu cấu hình Location ID để đồng bộ tồn kho Shopify";
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

  const normalizedLocationId = normalizeShopifyNumericId(locationId);
  const normalizedInventoryItemId = normalizeShopifyNumericId(
    mapping.shopifyInventoryItemId
  );

  try {
    await client.restRequest<unknown>("inventory_levels/set.json", {
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
  organizationId: string,
  database: Database = DEFAULT_DATABASE
): Promise<ShopifyInventorySyncResult[]> {
  const results: ShopifyInventorySyncResult[] = [];

  for (const productId of productIds) {
    try {
      const result = await syncInventoryForProduct(productId, organizationId, database);
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
  organizationId: string,
  database: Database = DEFAULT_DATABASE
): void {
  if (productIds.length === 0) {
    return;
  }

  // Check if Shopify is configured for this org asynchronously
  getOrgShopifyConfig(organizationId).then((config) => {
    if (!config) {
      return;
    }

    syncInventoryForProducts(productIds, organizationId, database).catch((error) => {
      logger.error({ error, organizationId }, 'Shopify batch inventory sync failed:');
    });
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
  if (error instanceof OrgShopifyApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Không thể đồng bộ tồn kho với Shopify";
}
