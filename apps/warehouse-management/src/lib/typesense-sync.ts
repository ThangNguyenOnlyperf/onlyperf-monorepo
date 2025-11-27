import { db } from "~/server/db";
import { products, shipments, shipmentItems, storages, user } from "~/server/db/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { typesenseClient, checkCollectionExists } from "./typesense";
import { COLLECTIONS } from "./typesense-schemas";
import type {
  ProductDocument,
  ShipmentDocument,
  ShipmentItemDocument,
  StorageDocument
} from "./typesense-schemas";
import { logger } from '~/lib/logger';

// Sync a single product to Typesense
export async function syncProduct(productId: string) {
  try {
    const result = await db
      .select({
        product: products,
        items: sql<any[]>`
          COALESCE(
            json_agg(
              json_build_object(
                'id', ${shipmentItems.id},
                'status', ${shipmentItems.status},
                'storage_name', ${storages.name}
              ) 
              ORDER BY ${shipmentItems.createdAt} DESC
            ) FILTER (WHERE ${shipmentItems.id} IS NOT NULL),
            '[]'::json
          )
        `.as('items')
      })
      .from(products)
      .leftJoin(shipmentItems, eq(shipmentItems.productId, products.id))
      .leftJoin(storages, eq(shipmentItems.storageId, storages.id))
      .where(eq(products.id, productId))
      .groupBy(products.id);

    if (!result[0]) return;

    const doc: ProductDocument = {
      id: result[0].product.id,
      name: result[0].product.name,
      brand: result[0].product.brand,
      model: result[0].product.model,
      category: result[0].product.category || undefined,
      qr_code: result[0].product.qrCode || undefined,
      description: result[0].product.description || undefined,
      created_at: Math.floor(result[0].product.createdAt.getTime() / 1000),
      updated_at: Math.floor(result[0].product.updatedAt.getTime() / 1000),
      shipment_items: result[0].items,
    };

    await typesenseClient.collections(COLLECTIONS.PRODUCTS).documents().upsert(doc);
  } catch (error) {
    logger.error({ error }, `Failed to sync product ${productId}:`);
    throw error;
  }
}

// Sync a single shipment to Typesense
export async function syncShipment(shipmentId: string) {
  try {
    const result = await db
      .select({
        shipment: shipments,
        userName: user.name,
        itemCount: sql<number>`COUNT(${shipmentItems.id})::int`.as('item_count'),
        itemsReceived: sql<number>`COUNT(${shipmentItems.id}) FILTER (WHERE ${shipmentItems.status} = 'received')::int`.as('items_received'),
        itemsPending: sql<number>`COUNT(${shipmentItems.id}) FILTER (WHERE ${shipmentItems.status} = 'pending')::int`.as('items_pending'),
      })
      .from(shipments)
      .leftJoin(user, eq(shipments.createdBy, user.id))
      .leftJoin(shipmentItems, eq(shipmentItems.shipmentId, shipments.id))
      .where(eq(shipments.id, shipmentId))
      .groupBy(shipments.id, user.name);

    if (!result[0]) return;

    const doc: ShipmentDocument = {
      id: result[0].shipment.id,
      receipt_number: result[0].shipment.receiptNumber,
      receipt_date: Math.floor(new Date(result[0].shipment.receiptDate).getTime() / 1000),
      supplier_name: result[0].shipment.supplierName,
      status: result[0].shipment.status,
      notes: result[0].shipment.notes || undefined,
      created_by_name: result[0].userName || undefined,
      created_by_id: result[0].shipment.createdBy || undefined,
      created_at: Math.floor(result[0].shipment.createdAt.getTime() / 1000),
      updated_at: Math.floor(result[0].shipment.updatedAt.getTime() / 1000),
      item_count: result[0].itemCount,
      items_received: result[0].itemsReceived,
      items_pending: result[0].itemsPending,
    };

    await typesenseClient.collections(COLLECTIONS.SHIPMENTS).documents().upsert(doc);
  } catch (error) {
    logger.error({ error }, `Failed to sync shipment ${shipmentId}:`);
    throw error;
  }
}

