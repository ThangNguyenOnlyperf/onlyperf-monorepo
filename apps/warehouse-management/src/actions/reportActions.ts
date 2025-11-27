'use server';

import { db } from '~/server/db';
import {
  shipmentItems,
  shipments,
  products,
  orders,
  orderItems,
  customers,
  providers,
  storages,
  colors,
} from '~/server/db/schema';
import { eq, and, or, ilike, sql, desc, asc, inArray } from 'drizzle-orm';
import { logger } from '~/lib/logger';
import { requireAuth } from '~/lib/authorization';

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ProductTrackingItem {
  id: string;
  qrCode: string;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string;
    color?: string | null;
    price: number;
  };
  shipment: {
    id: string;
    receiptNumber: string;
    receiptDate: string;
    supplierName: string;
  };
  order?: {
    id: string;
    orderNumber: string;
    orderDate: Date;
    deliveryStatus: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  };
  status: 'pending' | 'received' | 'sold' | 'shipped' | 'returned';
  storage?: {
    id: string;
    name: string;
    location: string;
  };
  scannedAt: Date | null;
  createdAt: Date;
}

export interface ProductTrackingFilters {
  search?: string;
  status?: string[];
  shipmentId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'scannedAt' | 'product' | 'shipment';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductTrackingStats {
  totalItems: number;
  pendingCount: number;
  receivedCount: number;
  soldCount: number;
  shippedCount: number;
  returnedCount: number;
}

function determineItemStatus(
  shipmentItem: any,
  orderItem: any,
  order: any
): ProductTrackingItem['status'] {
  // If there's no order, check shipment item status
  if (!orderItem || !order) {
    if (shipmentItem.status === 'received' || shipmentItem.status === 'scanned') {
      return 'received';
    }
    return 'pending';
  }

  // If there's an order, check delivery status
  switch (order.deliveryStatus) {
    case 'delivered':
      return 'shipped';
    case 'failed':
      return 'returned';
    case 'processing':
    case 'waiting_for_delivery':
      return 'sold';
    default:
      return 'sold';
  }
}

export async function getProductTrackingReport(
  filters: ProductTrackingFilters = {}
): Promise<ActionResult<{
  items: ProductTrackingItem[];
  stats: ProductTrackingStats;
  totalPages: number;
  currentPage: number;
}>> {
  try {
    // Require authorization for viewing reports (admin, accountant, or warehouse staff with view permission)
    const session = await requireAuth({ permissions: ['view:reports'] });
    logger.info({ userId: session.user.id, userEmail: session.user.email, filters }, 'Đang xem báo cáo theo dõi sản phẩm');

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const whereConditions = [];
    
    if (filters.search) {
      whereConditions.push(
        or(
          ilike(shipmentItems.qrCode, `%${filters.search}%`),
          ilike(products.name, `%${filters.search}%`),
          ilike(products.model, `%${filters.search}%`),
          ilike(shipments.receiptNumber, `%${filters.search}%`)
        )
      );
    }

    if (filters.shipmentId) {
      whereConditions.push(eq(shipmentItems.shipmentId, filters.shipmentId));
    }

    if (filters.startDate) {
      whereConditions.push(
        sql`${shipmentItems.createdAt} >= ${new Date(filters.startDate)}`
      );
    }

    if (filters.endDate) {
      whereConditions.push(
        sql`${shipmentItems.createdAt} <= ${new Date(filters.endDate)}`
      );
    }

    const whereClause = whereConditions.length > 0 
      ? and(...whereConditions) 
      : undefined;

    // Query for items with all related data
    const query = db
      .select({
        shipmentItem: shipmentItems,
        product: products,
        color: colors,
        shipment: shipments,
        storage: storages,
        orderItem: orderItems,
        order: orders,
        customer: customers,
      })
      .from(shipmentItems)
      .leftJoin(products, eq(shipmentItems.productId, products.id))
      .leftJoin(colors, eq(colors.id, products.colorId))
      .leftJoin(shipments, eq(shipmentItems.shipmentId, shipments.id))
      .leftJoin(storages, eq(shipmentItems.storageId, storages.id))
      .leftJoin(orderItems, eq(orderItems.shipmentItemId, shipmentItems.id))
      .leftJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause);

    // Apply sorting
    const sortColumn = filters.sortBy ?? 'createdAt';
    const sortDirection = filters.sortOrder ?? 'desc';
    
    if (sortColumn === 'product') {
      query.orderBy(sortDirection === 'asc' ? asc(products.name) : desc(products.name));
    } else if (sortColumn === 'shipment') {
      query.orderBy(sortDirection === 'asc' ? asc(shipments.receiptNumber) : desc(shipments.receiptNumber));
    } else {
      query.orderBy(
        sortDirection === 'asc' 
          ? asc(shipmentItems.createdAt) 
          : desc(shipmentItems.createdAt)
      );
    }

    // Get all data for stats calculation
    const allData = await query;
    
    // Calculate stats
    const stats: ProductTrackingStats = {
      totalItems: allData.length,
      pendingCount: 0,
      receivedCount: 0,
      soldCount: 0,
      shippedCount: 0,
      returnedCount: 0,
    };

    // Process all items to calculate stats and prepare filtered results
    const processedItems: ProductTrackingItem[] = [];
    
    for (const row of allData) {
      const status = determineItemStatus(row.shipmentItem, row.orderItem, row.order);
      
      // Update stats
      switch (status) {
        case 'pending':
          stats.pendingCount++;
          break;
        case 'received':
          stats.receivedCount++;
          break;
        case 'sold':
          stats.soldCount++;
          break;
        case 'shipped':
          stats.shippedCount++;
          break;
        case 'returned':
          stats.returnedCount++;
          break;
      }

      // Filter by status if specified
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(status)) {
          continue;
        }
      }

