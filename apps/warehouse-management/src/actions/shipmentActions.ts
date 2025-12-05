'use server';

import { db } from '~/server/db';
import { products, shipments, shipmentItems } from '~/server/db/schema';
import { generateShortCode } from '~/lib/product-code';
import { eq, desc, sql, and, like, gte, lte, asc } from 'drizzle-orm';
import type { ActionResult, ShipmentResult, ProcessedItem, GroupedQRItems } from './types';
import { queueShipmentInventorySync } from './shopify/inventoryActions';
import type { ShipmentFormData } from '~/components/shipments/ShipmentSchema';
import type { PaginationParams, PaginatedResult } from '~/lib/queries/paginateQuery';
import { logger } from '~/lib/logger';
import { createShopifyProductFromWarehouse } from '~/lib/shopify/products';
import { revalidatePath } from 'next/cache';
import { isPackableType } from '~/lib/constants/product-types';
import { requireOrgContext } from '~/lib/authorization';

// Helper: Find or create a pack product from a base product
// Uses insert-first pattern to avoid race conditions (relies on unique constraint)
async function findOrCreatePackProduct(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  baseProduct: typeof products.$inferSelect,
  packSize: number,
  organizationId: string
): Promise<typeof products.$inferSelect> {
  const packProductId = `prd_${Date.now()}_pack${packSize}`;
  const packModel = `${baseProduct.model} ${packSize}-Pack`;
  const packProductName = `${baseProduct.brand} ${packModel}`;

  // Try to insert first - if unique constraint fails, fetch existing
  try {
    const [newPackProduct] = await tx
      .insert(products)
      .values({
        id: packProductId,
        organizationId,
        name: packProductName,
        brand: baseProduct.brand,
        brandId: baseProduct.brandId,
        model: packModel,
        description: `${baseProduct.name} - Gói ${packSize} quả`,
        category: baseProduct.category,
        colorId: baseProduct.colorId,
        weight: baseProduct.weight,
        size: baseProduct.size,
        thickness: baseProduct.thickness,
        material: baseProduct.material,
        handleLength: baseProduct.handleLength,
        handleCircumference: baseProduct.handleCircumference,
        productType: 'ball', // Pack products inherit base product's type
        isPackProduct: true,
        packSize: packSize,
        baseProductId: baseProduct.id,
        qrCode: null,
      })
      .returning();

    if (newPackProduct) {
      logger.info(
        { packProductId, baseProductId: baseProduct.id, packSize },
        `Created pack product: ${packProductName}`
      );

      // Sync to Shopify in background (don't await to not block shipment creation)
      createShopifyProductFromWarehouse(newPackProduct).catch((err) => {
        logger.warn({ error: err, productId: packProductId }, 'Failed to sync pack product to Shopify');
      });

      return newPackProduct;
    }
  } catch (error) {
    // Check if it's a unique constraint violation (race condition with another request)
    const isUniqueViolation = error instanceof Error &&
      (error.message.includes('unique constraint') ||
       error.message.includes('duplicate key') ||
       error.message.includes('products_base_pack_unique'));

    if (!isUniqueViolation) {
      throw error;
    }
    // Fall through to fetch existing pack product
    logger.debug(
      { baseProductId: baseProduct.id, packSize },
      'Pack product already exists (concurrent creation), fetching existing'
    );
  }

  // If insert failed due to unique constraint or returned nothing, fetch existing
  const [existingPack] = await tx
    .select()
    .from(products)
    .where(
      and(
        eq(products.organizationId, organizationId),
        eq(products.baseProductId, baseProduct.id),
        eq(products.packSize, packSize)
      )
    )
    .limit(1);

  if (!existingPack) {
    throw new Error(`Failed to find or create pack product for ${baseProduct.name} (${packSize}-pack)`);
  }

  return existingPack;
}