// Sync a single shipment item to Typesense
export async function syncShipmentItem(itemId: string) {
  try {
    const result = await db
      .select({
        item: shipmentItems,
        product: products,
        shipment: shipments,
        storage: storages,
      })
      .from(shipmentItems)
      .innerJoin(products, eq(shipmentItems.productId, products.id))
      .innerJoin(shipments, eq(shipmentItems.shipmentId, shipments.id))
      .leftJoin(storages, eq(shipmentItems.storageId, storages.id))
      .where(eq(shipmentItems.id, itemId));

    if (!result[0]) return;

    const doc: ShipmentItemDocument = {
      id: result[0].item.id,
      shipment_id: result[0].item.shipmentId,
      product_id: result[0].item.productId,
      qr_code: result[0].item.qrCode,
      status: result[0].item.status,
      storage_id: result[0].item.storageId || undefined,
      scanned_at: result[0].item.scannedAt ? Math.floor(result[0].item.scannedAt.getTime() / 1000) : undefined,
      created_at: Math.floor(result[0].item.createdAt.getTime() / 1000),
      product_name: result[0].product.name,
      product_brand: result[0].product.brand,
      product_model: result[0].product.model,
      shipment_receipt_number: result[0].shipment.receiptNumber,
      supplier_name: result[0].shipment.supplierName,
      storage_name: result[0].storage?.name || undefined,
    };

    await typesenseClient.collections(COLLECTIONS.SHIPMENT_ITEMS).documents().upsert(doc);
  } catch (error) {
    logger.error({ error }, `Failed to sync shipment item ${itemId}:`);
    throw error;
  }
}

// Sync a single storage to Typesense
export async function syncStorage(storageId: string) {
  try {
    const result = await db
      .select({
        storage: storages,
        userName: user.name,
      })
      .from(storages)
      .leftJoin(user, eq(storages.createdBy, user.id))
      .where(eq(storages.id, storageId));

    if (!result[0]) return;

    const availableCapacity = result[0].storage.capacity - result[0].storage.usedCapacity;
    const utilizationRate = result[0].storage.capacity > 0 
      ? result[0].storage.usedCapacity / result[0].storage.capacity 
      : 0;

    const doc: StorageDocument = {
      id: result[0].storage.id,
      name: result[0].storage.name,
      location: result[0].storage.location,
      capacity: result[0].storage.capacity,
      used_capacity: result[0].storage.usedCapacity,
      available_capacity: availableCapacity,
      utilization_rate: utilizationRate,
      priority: result[0].storage.priority,
      created_by_name: result[0].userName || undefined,
      created_by_id: result[0].storage.createdBy || undefined,
      created_at: Math.floor(result[0].storage.createdAt.getTime() / 1000),
      updated_at: Math.floor(result[0].storage.updatedAt.getTime() / 1000),
    };

    await typesenseClient.collections(COLLECTIONS.STORAGES).documents().upsert(doc);
  } catch (error) {
    logger.error({ error }, `Failed to sync storage ${storageId}:`);
    throw error;
  }
}

// Bulk sync functions for initial data population
export async function bulkSyncProducts(limit = 1000, offset = 0) {
  const productList = await db
    .select({ id: products.id })
    .from(products)
    .limit(limit)
    .offset(offset);

  for (const product of productList) {
    await syncProduct(product.id);
  }

  return productList.length;
}

export async function bulkSyncShipments(limit = 1000, offset = 0) {
  const shipmentList = await db
    .select({ id: shipments.id })
    .from(shipments)
    .limit(limit)
    .offset(offset);

  for (const shipment of shipmentList) {
    await syncShipment(shipment.id);
  }

  return shipmentList.length;
}

