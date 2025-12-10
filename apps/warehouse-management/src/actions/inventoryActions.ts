'use server';

import { db } from '~/server/db';
import { inventory, products, bundles, storages, orders, user } from '~/server/db/schema';
import { eq, desc, sql, and, ilike, or } from 'drizzle-orm';
import type { ActionResult } from './types';
import type { PaginationParams, PaginatedResult } from '~/lib/queries/paginateQuery';
import { requireOrgContext } from '~/lib/authorization';
import { getDbErrorMessage } from '~/lib/error-handling';

// Types for Inventory
export type InventoryItem = typeof inventory.$inferSelect;
export type InventoryStatus = 'in_stock' | 'allocated' | 'sold' | 'shipped' | 'returned';
export type InventorySourceType = 'assembly' | 'inbound' | 'return';

export interface InventoryWithRelations extends InventoryItem {
  product: {
    id: string;
    name: string;
    brand: string;
    model: string;
  } | null;
  bundle: {
    id: string;
    name: string;
    qrCode: string;
  } | null;
  storage: {
    id: string;
    name: string;
  } | null;
  order: {
    id: string;
    orderNumber: string;
  } | null;
  createdByUser: {
    id: string;
    name: string;
  } | null;
}

export interface InventoryFilters {
  status?: InventoryStatus;
  sourceType?: InventorySourceType;
  productId?: string;
  bundleId?: string;
  storageId?: string;
  search?: string;
}

export interface InventoryStats {
  inStock: number;
  allocated: number;
  sold: number;
  shipped: number;
  returned: number;
  total: number;
}

/**
 * Get inventory statistics
 */
export async function getInventoryStatsAction(): Promise<ActionResult<InventoryStats>> {
  try {
    const { organizationId } = await requireOrgContext();

    const stats = await db
      .select({
        status: inventory.status,
        count: sql<number>`count(*)::int`,
      })
      .from(inventory)
      .where(eq(inventory.organizationId, organizationId))
      .groupBy(inventory.status);

    const result: InventoryStats = {
      inStock: 0,
      allocated: 0,
      sold: 0,
      shipped: 0,
      returned: 0,
      total: 0,
    };

    for (const stat of stats) {
      switch (stat.status) {
        case 'in_stock':
          result.inStock = stat.count;
          break;
        case 'allocated':
          result.allocated = stat.count;
          break;
        case 'sold':
          result.sold = stat.count;
          break;
        case 'shipped':
          result.shipped = stat.count;
          break;
        case 'returned':
          result.returned = stat.count;
          break;
      }
      result.total += stat.count;
    }

    return {
      success: true,
      message: 'Lấy thống kê tồn kho thành công',
      data: result,
    };
  } catch (error) {
    console.error('getInventoryStatsAction error:', error);
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể lấy thống kê tồn kho'),
    };
  }
}

/**
 * Get inventory list with pagination and filters
 */