export async function createShipmentAction(
  data: ShipmentFormData
): Promise<ActionResult<ShipmentResult>> {
  try {
    const { organizationId, userId, userName } = await requireOrgContext({ permissions: ['create:shipments'] });

    logger.info({ userId, userName, organizationId, receiptNumber: data.receiptNumber, supplierName: data.supplierName, itemCount: data.items.length }, `User ${userName} creating shipment`);
    const { receiptNumber, receiptDate, supplierName, providerId, items } = data;

    if (!receiptNumber || !receiptDate || !supplierName || !items || items.length === 0) {
      logger.error({ userId, userName, organizationId, receiptNumber: data.receiptNumber }, `User ${userName} failed to create shipment`);
      return {
        success: false,
        error: 'Thiếu thông tin bắt buộc',
      };
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      const shipmentId = `shp_${Date.now()}`;
      await tx.insert(shipments).values({
        id: shipmentId,
        organizationId,
        receiptNumber,
        receiptDate: receiptDate,
        supplierName,
        providerId: providerId || null,
        status: 'pending',
      });

      // Process items
      const processedItems: ProcessedItem[] = [];
      let sequenceNumber = 1;

      for (const item of items) {
        // item.brand now contains the product ID (temporary solution)
        // Find the product in database (must be in same org)
        const [product] = await tx
          .select()
          .from(products)
          .where(and(
            eq(products.id, item.brand),
            eq(products.organizationId, organizationId)
          ))
          .limit(1);

        let productId: string;
        let brandName: string;
        let modelName: string;
        let numberOfItems: number;

        if (product) {
          // Check if this is a ball product (type: 'ball') with pack configuration
          const isPackableWithConfig =
            isPackableType(product.productType) &&
            !product.isPackProduct &&
            item.isPackableProduct &&
            item.totalUnits &&
            item.packSize;

          if (isPackableWithConfig) {
            // BALL PACK PRODUCT FLOW
            // Validate divisibility
            if (item.totalUnits! % item.packSize! !== 0) {
              throw new Error(
                `${product.name}: ${item.totalUnits} quả không chia hết cho ${item.packSize}. ` +
                  `Vui lòng nhập số lượng chia hết.`
              );
            }

            // Find or create the pack product
            const packProduct = await findOrCreatePackProduct(tx, product, item.packSize!, organizationId);

            productId = packProduct.id;
            brandName = packProduct.brand;
            modelName = packProduct.model;
            numberOfItems = item.totalUnits! / item.packSize!;

            logger.info(
              {
                baseProductId: product.id,
                packProductId: productId,
                totalUnits: item.totalUnits,
                packSize: item.packSize,
                numberOfPacks: numberOfItems,
              },
              `Creating ${numberOfItems} packs of ${item.packSize} for ${product.name}`
            );
          } else {
            // INDIVIDUAL ITEM FLOW (paddles, or pack products directly selected)
            productId = product.id;
            brandName = product.brand;
            modelName = product.model;
            numberOfItems = item.quantity;
          }
        } else {
          // Product must exist - throw error if not found
          throw new Error(`Không tìm thấy sản phẩm với ID: ${item.brand}. Vui lòng tạo sản phẩm trước.`);
        }

        // Create shipment items with unique QR codes for each quantity/pack
        for (let i = 0; i < numberOfItems; i++) {
          const itemId = `itm_${Date.now()}_${sequenceNumber}_${i}`;
          const qrCode = generateShortCode();

          await tx.insert(shipmentItems).values({
            id: itemId,
            organizationId,
            shipmentId,
            productId,
            quantity: 1,
            qrCode,
            status: 'pending',
          });

          processedItems.push({
            id: itemId,
            productId,
            qrCode,
            brand: brandName,
            model: modelName,
          });
        }

        sequenceNumber += numberOfItems;
      }

      return {
        shipmentId,
        items: processedItems,
      };
    });

    logger.info({
      userId,
      userName,
      organizationId,
      shipmentId: result.shipmentId,
      receiptNumber,
      supplierName,
      itemCount: result.items.length,
    }, `User ${userName} created shipment ${result.shipmentId} with ${result.items.length} items`);

    // Revalidate paths (products may have new pack products)
    revalidatePath('/products');
    revalidatePath('/shipments');
    revalidatePath('/shipments/new');

    return {
      success: true,
      message: 'Phiếu nhập đã được tạo thành công',
      data: result,
    };
  } catch (error) {
    logger.error({ error, receiptNumber: data.receiptNumber }, 'Failed to create shipment');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Không thể tạo phiếu nhập: ${errorMessage}`,
    };
  }
}


export async function getShipmentWithItemsAction(
  shipmentId: string
): Promise<ActionResult<{
  shipment: typeof shipments.$inferSelect;
  groupedItems: GroupedQRItems[];
}>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Fetch shipment details (must be in same org)
    const shipmentData = await db
      .select()
      .from(shipments)
      .where(and(
        eq(shipments.id, shipmentId),
        eq(shipments.organizationId, organizationId)
      ))
      .limit(1);

    if (!shipmentData || shipmentData.length === 0) {
      return {
        success: false,
        error: 'Không tìm thấy phiếu nhập',
      };
    }

    // Fetch shipment items with product details (filter by org)
    const items = await db
      .select({
        id: shipmentItems.id,
        qrCode: shipmentItems.qrCode,
        status: shipmentItems.status,
        productId: products.id,
        productName: products.name,
        brand: products.brand,
        model: products.model,
        createdAt: shipmentItems.createdAt,
      })
      .from(shipmentItems)
      .leftJoin(products, eq(shipmentItems.productId, products.id))
      .where(and(
        eq(shipmentItems.shipmentId, shipmentId),
        eq(shipmentItems.organizationId, organizationId)
      ))
      .orderBy(shipmentItems.createdAt);

    // Group items by brand and model
    const groupedMap = new Map<string, GroupedQRItems>();
    
    for (const item of items) {
      const key = `${item.brand}-${item.model}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          brand: item.brand ?? '',
          model: item.model ?? '',
          items: [],
        });
      }
      
      groupedMap.get(key)!.items.push({
        id: item.id,
        qrCode: item.qrCode,
        status: item.status,
      });
    }

    const groupedItems = Array.from(groupedMap.values());

    return {
      success: true,
      data: {
        shipment: shipmentData[0]!,
        groupedItems,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching shipment:');
    return {
      success: false,
      error: 'Không thể tải thông tin phiếu nhập',
    };
  }
}

