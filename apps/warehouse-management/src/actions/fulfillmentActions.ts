"use server";

import { db } from "~/server/db";
import { orders, orderItems, shipmentItems, customers, products, colors } from "~/server/db/schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import type { ActionResult } from "./types";
import { logger } from "~/lib/logger";
import { requireOrgContext } from "~/lib/authorization";

// ============================================================================
// TYPES
// ============================================================================

export interface PendingFulfillmentCount {
  count: number;
  orders: Array<{
    orderId: string;
    orderNumber: string;
    shopifyOrderNumber: string | null;
  }>;
}

export interface PendingOrderItem {
  orderItemId: string;
  productId: string;
  productName: string;
  brand: string;
  model: string;
  color: string;
  price: number;
  quantity: number;
  fulfillmentStatus: string;
}

export interface PendingOrder {
  orderId: string;
  orderNumber: string;
  shopifyOrderNumber: string | null;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  createdAt: Date;
  items: PendingOrderItem[];
  totalItems: number;
  fulfilledItems: number;
}

export interface OrderFulfillmentDetails extends PendingOrder {
  requiredProducts: Array<{
    productId: string;
    productName: string;
    brand: string;
    model: string;
    color: string;
    quantityNeeded: number;
    quantityFulfilled: number;
  }>;
}