      // Skip items without required data
      if (!row.product || !row.shipment) {
        continue;
      }

      const item: ProductTrackingItem = {
        id: row.shipmentItem.id,
        qrCode: row.shipmentItem.qrCode,
        product: {
          id: row.product.id,
          name: row.product.name,
          brand: row.product.brand,
          model: row.product.model,
          color: row.color?.name ?? null,
          price: row.product.price,
        },
        shipment: {
          id: row.shipment.id,
          receiptNumber: row.shipment.receiptNumber,
          receiptDate: row.shipment.receiptDate,
          supplierName: row.shipment.supplierName,
        },
        status,
        scannedAt: row.shipmentItem.scannedAt,
        createdAt: row.shipmentItem.createdAt,
      };

      if (row.order && row.orderItem) {
        item.order = {
          id: row.order.id,
          orderNumber: row.order.orderNumber,
          orderDate: row.order.createdAt,
          deliveryStatus: row.order.deliveryStatus,
        };
      }

      if (row.customer) {
        item.customer = {
          id: row.customer.id,
          name: row.customer.name,
          phone: row.customer.phone,
          address: row.customer.address,
        };
      }

      if (row.storage) {
        item.storage = {
          id: row.storage.id,
          name: row.storage.name,
          location: row.storage.location,
        };
      }

      processedItems.push(item);
    }

    // Apply pagination to filtered results
    const paginatedItems = processedItems.slice(offset, offset + pageSize);
    const totalPages = Math.ceil(processedItems.length / pageSize);

    return {
      success: true,
      message: 'Product tracking data fetched successfully',
      data: {
        items: paginatedItems,
        stats,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, filters }, 'Không có quyền xem báo cáo');
      return {
        success: false,
        message: error.message,
      };
    }

    logger.error({ error }, 'Error fetching product tracking report:');
    return {
      success: false,
      message: 'Failed to fetch product tracking report',
    };
  }
}

export async function exportProductTrackingReport(
  filters: ProductTrackingFilters = {}
): Promise<ActionResult<{ url: string }>> {
  try {
    // Require authorization for exporting reports
    const session = await requireAuth({ permissions: ['view:reports'] });
    logger.info({ userId: session.user.id, userEmail: session.user.email, filters }, 'Đang xuất báo cáo theo dõi sản phẩm');

    const result = await getProductTrackingReport({ ...filters, pageSize: 10000 });
    
    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message ?? 'Failed to fetch data for export',
      };
    }

    // TODO: Implement Excel export
    // For now, return a placeholder
    return {
      success: true,
      message: 'Export functionality will be implemented',
      data: { url: '' },
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, filters }, 'Không có quyền xuất báo cáo');
      return {
        success: false,
        message: error.message,
      };
    }

    logger.error({ error }, 'Error exporting product tracking report:');
    return {
      success: false,
      message: 'Failed to export product tracking report',
    };
  }
}