export async function getInventoryAction(
  filters?: InventoryFilters,
  pagination?: PaginationParams
): Promise<ActionResult<PaginatedResult<InventoryWithRelations>>> {
  try {
    const { organizationId } = await requireOrgContext();

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [eq(inventory.organizationId, organizationId)];

    if (filters?.status) {
      conditions.push(eq(inventory.status, filters.status));
    }
    if (filters?.sourceType) {
      conditions.push(eq(inventory.sourceType, filters.sourceType));
    }
    if (filters?.productId) {
      conditions.push(eq(inventory.productId, filters.productId));
    }
    if (filters?.bundleId) {
      conditions.push(eq(inventory.bundleId, filters.bundleId));
    }
    if (filters?.storageId) {
      conditions.push(eq(inventory.storageId, filters.storageId));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(inventory.qrCode, `%${filters.search}%`),
          ilike(inventory.customerId, `%${filters.search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(whereClause);

    const totalItems = countResult?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated data with relations
    const data = await db
      .select({
        // Inventory fields
        id: inventory.id,
        organizationId: inventory.organizationId,
        qrCode: inventory.qrCode,
        productId: inventory.productId,
        status: inventory.status,
        sourceType: inventory.sourceType,
        bundleId: inventory.bundleId,
        shipmentId: inventory.shipmentId,
        storageId: inventory.storageId,
        orderId: inventory.orderId,
        soldAt: inventory.soldAt,
        customerId: inventory.customerId,
        firstScannedByCustomerAt: inventory.firstScannedByCustomerAt,
        customerScanCount: inventory.customerScanCount,
        warrantyMonths: inventory.warrantyMonths,
        warrantyExpiresAt: inventory.warrantyExpiresAt,
        createdAt: inventory.createdAt,
        createdBy: inventory.createdBy,
        // Product relation
        product: {
          id: products.id,
          name: products.name,
          brand: products.brand,
          model: products.model,
        },
        // Bundle relation
        bundle: {
          id: bundles.id,
          name: bundles.name,
          qrCode: bundles.qrCode,
        },
        // Storage relation
        storage: {
          id: storages.id,
          name: storages.name,
        },
        // Order relation
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
        },
        // Created by relation
        createdByUser: {
          id: user.id,
          name: user.name,
        },
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(bundles, eq(inventory.bundleId, bundles.id))
      .leftJoin(storages, eq(inventory.storageId, storages.id))
      .leftJoin(orders, eq(inventory.orderId, orders.id))
      .leftJoin(user, eq(inventory.createdBy, user.id))
      .where(whereClause)
      .orderBy(desc(inventory.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      success: true,
      message: 'Lấy danh sách tồn kho thành công',
      data: {
        data: data as InventoryWithRelations[],
        metadata: {
          currentPage: page,
          pageSize,
          totalPages,
          totalItems,
        },
      },
    };
  } catch (error) {
    console.error('getInventoryAction error:', error);
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể lấy danh sách tồn kho'),
    };
  }
}

/**
 * Get a single inventory item by QR code
 */
export async function getInventoryItemAction(
  qrCode: string
): Promise<ActionResult<InventoryWithRelations | null>> {
  try {
    const { organizationId } = await requireOrgContext();

    const [item] = await db
      .select({
        // Inventory fields
        id: inventory.id,
        organizationId: inventory.organizationId,
        qrCode: inventory.qrCode,
        productId: inventory.productId,
        status: inventory.status,
        sourceType: inventory.sourceType,
        bundleId: inventory.bundleId,
        shipmentId: inventory.shipmentId,
        storageId: inventory.storageId,
        orderId: inventory.orderId,
        soldAt: inventory.soldAt,
        customerId: inventory.customerId,
        firstScannedByCustomerAt: inventory.firstScannedByCustomerAt,
        customerScanCount: inventory.customerScanCount,
        warrantyMonths: inventory.warrantyMonths,
        warrantyExpiresAt: inventory.warrantyExpiresAt,
        createdAt: inventory.createdAt,
        createdBy: inventory.createdBy,
        // Product relation
        product: {
          id: products.id,
          name: products.name,
          brand: products.brand,
          model: products.model,
        },
        // Bundle relation
        bundle: {
          id: bundles.id,
          name: bundles.name,
          qrCode: bundles.qrCode,
        },
        // Storage relation
        storage: {
          id: storages.id,
          name: storages.name,
        },
        // Order relation
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
        },
        // Created by relation
        createdByUser: {
          id: user.id,
          name: user.name,
        },
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(bundles, eq(inventory.bundleId, bundles.id))
      .leftJoin(storages, eq(inventory.storageId, storages.id))
      .leftJoin(orders, eq(inventory.orderId, orders.id))
      .leftJoin(user, eq(inventory.createdBy, user.id))
      .where(
        and(
          eq(inventory.organizationId, organizationId),
          eq(inventory.qrCode, qrCode)
        )
      )
      .limit(1);

    return {
      success: true,
      message: item ? 'Tìm thấy sản phẩm' : 'Không tìm thấy sản phẩm',
      data: (item as InventoryWithRelations) ?? null,
    };
  } catch (error) {
    console.error('getInventoryItemAction error:', error);
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể tìm sản phẩm'),
    };
  }
}

/**
 * Update inventory item status
 */
export async function updateInventoryStatusAction(
  qrCode: string,
  status: InventoryStatus,
  additionalData?: {
    orderId?: string;
    customerId?: string;
    storageId?: string;
  }
): Promise<ActionResult<InventoryItem>> {
  try {
    const { organizationId, userName } = await requireOrgContext();

    const updateData: Partial<typeof inventory.$inferInsert> = {
      status,
    };

    // Handle status-specific data
    if (status === 'sold' && additionalData?.orderId) {
      updateData.orderId = additionalData.orderId;
      updateData.soldAt = new Date();
      if (additionalData.customerId) {
        updateData.customerId = additionalData.customerId;
      }
    }

    if (additionalData?.storageId) {
      updateData.storageId = additionalData.storageId;
    }

    const [updated] = await db
      .update(inventory)
      .set(updateData)
      .where(
        and(
          eq(inventory.organizationId, organizationId),
          eq(inventory.qrCode, qrCode)
        )
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm để cập nhật',
      };
    }

    return {
      success: true,
      message: `Đã cập nhật trạng thái thành "${getStatusLabel(status)}"`,
      data: updated,
    };
  } catch (error) {
    console.error('updateInventoryStatusAction error:', error);
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể cập nhật trạng thái'),
    };
  }
}

/**
 * Create inventory item from inbound scan (for paddles and pre-packaged items)
 */
export async function createInventoryItemAction(data: {
  qrCode: string;
  productId: string;
  shipmentId?: string;
  storageId?: string;
  warrantyMonths?: number;
}): Promise<ActionResult<InventoryItem>> {
  try {
    const { organizationId, userId } = await requireOrgContext();

    // Check if QR code already exists
    const [existing] = await db
      .select({ id: inventory.id })
      .from(inventory)
      .where(
        and(
          eq(inventory.organizationId, organizationId),
          eq(inventory.qrCode, data.qrCode)
        )
      )
      .limit(1);

    if (existing) {
      return {
        success: false,
        message: 'Mã QR đã tồn tại trong hệ thống',
      };
    }

    // Create inventory item
    const [created] = await db
      .insert(inventory)
      .values({
        organizationId,
        qrCode: data.qrCode,
        productId: data.productId,
        status: 'in_stock',
        sourceType: 'inbound',
        shipmentId: data.shipmentId,
        storageId: data.storageId,
        warrantyMonths: data.warrantyMonths ?? 12,
        createdBy: userId,
      })
      .returning();

    return {
      success: true,
      message: 'Đã tạo sản phẩm trong kho',
      data: created,
    };
  } catch (error) {
    console.error('createInventoryItemAction error:', error);
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể tạo sản phẩm'),
    };
  }
}

// Helper function to get status label in Vietnamese
function getStatusLabel(status: InventoryStatus): string {
  switch (status) {
    case 'in_stock':
      return 'Trong kho';
    case 'allocated':
      return 'Đã phân bổ';
    case 'sold':
      return 'Đã bán';
    case 'shipped':
      return 'Đã giao';
    case 'returned':
      return 'Đã trả';
    default:
      return status;
  }
}