// Types for shipment with items
export interface ShipmentWithItems {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  supplierName: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
}

export interface ShipmentMetrics {
  totalShipments: number;
  pendingShipments: number;
  receivedShipments: number;
  completedShipments: number;
  totalItems: number;
}

export interface ShipmentFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  ids?: string[];
}

// Fetch all shipments with item counts
export async function getShipmentsWithItemsAction(
  filters?: ShipmentFilters,
  paginationParams?: PaginationParams
): Promise<ActionResult<PaginatedResult<ShipmentWithItems>>> {
  try {
    const { organizationId } = await requireOrgContext();
    const { page = 1, pageSize = 100, sortBy = 'createdAt', sortOrder = 'desc' } = paginationParams || {};
    const offset = (page - 1) * pageSize;

    const baseQuery = db
      .select({
        id: shipments.id,
        receiptNumber: shipments.receiptNumber,
        receiptDate: shipments.receiptDate,
        supplierName: shipments.supplierName,
        status: shipments.status,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
        updatedAt: shipments.updatedAt,
        itemCount: sql<number>`count(${shipmentItems.id})::int`,
      })
      .from(shipments)
      .leftJoin(shipmentItems, eq(shipments.id, shipmentItems.shipmentId))
      .groupBy(shipments.id);

    // Apply filters - always filter by organization
    const conditions = [eq(shipments.organizationId, organizationId)];

    if (filters?.ids && filters.ids.length > 0) {
      conditions.push(sql`${shipments.id} = ANY(${filters.ids})`);
    }

    if (filters?.search) {
      conditions.push(
        sql`(${shipments.receiptNumber} ILIKE ${`%${filters.search}%`} OR ${shipments.supplierName} ILIKE ${`%${filters.search}%`})`
      );
    }

    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(shipments.status, filters.status));
    }

    if (filters?.startDate) {
      conditions.push(gte(shipments.receiptDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(shipments.receiptDate, filters.endDate));
    }

    const query = baseQuery.where(and(...conditions));

    // Get total count with same filters
    const countQuery = db
      .select({ count: sql<number>`count(DISTINCT ${shipments.id})::int` })
      .from(shipments)
      .leftJoin(shipmentItems, eq(shipments.id, shipmentItems.shipmentId))
      .where(and(...conditions));

    const countResult = await countQuery;
    const totalItems = countResult?.[0]?.count ?? 0;

    // Apply sorting
    let finalQuery;
    if (sortBy === 'itemCount') {
      const sortColumn = sql<number>`count(${shipmentItems.id})`;
      finalQuery = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
    } else if (sortBy && (shipments as any)[sortBy]) {
      const sortColumn = (shipments as any)[sortBy];
      finalQuery = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
    } else {
      finalQuery = query.orderBy(desc(shipments.createdAt));
    }

    // Apply pagination
    const result = await finalQuery.limit(pageSize).offset(offset);

    return {
      success: true,
      data: {
        data: result,
        metadata: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          totalItems,
        },
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching shipments:');
    return {
      success: false,
      error: 'Không thể tải danh sách phiếu nhập',
    };
  }
}