export async function bulkSyncShipmentItems(limit = 1000, offset = 0) {
  const itemList = await db
    .select({ id: shipmentItems.id })
    .from(shipmentItems)
    .limit(limit)
    .offset(offset);

  for (const item of itemList) {
    await syncShipmentItem(item.id);
  }

  return itemList.length;
}

export async function bulkSyncStorages(limit = 1000, offset = 0) {
  const storageList = await db
    .select({ id: storages.id })
    .from(storages)
    .limit(limit)
    .offset(offset);

  for (const storage of storageList) {
    await syncStorage(storage.id);
  }

  return storageList.length;
}

// Optimized full sync function using batch operations
export async function fullSync() {
  logger.info('Starting optimized full sync to Typesense...');
  
  try {
    // Check if collections exist
    for (const collection of Object.values(COLLECTIONS)) {
      const exists = await checkCollectionExists(collection);
      if (!exists) {
        throw new Error(`Collection ${collection} does not exist. Please run init-typesense.ts first.`);
      }
    }

    // Sync products in batch
    logger.info('Syncing products...');
    const allProducts = await db.select().from(products);
    if (allProducts.length > 0) {
      const productDocs: ProductDocument[] = allProducts.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        category: product.category ?? undefined,
        qr_code: product.qrCode ?? undefined,
        description: product.description ?? undefined,
        created_at: Math.floor(product.createdAt.getTime() / 1000),
        updated_at: Math.floor(product.updatedAt.getTime() / 1000),
      }));
      
      await typesenseClient.collections(COLLECTIONS.PRODUCTS).documents().import(productDocs, { action: 'upsert' });
      logger.info(`  ✅ Synced ${productDocs.length} products`);
    }

    // Sync shipments in batch
    logger.info('Syncing shipments...');
    const allShipments = await db
      .select({
        shipment: shipments,
        userName: user.name,
        itemCount: sql<number>`COUNT(${shipmentItems.id})::int`.as('item_count'),
        itemsReceived: sql<number>`COUNT(${shipmentItems.id}) FILTER (WHERE ${shipmentItems.status} = 'received')::int`.as('items_received'),
        itemsPending: sql<number>`COUNT(${shipmentItems.id}) FILTER (WHERE ${shipmentItems.status} = 'pending')::int`.as('items_pending'),
      })
      .from(shipments)
      .leftJoin(user, eq(shipments.createdBy, user.id))
      .leftJoin(shipmentItems, eq(shipmentItems.shipmentId, shipments.id))
      .groupBy(shipments.id, user.name);

    if (allShipments.length > 0) {
      const shipmentDocs: ShipmentDocument[] = allShipments.map(result => ({
        id: result.shipment.id,
        receipt_number: result.shipment.receiptNumber,
        receipt_date: Math.floor(new Date(result.shipment.receiptDate).getTime() / 1000),
        supplier_name: result.shipment.supplierName,
        status: result.shipment.status,
        notes: result.shipment.notes ?? undefined,
        created_by_name: result.userName ?? undefined,
        created_by_id: result.shipment.createdBy ?? undefined,
        created_at: Math.floor(result.shipment.createdAt.getTime() / 1000),
        updated_at: Math.floor(result.shipment.updatedAt.getTime() / 1000),
        item_count: result.itemCount,
        items_received: result.itemsReceived,
        items_pending: result.itemsPending,
      }));

      await typesenseClient.collections(COLLECTIONS.SHIPMENTS).documents().import(shipmentDocs, { action: 'upsert' });
      logger.info(`  ✅ Synced ${shipmentDocs.length} shipments`);
    }

    // Sync shipment items in batch
    logger.info('Syncing shipment items...');
    const allShipmentItems = await db
      .select({
        item: shipmentItems,
        product: products,
        shipment: shipments,
        storage: storages,
      })
      .from(shipmentItems)
      .innerJoin(products, eq(shipmentItems.productId, products.id))
      .innerJoin(shipments, eq(shipmentItems.shipmentId, shipments.id))
      .leftJoin(storages, eq(shipmentItems.storageId, storages.id));

    if (allShipmentItems.length > 0) {
      const shipmentItemDocs: ShipmentItemDocument[] = allShipmentItems.map(result => ({
        id: result.item.id,
        shipment_id: result.item.shipmentId,
        product_id: result.item.productId,
        qr_code: result.item.qrCode,
        status: result.item.status,
        storage_id: result.item.storageId ?? undefined,
        scanned_at: result.item.scannedAt ? Math.floor(result.item.scannedAt.getTime() / 1000) : undefined,
        created_at: Math.floor(result.item.createdAt.getTime() / 1000),
        product_name: result.product.name,
        product_brand: result.product.brand,
        product_model: result.product.model,
        shipment_receipt_number: result.shipment.receiptNumber,
        supplier_name: result.shipment.supplierName,
        storage_name: result.storage?.name ?? undefined,
      }));

      await typesenseClient.collections(COLLECTIONS.SHIPMENT_ITEMS).documents().import(shipmentItemDocs, { action: 'upsert' });
      logger.info(`  ✅ Synced ${shipmentItemDocs.length} shipment items`);
    }

    // Sync storages in batch
    logger.info('Syncing storages...');
    const allStorages = await db
      .select({
        storage: storages,
        userName: user.name,
      })
      .from(storages)
      .leftJoin(user, eq(storages.createdBy, user.id));

    if (allStorages.length > 0) {
      const storageDocs: StorageDocument[] = allStorages.map(result => {
        const availableCapacity = result.storage.capacity - result.storage.usedCapacity;
        const utilizationRate = result.storage.capacity > 0 ? (result.storage.usedCapacity / result.storage.capacity) * 100 : 0;
        
        return {
          id: result.storage.id,
          name: result.storage.name,
          location: result.storage.location,
          capacity: result.storage.capacity,
          used_capacity: result.storage.usedCapacity,
          available_capacity: availableCapacity,
          utilization_rate: utilizationRate,
          priority: result.storage.priority,
          created_by_name: result.userName ?? undefined,
          created_by_id: result.storage.createdBy ?? undefined,
          created_at: Math.floor(result.storage.createdAt.getTime() / 1000),
          updated_at: Math.floor(result.storage.updatedAt.getTime() / 1000),
        };
      });

              await typesenseClient.collections(COLLECTIONS.STORAGES).documents().import(storageDocs, { action: 'upsert' });
        logger.info(`  ✅ Synced ${storageDocs.length} storages`);
    }

    logger.info('\n🎉 Optimized full sync completed successfully!');
  } catch (error) {
    logger.error({ error }, 'Full sync failed:');
    throw error;
  }
}

