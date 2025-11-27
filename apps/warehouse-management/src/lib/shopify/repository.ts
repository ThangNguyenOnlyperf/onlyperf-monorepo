import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { db } from "~/server/db";
import * as schema from "~/server/db/schema";
import { shopifyProducts, products } from "~/server/db/schema";

export type Database = PostgresJsDatabase<typeof schema>;
export type ShopifyProductMapping = typeof shopifyProducts.$inferSelect;

export async function findShopifyProductMapping(
  productId: string,
  database: Database = db
): Promise<ShopifyProductMapping | null> {
  const [mapping] = await database
    .select()
    .from(shopifyProducts)
    .where(eq(shopifyProducts.productId, productId))
    .limit(1);

  return mapping ?? null;
}

export async function findShopifyProductIdByBrandModel(
  brandId: string | null,
  model: string,
  database: Database = db
): Promise<string | null> {
  if (!brandId) {
    return null;
  }

  const existing = await database
    .select({ shopifyProductId: shopifyProducts.shopifyProductId })
    .from(shopifyProducts)
    .innerJoin(products, eq(products.id, shopifyProducts.productId))
    .where(and(eq(products.brandId, brandId), eq(products.model, model)))
    .limit(1);

  return existing[0]?.shopifyProductId ?? null;
}

export interface ShopifyProductMappingUpsert {
  productId: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  shopifyInventoryItemId?: string | null;
  lastSyncedAt: Date;
  lastSyncStatus: string;
  lastSyncError?: string | null;
}

export interface ShopifySyncStateUpdate {
  lastSyncedAt?: Date | null;
  lastSyncStatus?: string;
  lastSyncError?: string | null;
  shopifyInventoryItemId?: string | null;
}

export async function upsertShopifyProductMapping(
  data: ShopifyProductMappingUpsert,
  database: Database = db
): Promise<void> {
  const now = new Date();

  await database
    .insert(shopifyProducts)
    .values({
      productId: data.productId,
      shopifyProductId: data.shopifyProductId,
      shopifyVariantId: data.shopifyVariantId,
      shopifyInventoryItemId: data.shopifyInventoryItemId ?? null,
      lastSyncedAt: data.lastSyncedAt,
      lastSyncStatus: data.lastSyncStatus,
      lastSyncError: data.lastSyncError ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: shopifyProducts.productId,
      set: {
        shopifyProductId: data.shopifyProductId,
        shopifyVariantId: data.shopifyVariantId,
        shopifyInventoryItemId: data.shopifyInventoryItemId ?? null,
        lastSyncedAt: data.lastSyncedAt,
        lastSyncStatus: data.lastSyncStatus,
        lastSyncError: data.lastSyncError ?? null,
        updatedAt: now,
      },
    });
}

export async function updateShopifyProductSyncState(
  productId: string,
  update: ShopifySyncStateUpdate,
  database: Database = db
): Promise<void> {
  const patch: Partial<typeof shopifyProducts.$inferInsert> = {};

  if (update.lastSyncedAt !== undefined) {
    patch.lastSyncedAt = update.lastSyncedAt;
  }

  if (update.lastSyncStatus !== undefined) {
    patch.lastSyncStatus = update.lastSyncStatus;
  }

  if (update.lastSyncError !== undefined) {
    patch.lastSyncError = update.lastSyncError ?? null;
  }

  if (update.shopifyInventoryItemId !== undefined) {
    patch.shopifyInventoryItemId = update.shopifyInventoryItemId ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  await database
    .update(shopifyProducts)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(shopifyProducts.productId, productId));
}