export interface ScanResult {
  success: boolean;
  message: string;
  orderItemId?: string;
  productName?: string;
  remainingItems?: number;
  orderFulfilled?: boolean;
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Get count of pending Shopify orders (lightweight query for badge)
 */
export async function getPendingFulfillmentCountAction(): Promise<ActionResult<PendingFulfillmentCount>> {
  try {
    const { organizationId } = await requireOrgContext();

    const pendingOrders = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        shopifyOrderNumber: orders.shopifyOrderNumber,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, organizationId),
          eq(orders.source, "shopify"),
          eq(orders.fulfillmentStatus, "pending")
        )
      )
      .orderBy(orders.createdAt);

    return {
      success: true,
      message: `Tìm thấy ${pendingOrders.length} đơn hàng chờ xử lý`,
      data: {
        count: pendingOrders.length,
        orders: pendingOrders,
      },
    };
  } catch (error) {
    console.error("Error fetching pending fulfillment count:", error);
    return {
      success: false,
      message: "Lỗi khi lấy số lượng đơn hàng chờ xử lý",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all pending Shopify orders awaiting manual fulfillment
 * Optimized to avoid N+1 queries
 */
export async function getPendingShopifyOrdersAction(): Promise<ActionResult<PendingOrder[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get pending orders
    const pendingOrders = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        shopifyOrderNumber: orders.shopifyOrderNumber,
        customerName: customers.name,
        customerPhone: customers.phone,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orders.organizationId, organizationId),
          eq(orders.source, "shopify"),
          eq(orders.fulfillmentStatus, "pending")
        )
      )
      .orderBy(orders.createdAt);

    if (pendingOrders.length === 0) {
      return {
        success: true,
        message: "Không có đơn hàng chờ xử lý",
        data: [],
      };
    }

    // Fetch all items for all orders in a single query (optimized)
    const orderIds = pendingOrders.map(o => o.orderId);
    const allItems = await db
      .select({
        orderId: orderItems.orderId,
        orderItemId: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        brand: products.brand,
        model: products.model,
        color: colors.name,
        price: orderItems.price,
        quantity: orderItems.quantity,
        fulfillmentStatus: orderItems.fulfillmentStatus,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .where(inArray(orderItems.orderId, orderIds));

    // Group items by order ID
    const itemsByOrderId = new Map<string, typeof allItems>();
    for (const item of allItems) {
      if (!itemsByOrderId.has(item.orderId)) {
        itemsByOrderId.set(item.orderId, []);
      }
      itemsByOrderId.get(item.orderId)!.push(item);
    }

    // Build final result
    const ordersWithItems: PendingOrder[] = pendingOrders.map((order) => {
      const items = itemsByOrderId.get(order.orderId) || [];
      const totalItems = items.length;
      const fulfilledItems = items.filter((item) => item.fulfillmentStatus === "fulfilled").length;

      return {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        shopifyOrderNumber: order.shopifyOrderNumber,
        customerName: order.customerName ?? "Khách hàng",
        customerPhone: order.customerPhone ?? "",
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: items.map((item) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName ?? "",
          brand: item.brand ?? "",
          model: item.model ?? "",
          color: item.color ?? "",
          price: item.price,
          quantity: item.quantity,
          fulfillmentStatus: item.fulfillmentStatus ?? "pending",
        })),
        totalItems,
        fulfilledItems,
      };
    });

    return {
      success: true,
      message: `Tìm thấy ${ordersWithItems.length} đơn hàng chờ xử lý`,
      data: ordersWithItems,
    };
  } catch (error) {
    logger.error({ error }, "Error fetching pending fulfillment orders");
    return {
      success: false,
      message: "Lỗi khi lấy danh sách đơn hàng chờ xử lý",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get detailed fulfillment info for a specific order
 */
export async function getOrderFulfillmentDetailsAction(
  orderId: string
): Promise<ActionResult<OrderFulfillmentDetails>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get order info (must be in same org)
    const orderInfo = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        shopifyOrderNumber: orders.shopifyOrderNumber,
        customerName: customers.name,
        customerPhone: customers.phone,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId)
      ))
      .limit(1);

    if (orderInfo.length === 0) {
      return {
        success: false,
        message: "Không tìm thấy đơn hàng",
      };
    }

    const order = orderInfo[0]!;

    // Get all order items
    const items = await db
      .select({
        orderItemId: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        brand: products.brand,
        model: products.model,
        color: colors.name,
        price: orderItems.price,
        quantity: orderItems.quantity,
        fulfillmentStatus: orderItems.fulfillmentStatus,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .where(eq(orderItems.orderId, orderId));

    // Group by product to show required quantities
    const productMap = new Map<string, {
      productName: string;
      brand: string;
      model: string;
      color: string;
      quantityNeeded: number;
      quantityFulfilled: number;
    }>();

    for (const item of items) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.quantityNeeded += item.quantity;
        if (item.fulfillmentStatus === "fulfilled") {
          existing.quantityFulfilled += item.quantity;
        }
      } else {
        productMap.set(item.productId, {
          productName: item.productName ?? "",
          brand: item.brand ?? "",
          model: item.model ?? "",
          color: item.color ?? "",
          quantityNeeded: item.quantity,
          quantityFulfilled: item.fulfillmentStatus === "fulfilled" ? item.quantity : 0,
        });
      }
    }

    const requiredProducts = Array.from(productMap.entries()).map(([productId, info]) => ({
      productId,
      ...info,
    }));

    const totalItems = items.length;
    const fulfilledItems = items.filter((item) => item.fulfillmentStatus === "fulfilled").length;

    return {
      success: true,
      message: "Lấy thông tin đơn hàng thành công",
      data: {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        shopifyOrderNumber: order.shopifyOrderNumber,
        customerName: order.customerName ?? "Khách hàng",
        customerPhone: order.customerPhone ?? "",
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: items.map((item) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName ?? "",
          brand: item.brand ?? "",
          model: item.model ?? "",
          color: item.color ?? "",
          price: item.price,
          quantity: item.quantity,
          fulfillmentStatus: item.fulfillmentStatus ?? "pending",
        })),
        totalItems,
        fulfilledItems,
        requiredProducts,
      },
    };
  } catch (error) {
    logger.error({ error }, "Error fetching order fulfillment details");
    return {
      success: false,
      message: "Lỗi khi lấy thông tin đơn hàng",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Scan QR code to fulfill an order item
 * Validates that scanned item matches required product
 */
export async function scanAndFulfillItemAction(
  orderId: string,
  qrCode: string
): Promise<ActionResult<ScanResult>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Extract product code from QR if it's a URL
    let productCode = qrCode;
    if (qrCode.includes("/p/")) {
      const parts = qrCode.split("/p/");
      productCode = parts[parts.length - 1] ?? qrCode;
    }

    // Find the shipment item by QR code (must be in same org)
    const scannedItem = await db
      .select({
        shipmentItemId: shipmentItems.id,
        productId: shipmentItems.productId,
        status: shipmentItems.status,
        qrCode: shipmentItems.qrCode,
        productName: products.name,
      })
      .from(shipmentItems)
      .leftJoin(products, eq(shipmentItems.productId, products.id))
      .where(and(
        eq(shipmentItems.qrCode, productCode),
        eq(shipmentItems.organizationId, organizationId)
      ))
      .limit(1);

    if (scannedItem.length === 0) {
      return {
        success: false,
        message: "Không tìm thấy sản phẩm với mã QR này",
        data: {
          success: false,
          message: "Không tìm thấy sản phẩm với mã QR này",
        },
      };
    }

    const item = scannedItem[0]!;

    // Check item status - must be 'received'
    if (item.status !== "received") {
      return {
        success: false,
        message: `Sản phẩm không khả dụng (Trạng thái: ${item.status})`,
        data: {
          success: false,
          message: `Sản phẩm không khả dụng (Trạng thái: ${item.status})`,
        },
      };
    }

    // Find pending order item matching this product (must be in same org)
    const pendingOrderItem = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        fulfillmentStatus: orderItems.fulfillmentStatus,
      })
      .from(orderItems)
      .where(
        and(
          eq(orderItems.organizationId, organizationId),
          eq(orderItems.orderId, orderId),
          eq(orderItems.productId, item.productId),
          eq(orderItems.fulfillmentStatus, "pending"),
          isNull(orderItems.shipmentItemId)
        )
      )
      .limit(1);

    if (pendingOrderItem.length === 0) {
      return {
        success: false,
        message: "Đơn hàng này không cần sản phẩm này hoặc đã được hoàn thành",
        data: {
          success: false,
          message: "Đơn hàng này không cần sản phẩm này hoặc đã được hoàn thành",
        },
      };
    }

    const orderItem = pendingOrderItem[0]!;

    // Update order item with scanned shipment item
    await db.transaction(async (tx) => {
      // Update order_items
      await tx
        .update(orderItems)
        .set({
          shipmentItemId: item.shipmentItemId,
          qrCode: item.qrCode,
          fulfillmentStatus: "fulfilled",
          scannedAt: new Date(),
        })
        .where(eq(orderItems.id, orderItem.id));

      // Mark shipment item as sold
      await tx
        .update(shipmentItems)
        .set({
          status: "sold",
          scannedAt: new Date(),
        })
        .where(eq(shipmentItems.id, item.shipmentItemId));
    });

    // Check if all items are fulfilled
    const remainingItems = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(
        and(
          eq(orderItems.organizationId, organizationId),
          eq(orderItems.orderId, orderId),
          eq(orderItems.fulfillmentStatus, "pending")
        )
      );

    const orderFulfilled = remainingItems.length === 0;

    // Update order fulfillment status if complete
    if (orderFulfilled) {
      await db
        .update(orders)
        .set({
          fulfillmentStatus: "fulfilled",
          updatedAt: new Date(),
        })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.organizationId, organizationId)
        ));
    }

    return {
      success: true,
      message: orderFulfilled
        ? "Đơn hàng đã được hoàn thành!"
        : `Quét thành công! Còn ${remainingItems.length} sản phẩm cần quét.`,
      data: {
        success: true,
        message: orderFulfilled
          ? "Đơn hàng đã được hoàn thành!"
          : `Quét thành công! Còn ${remainingItems.length} sản phẩm cần quét.`,
        orderItemId: orderItem.id,
        productName: item.productName ?? "",
        remainingItems: remainingItems.length,
        orderFulfilled,
      },
    };
  } catch (error) {
    logger.error({ error }, "Error scanning item for order fulfillment");
    return {
      success: false,
      message: "Lỗi khi quét sản phẩm",
      error: error instanceof Error ? error.message : "Unknown error",
      data: {
        success: false,
        message: "Lỗi khi quét sản phẩm",
      },
    };
  }
}