// Incremental sync for recent changes
export async function incrementalSync(sinceMinutesAgo = 5) {
  const since = new Date(Date.now() - sinceMinutesAgo * 60 * 1000);
  
  try {
    // Sync recently updated products
    const recentProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(gte(products.updatedAt, since));
    
    for (const product of recentProducts) {
      await syncProduct(product.id);
    }

    // Sync recently updated shipments
    const recentShipments = await db
      .select({ id: shipments.id })
      .from(shipments)
      .where(gte(shipments.updatedAt, since));
    
    for (const shipment of recentShipments) {
      await syncShipment(shipment.id);
    }

    // Sync recently created shipment items
    const recentItems = await db
      .select({ id: shipmentItems.id })
      .from(shipmentItems)
      .where(gte(shipmentItems.createdAt, since));
    
    for (const item of recentItems) {
      await syncShipmentItem(item.id);
    }

    // Sync recently updated storages
    const recentStorages = await db
      .select({ id: storages.id })
      .from(storages)
      .where(gte(storages.updatedAt, since));
    
    for (const storage of recentStorages) {
      await syncStorage(storage.id);
    }

    return {
      products: recentProducts.length,
      shipments: recentShipments.length,
      items: recentItems.length,
      storages: recentStorages.length,
    };
  } catch (error) {
    logger.error({ error }, 'Incremental sync failed:');
    throw error;
  }
}