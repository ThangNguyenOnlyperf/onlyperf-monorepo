'use server';

import { db } from '~/server/db';
import { orders, orderItems, customers, products, shipmentItems, providers, user, colors } from '~/server/db/schema';
import { eq, desc, sql, and, gte, lte, or, ilike } from 'drizzle-orm';
import { generateOrderExcel } from '~/lib/excel-export/orderExport';
import type { CartItem, CustomerInfo } from '~/components/outbound/types';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  source: string; // 'in-store', 'shopify', or 'manual'
  shopifyOrderId: string | null;
  shopifyOrderNumber: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  };
  provider?: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  } | null;
  customerType: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryStatus: string;
  voucherCode: string | null;
  notes: string | null;
  processedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItemDetail[];
  itemCount?: number;
}

export interface OrderItemDetail {
  id: string;
  shipmentItemId: string | null; // Nullable for unfulfilled Shopify orders
  productId: string;
  productName: string;
  brand: string;
  model: string;
  color?: string | null;
  qrCode: string | null; // Nullable for unfulfilled Shopify orders
  quantity: number;
  price: number;
}

// Get order by ID with all details
export async function getOrderById(orderId: string): Promise<ActionResult<OrderDetail>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get order with customer, provider, and processed by user (must be in same org)
    const orderData = await db
      .select({
        order: orders,
        customer: customers,
        provider: providers,
        processedBy: user,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(providers, eq(orders.providerId, providers.id))
      .leftJoin(user, eq(orders.processedBy, user.id))
      .where(and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId)
      ))
      .limit(1);

    if (orderData.length === 0 || !orderData[0]) {
      return {
        success: false,
        message: 'Không tìm thấy đơn hàng',
      };
    }

    const { order, customer, provider, processedBy } = orderData[0];

    if (!customer) {
      return {
        success: false,
        message: 'Không tìm thấy thông tin khách hàng',
      };
    }

    // Get order items with product details (filter by org)
    const items = await db
      .select()
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(shipmentItems, eq(orderItems.shipmentItemId, shipmentItems.id))
      .leftJoin(colors, eq(colors.id, products.colorId))
      .where(and(
        eq(orderItems.orderId, orderId),
        eq(orderItems.organizationId, organizationId)
      ));

    const orderItemDetails: OrderItemDetail[] = items.map(item => ({
      id: item.order_items.id,
      shipmentItemId: item.order_items.shipmentItemId,
      productId: item.order_items.productId,
      productName: item.products?.name ?? 'Unknown Product',
      brand: item.products?.brand ?? '',
      model: item.products?.model ?? '',
      color: item.colors?.name ?? null,
      qrCode: item.order_items.qrCode,
      quantity: item.order_items.quantity,
      price: item.order_items.price,
    }));

    const orderDetail: OrderDetail = {
      id: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      shopifyOrderId: order.shopifyOrderId,
      shopifyOrderNumber: order.shopifyOrderNumber,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      provider: provider ? {
        id: provider.id,
        name: provider.name,
        phone: provider.telephone,
        address: provider.address,
      } : null,
      customerType: order.customerType,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      voucherCode: order.voucherCode,
      notes: order.notes,
      processedBy: processedBy ? {
        id: processedBy.id,
        name: processedBy.name,
        email: processedBy.email,
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: orderItemDetails,
    };

    return {
      success: true,
      message: 'Đã tải thông tin đơn hàng',
      data: orderDetail,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching order');
    return {
      success: false,
      message: 'Lỗi khi tải thông tin đơn hàng',
    };
  }
}