// Get shipment metrics for dashboard
export async function getShipmentMetricsAction(): Promise<ActionResult<ShipmentMetrics>> {
  try {
    const { organizationId } = await requireOrgContext();

    const [metricsResult] = await db
      .select({
        totalShipments: sql<number>`count(distinct ${shipments.id})::int`,
        pendingShipments: sql<number>`count(distinct case when ${shipments.status} = 'pending' then ${shipments.id} end)::int`,
        receivedShipments: sql<number>`count(distinct case when ${shipments.status} = 'received' then ${shipments.id} end)::int`,
        completedShipments: sql<number>`count(distinct case when ${shipments.status} = 'completed' then ${shipments.id} end)::int`,
        totalItems: sql<number>`count(${shipmentItems.id})::int`,
      })
      .from(shipments)
      .leftJoin(shipmentItems, eq(shipments.id, shipmentItems.shipmentId))
      .where(eq(shipments.organizationId, organizationId));

    return {
      success: true,
      data: metricsResult as ShipmentMetrics,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching metrics:');
    return {
      success: false,
      error: 'Không thể tải thống kê',
    };
  }
}

// Update shipment status
export async function updateShipmentStatusAction(
  shipmentId: string,
  newStatus: 'pending' | 'received' | 'completed'
): Promise<ActionResult<void>> {
  try {
    const { organizationId } = await requireOrgContext({ permissions: ['update:shipments'] });

    await db
      .update(shipments)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(and(
        eq(shipments.id, shipmentId),
        eq(shipments.organizationId, organizationId)
      ));

    if (newStatus === 'received') {
      void queueShipmentInventorySync(shipmentId);
    }

    return {
      success: true,
      message: `Đã cập nhật trạng thái phiếu nhập thành ${newStatus}`,
    };
  } catch (error) {
    logger.error({ error }, 'Error updating shipment status:');
    return {
      success: false,
      error: 'Không thể cập nhật trạng thái phiếu nhập',
    };
  }
}

// Get shipment by ID with items
export async function getShipmentByIdAction(
  id: string
): Promise<ActionResult<ShipmentWithItems>> {
  try {
    const { organizationId } = await requireOrgContext();

    const [shipmentData] = await db
      .select({
        id: shipments.id,
        receiptNumber: shipments.receiptNumber,
        receiptDate: shipments.receiptDate,
        supplierName: shipments.supplierName,
        status: shipments.status,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
        updatedAt: shipments.updatedAt,
        itemCount: sql<number>`count(${shipmentItems.id})::int`,
      })
      .from(shipments)
      .leftJoin(shipmentItems, eq(shipments.id, shipmentItems.shipmentId))
      .where(and(
        eq(shipments.id, id),
        eq(shipments.organizationId, organizationId)
      ))
      .groupBy(shipments.id);

    if (!shipmentData) {
      return {
        success: false,
        error: 'Không tìm thấy phiếu nhập',
      };
    }

    return {
      success: true,
      message: 'Lấy thông tin phiếu nhập thành công',
      data: shipmentData,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching shipment by id:');
    return {
      success: false,
      error: 'Lỗi khi lấy thông tin phiếu nhập',
    };
  }
}