// Generate Excel for existing order
export async function generateOrderExcelById(orderId: string): Promise<ActionResult<{ excelData: string; fileName: string }>> {
  try {
    const orderResult = await getOrderById(orderId);
    
    if (!orderResult.success || !orderResult.data) {
      return {
        success: false,
        message: orderResult.message,
      };
    }

    const order = orderResult.data;

    // Ensure items are loaded (getOrderById always populates items)
    if (!order.items) {
      return {
        success: false,
        message: 'Không tìm thấy thông tin sản phẩm',
      };
    }

    // Convert to format expected by Excel generator
    // Only include fulfilled items (those with shipmentItemId)
    const cartItems: CartItem[] = order.items
      .filter(item => item.shipmentItemId !== null && item.qrCode !== null)
      .map(item => ({
        id: item.shipmentItemId!,
        productId: item.productId,
        productName: item.productName,
        brand: item.brand,
        model: item.model,
        qrCode: item.qrCode!,
        price: item.price,
        shipmentItemId: item.shipmentItemId!,
      }));

    const customerInfo: CustomerInfo = {
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address ?? '',
      paymentMethod: order.paymentMethod as 'cash' | 'bank_transfer',
      voucherCode: order.voucherCode ?? '',
      customerType: order.customerType as 'b2b' | 'b2c',
      providerId: order.provider?.id,
    };

    const { buffer, fileName } = await generateOrderExcel({
      orderNumber: order.orderNumber,
      customerInfo,
      items: cartItems,
      totalAmount: order.totalAmount,
      processedBy: order.processedBy?.name ?? order.processedBy?.email ?? 'Unknown',
      createdAt: order.createdAt,
    });

    // Convert buffer to base64
    const base64Data = buffer.toString('base64');

    return {
      success: true,
      message: 'Đã tạo file Excel',
      data: { 
        excelData: base64Data,
        fileName 
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error generating Excel');
    return {
      success: false,
      message: 'Lỗi khi tạo file Excel',
    };
  }
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  averageOrderValue: number;
  topCustomers: Array<{
    name: string;
    phone: string;
    orderCount: number;
    totalSpent: number;
  }>;
}

// Get order statistics
export async function getOrderStats(): Promise<ActionResult<OrderStats>> {
  try {
    const { organizationId } = await requireOrgContext();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total orders and revenue for this org
    const totalStats = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`COALESCE(sum(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(eq(orders.organizationId, organizationId));

    // Get today's orders and revenue for this org
    const todayStats = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`COALESCE(sum(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(and(
        eq(orders.organizationId, organizationId),
        gte(orders.createdAt, today)
      ));

    // Get top customers for this org
    const topCustomersData = await db
      .select({
        customerId: orders.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        orderCount: sql<number>`count(*)::int`,
        totalSpent: sql<number>`sum(${orders.totalAmount})::int`,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.organizationId, organizationId))
      .groupBy(orders.customerId, customers.name, customers.phone)
      .orderBy(desc(sql`sum(${orders.totalAmount})`))
      .limit(5);
    
    const stats: OrderStats = {
      totalOrders: totalStats[0]?.count ?? 0,
      totalRevenue: totalStats[0]?.totalRevenue ?? 0,
      todayOrders: todayStats[0]?.count ?? 0,
      todayRevenue: todayStats[0]?.totalRevenue ?? 0,
      averageOrderValue: totalStats[0]?.count ? Math.round((totalStats[0]?.totalRevenue ?? 0) / totalStats[0].count) : 0,
      topCustomers: topCustomersData.map(c => ({
        name: c.customerName ?? 'Unknown',
        phone: c.customerPhone ?? '',
        orderCount: c.orderCount,
        totalSpent: c.totalSpent,
      })),
    };
    
    return {
      success: true,
      message: 'Đã tải thống kê',
      data: stats,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching order stats');
    return {
      success: false,
      message: 'Lỗi khi tải thống kê',
    };
  }
}

// Get list of orders with filtering
export async function getOrdersList(
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    customerType?: 'b2b' | 'b2c';
  } = {}
): Promise<ActionResult<{ orders: OrderDetail[]; total: number }>> {
  try {
    const { organizationId } = await requireOrgContext();
    const { limit = 50, offset = 0, search, startDate, endDate, customerType } = options;

    // Build where conditions - always filter by organization
    const conditions: ReturnType<typeof eq>[] = [eq(orders.organizationId, organizationId)];

    if (search) {
      const searchCondition = or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(customers.name, `%${search}%`),
        ilike(customers.phone, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, endOfDay));
    }

    if (customerType) {
      conditions.push(eq(orders.customerType, customerType));
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(DISTINCT ${orders.id})::int` })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(whereClause);

    const total = totalResult[0]?.count ?? 0;

    // Get orders with pagination and item count (optimized - single query with aggregation)
    const ordersData = await db
      .select({
        order: orders,
        customer: customers,
        provider: providers,
        processedBy: user,
        itemCount: sql<number>`COALESCE(count(${orderItems.id}), 0)::int`,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(providers, eq(orders.providerId, providers.id))
      .leftJoin(user, eq(orders.processedBy, user.id))
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(whereClause)
      .groupBy(
        orders.id,
        customers.id,
        providers.id,
        user.id
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const ordersList: OrderDetail[] = ordersData
      .filter(data => data.customer !== null)
      .map(data => ({
        id: data.order.id,
        orderNumber: data.order.orderNumber,
        source: data.order.source,
        shopifyOrderId: data.order.shopifyOrderId,
        shopifyOrderNumber: data.order.shopifyOrderNumber,
        customer: {
          id: data.customer!.id,
          name: data.customer!.name,
          phone: data.customer!.phone,
          address: data.customer!.address,
        },
        provider: data.provider ? {
          id: data.provider.id,
          name: data.provider.name,
          phone: data.provider.telephone,
          address: data.provider.address,
        } : null,
        customerType: data.order.customerType,
        totalAmount: data.order.totalAmount,
        paymentMethod: data.order.paymentMethod,
        paymentStatus: data.order.paymentStatus,
        deliveryStatus: data.order.deliveryStatus,
        voucherCode: data.order.voucherCode,
        notes: data.order.notes,
        processedBy: data.processedBy ? {
          id: data.processedBy.id,
          name: data.processedBy.name,
          email: data.processedBy.email,
        } : null,
        createdAt: data.order.createdAt,
        updatedAt: data.order.updatedAt,
        itemCount: data.itemCount, // Only count, not full items
      }));

    return {
      success: true,
      message: 'Đã tải danh sách đơn hàng',
      data: {
        orders: ordersList,
        total,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching orders list');
    return {
      success: false,
      message: 'Lỗi khi tải danh sách đơn hàng',
    };
  }
}
