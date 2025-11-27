"use server";

import { nanoid } from "nanoid";
import { db } from "~/server/db";
import { deliveries, deliveryHistory, deliveryResolutions, orders, orderItems, shipmentItems } from "~/server/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { auth } from "~/lib/auth";
import { headers } from 'next/headers';
import type { ActionResult } from "./types";
import { 
  updateDeliveryStatusSchema, 
  failureResolutionSchema, 
  createDeliverySchema,
  type UpdateDeliveryStatusData,
  type FailureResolutionData,
  type CreateDeliveryData 
} from "~/components/deliveries/deliverySchema";
import type { DeliveryWithOrder, DeliveryStats } from "~/components/deliveries/types";
import { logger } from '~/lib/logger';
import { queueShopifyFulfillmentSync } from '~/lib/shopify/fulfillment';

// Create a delivery record when order is shipped
export async function createDeliveryRecord(data: CreateDeliveryData): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return { success: false, message: "Unauthorized" };
    }

    const parsedData = createDeliverySchema.safeParse(data);
    if (!parsedData.success) {
      return { success: false, message: "Invalid delivery data" };
    }

    const deliveryId = nanoid();
    
    await db.transaction(async (tx) => {
      // Create delivery record
      await tx.insert(deliveries).values({
        id: deliveryId,
        orderId: parsedData.data.orderId,
        shipperName: parsedData.data.shipperName,
        shipperPhone: parsedData.data.shipperPhone || null,
        trackingNumber: parsedData.data.trackingNumber || null,
        status: "waiting_for_delivery",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update order delivery status
      await tx.update(orders)
        .set({ 
          deliveryStatus: "waiting_for_delivery",
          updatedAt: new Date() 
        })
        .where(eq(orders.id, parsedData.data.orderId));

      // Add to history
      await tx.insert(deliveryHistory).values({
        id: nanoid(),
        deliveryId,
        toStatus: "waiting_for_delivery",
        changedBy: session.user.id,
        createdAt: new Date(),
      });
    });

    // Trigger Shopify fulfillment for Shopify orders (sends "on the way" email)
    const [order] = await db
      .select({
        shopifyOrderId: orders.shopifyOrderId,
        source: orders.source,
      })
      .from(orders)
      .where(eq(orders.id, parsedData.data.orderId))
      .limit(1);

    if (order?.source === "shopify" && order?.shopifyOrderId) {
      queueShopifyFulfillmentSync("create", {
        shopifyOrderId: order.shopifyOrderId,
        trackingNumber: parsedData.data.trackingNumber ?? undefined,
        deliveryId: deliveryId,
      });
    }

    return {
      success: true,
      message: "Đã tạo thông tin giao hàng thành công"
    };
  } catch (error) {
    logger.error({ error }, "Error creating delivery record:");
    return { 
      success: false, 
      message: "Không thể tạo thông tin giao hàng" 
    };
  }
}

// Update delivery status (delivered or failed)
export async function updateDeliveryStatus(
  deliveryId: string, 
  data: UpdateDeliveryStatusData
): Promise<ActionResult<DeliveryWithOrder>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    logger.info({ deliveryId,user:session?.user.id, status: data.status }, "Starting updateDeliveryStatus");
    if (!session?.user) {
      logger.warn({ deliveryId }, "Unauthorized access attempt to updateDeliveryStatus");
      return { success: false, message: "Unauthorized" };
    }


    const parsedData = updateDeliveryStatusSchema.safeParse(data);
    if (!parsedData.success) {
      logger.warn({
        deliveryId,
        validationErrors: parsedData.error.errors
      }, "Validation failed for updateDeliveryStatus");
      return { success: false, message: "Dữ liệu không hợp lệ" };
    }

    // Get current delivery
    const [currentDelivery] = await db.select()
      .from(deliveries)
      .where(eq(deliveries.id, deliveryId))
      .limit(1);

    if (!currentDelivery) {
      logger.warn({ deliveryId }, "Delivery not found in updateDeliveryStatus");
      return { success: false, message: "Không tìm thấy thông tin giao hàng" };
    }

    const result = await db.transaction(async (tx) => {
      // Update delivery record
      await tx.update(deliveries)
        .set({
          status: parsedData.data.status,
          deliveredAt: parsedData.data.status === 'delivered' ? new Date() : null,
          failureReason: parsedData.data.failureReason || null,
          failureCategory: parsedData.data.failureCategory || null,
          notes: parsedData.data.notes || null,
          confirmedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, deliveryId));

      // Update order delivery status
      await tx.update(orders)
        .set({ 
          deliveryStatus: parsedData.data.status,
          updatedAt: new Date() 
        })
        .where(eq(orders.id, currentDelivery.orderId));

      // If delivered, update shipment items status to 'delivered'
      if (parsedData.data.status === 'delivered') {
        const items = await tx.select({ shipmentItemId: orderItems.shipmentItemId })
          .from(orderItems)
          .where(eq(orderItems.orderId, currentDelivery.orderId));

        const shipmentItemIds = items
          .map(i => i.shipmentItemId)
          .filter((id): id is string => id !== null);

        if (shipmentItemIds.length > 0) {
          logger.info({
            deliveryId,
            shipmentItemCount: shipmentItemIds.length
          }, "Updating shipment items to delivered status");

          await tx.update(shipmentItems)
            .set({ status: 'delivered' })
            .where(inArray(shipmentItems.id, shipmentItemIds));
        }
      }

      // Add to history
      await tx.insert(deliveryHistory).values({
        id: nanoid(),
        deliveryId,
        fromStatus: currentDelivery.status,
        toStatus: parsedData.data.status,
        notes: parsedData.data.notes || null,
        changedBy: session.user.id,
        createdAt: new Date(),
      });

      logger.info({
        deliveryId,
        fromStatus: currentDelivery.status,
        toStatus: parsedData.data.status
      }, "Delivery history record created");

      // Get updated delivery with order details
      const updatedDelivery = await getDeliveryWithOrder(tx, deliveryId);
      return updatedDelivery;
    });

    if (!result) {
      logger.error({ deliveryId }, "Transaction completed but result is null");
      return { success: false, message: "Không thể cập nhật trạng thái giao hàng" };
    }

    logger.info({
      deliveryId,
      newStatus: parsedData.data.status,
      orderId: currentDelivery.orderId
    }, "Successfully updated delivery status");

    // Trigger Shopify delivered notification for Shopify orders
    if (parsedData.data.status === "delivered") {
      const [deliveryWithOrder] = await db
        .select({
          shopifyFulfillmentId: deliveries.shopifyFulfillmentId,
          source: orders.source,
        })
        .from(deliveries)
        .innerJoin(orders, eq(deliveries.orderId, orders.id))
        .where(eq(deliveries.id, deliveryId))
        .limit(1);

      if (
        deliveryWithOrder?.source === "shopify" &&
        deliveryWithOrder?.shopifyFulfillmentId
      ) {
        queueShopifyFulfillmentSync("delivered", {
          shopifyFulfillmentId: deliveryWithOrder.shopifyFulfillmentId,
        });
      }
    }

    return {
      success: true,
      message: parsedData.data.status === 'delivered'
        ? "Đã xác nhận giao hàng thành công"
        : "Đã cập nhật giao hàng thất bại",
      data: result
    };
  } catch (error) {
    logger.error({
      error,
      deliveryId,
      status: data.status
    }, "Error updating delivery status:");
    return { 
      success: false, 
      message: "Lỗi khi cập nhật trạng thái giao hàng" 
    };
  }
}

// Create resolution for failed delivery
export async function createFailureResolution(
  deliveryId: string,
  data: FailureResolutionData
): Promise<ActionResult<DeliveryWithOrder>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return { success: false, message: "Unauthorized" };
    }

    const parsedData = failureResolutionSchema.safeParse(data);
    if (!parsedData.success) {
      return { success: false, message: "Dữ liệu không hợp lệ" };
    }

    const result = await db.transaction(async (tx) => {
      // Create resolution record
      await tx.insert(deliveryResolutions).values({
        id: nanoid(),
        deliveryId,
        resolutionType: parsedData.data.resolutionType,
        resolutionStatus: "pending",
        targetStorageId: parsedData.data.targetStorageId || null,
        supplierReturnReason: parsedData.data.supplierReturnReason || null,
        scheduledDate: parsedData.data.scheduledDate || null,
        processedBy: session.user.id,
        notes: parsedData.data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add to history
      const resolutionTypeLabel = parsedData.data.resolutionType === 're_import' 
        ? 'Nhập lại kho' 
        : parsedData.data.resolutionType === 'return_to_supplier' 
        ? 'Trả về nhà cung cấp' 
        : 'Giao lại';
      
      await tx.insert(deliveryHistory).values({
        id: nanoid(),
        deliveryId,
        toStatus: `resolution_${parsedData.data.resolutionType}`,
        notes: `Tạo quy trình xử lý giao thất bại: ${resolutionTypeLabel}`,
        changedBy: session.user.id,
        createdAt: new Date(),
      });

      // Get updated delivery
      const updatedDelivery = await getDeliveryWithOrder(tx, deliveryId);
      return updatedDelivery;
    });

    if (!result) {
      return { success: false, message: "Không thể tạo quy trình xử lý" };
    }

    return { 
      success: true, 
      message: "Đã tạo quy trình xử lý thành công",
      data: result
    };
  } catch (error) {
    logger.error({ error }, "Error creating failure resolution:");
    return { 
      success: false, 
      message: "Lỗi khi tạo quy trình xử lý" 
    };
  }
}

// Process resolution (re-import to storage, return to supplier, etc.)
export async function processResolution(
  resolutionId: string,
  status: 'in_progress' | 'completed'
): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return { success: false, message: "Unauthorized" };
    }

    const [resolution] = await db.select()
      .from(deliveryResolutions)
      .where(eq(deliveryResolutions.id, resolutionId))
      .limit(1);

    if (!resolution) {
      return { success: false, message: "Không tìm thấy quy trình xử lý" };
    }

    await db.transaction(async (tx) => {
      // Update resolution status
      await tx.update(deliveryResolutions)
        .set({
          resolutionStatus: status,
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(deliveryResolutions.id, resolutionId));

      // Handle completion based on resolution type
      if (status === 'completed') {
        if (resolution.resolutionType === 're_import') {
          // Get delivery and order info
          const [delivery] = await tx.select()
            .from(deliveries)
            .where(eq(deliveries.id, resolution.deliveryId))
            .limit(1);

          if (delivery) {
            // Get order items
            const items = await tx.select()
              .from(orderItems)
              .where(eq(orderItems.orderId, delivery.orderId));

            const shipmentItemIds = items
              .map(i => i.shipmentItemId)
              .filter((id): id is string => id !== null);

            // Update shipment items back to 'received' status
            if (shipmentItemIds.length > 0) {
              await tx.update(shipmentItems)
                .set({
                  status: 'received',
                  storageId: resolution.targetStorageId ?? undefined
                })
                .where(inArray(shipmentItems.id, shipmentItemIds));
            }
          }
        } else if (resolution.resolutionType === 'retry_delivery') {
          // Reset delivery status back to waiting_for_delivery
          await tx.update(deliveries)
            .set({
              status: 'waiting_for_delivery',
              failureReason: null,
              failureCategory: null,
              deliveredAt: null,
              updatedAt: new Date(),
            })
            .where(eq(deliveries.id, resolution.deliveryId));

          // Add history entry for status change
          await tx.insert(deliveryHistory).values({
            id: nanoid(),
            deliveryId: resolution.deliveryId,
            fromStatus: 'failed',
            toStatus: 'waiting_for_delivery',
            notes: 'Đơn hàng được giao lại sau khi xử lý thất bại',
            changedBy: session.user.id,
            createdAt: new Date(),
          });
        }
      }

      // Add resolution status change to history
      const resolutionStatusNote = status === 'completed' 
        ? `Hoàn thành quy trình xử lý: ${resolution.resolutionType === 're_import' ? 'Nhập lại kho' : resolution.resolutionType === 'return_to_supplier' ? 'Trả về nhà cung cấp' : 'Giao lại'}`
        : `Bắt đầu quy trình xử lý: ${resolution.resolutionType === 're_import' ? 'Nhập lại kho' : resolution.resolutionType === 'return_to_supplier' ? 'Trả về nhà cung cấp' : 'Giao lại'}`;
      
      await tx.insert(deliveryHistory).values({
        id: nanoid(),
        deliveryId: resolution.deliveryId,
        toStatus: `resolution_${status}`,
        notes: resolutionStatusNote,
        changedBy: session.user.id,
        createdAt: new Date(),
      });
    });

    return { 
      success: true, 
      message: status === 'completed' 
        ? "Đã hoàn thành quy trình xử lý" 
        : "Đã bắt đầu quy trình xử lý"
    };
  } catch (error) {
    logger.error({ error }, "Error processing resolution:");
    return { 
      success: false, 
      message: "Lỗi khi xử lý quy trình" 
    };
  }
}

// Get delivery history
export async function getDeliveryHistory(deliveryId: string): Promise<ActionResult<any[]>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, message: "Unauthorized" };
    }

    const history = await db.select({
      id: deliveryHistory.id,
      fromStatus: deliveryHistory.fromStatus,
      toStatus: deliveryHistory.toStatus,
      notes: deliveryHistory.notes,
      changedBy: deliveryHistory.changedBy,
      changedByName: sql<string>`COALESCE((SELECT name FROM "user" WHERE id = ${deliveryHistory.changedBy}), 'System')`,
      createdAt: deliveryHistory.createdAt,
    })
    .from(deliveryHistory)
    .where(eq(deliveryHistory.deliveryId, deliveryId))
    .orderBy(desc(deliveryHistory.createdAt));

    return { 
      success: true, 
      data: history,
      message: "Success" 
    };
  } catch (error) {
    logger.error({ error }, "Error fetching delivery history:");
    return { 
      success: false, 
      message: "Không thể lấy lịch sử giao hàng" 
    };
  }
}

// Get delivery statistics
export async function getDeliveryStats(): Promise<ActionResult<DeliveryStats>> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [stats] = await db.select({
      total: sql<number>`count(*)::int`,
      todayCount: sql<number>`count(case when ${deliveries.createdAt} >= ${todayISO} then 1 end)::int`,
      delivered: sql<number>`count(case when ${deliveries.status} = 'delivered' then 1 end)::int`,
      failed: sql<number>`count(case when ${deliveries.status} = 'failed' then 1 end)::int`,
      waiting: sql<number>`count(case when ${deliveries.status} = 'waiting_for_delivery' then 1 end)::int`,
      cancelled: sql<number>`count(case when ${deliveries.status} = 'cancelled' then 1 end)::int`,
    })
    .from(deliveries);

    // Get resolution stats
    const [resolutionStats] = await db.select({
      pending: sql<number>`count(case when ${deliveryResolutions.resolutionStatus} = 'pending' then 1 end)::int`,
      inProgress: sql<number>`count(case when ${deliveryResolutions.resolutionStatus} = 'in_progress' then 1 end)::int`,
      completed: sql<number>`count(case when ${deliveryResolutions.resolutionStatus} = 'completed' then 1 end)::int`,
      reImporting: sql<number>`count(case when ${deliveryResolutions.resolutionType} = 're_import' and ${deliveryResolutions.resolutionStatus} != 'completed' then 1 end)::int`,
      returning: sql<number>`count(case when ${deliveryResolutions.resolutionType} = 'return_to_supplier' and ${deliveryResolutions.resolutionStatus} != 'completed' then 1 end)::int`,
      retrying: sql<number>`count(case when ${deliveryResolutions.resolutionType} = 'retry_delivery' and ${deliveryResolutions.resolutionStatus} != 'completed' then 1 end)::int`,
    })
    .from(deliveryResolutions);

    // Get value stats
    const valueStats = await db.select({
      status: deliveries.status,
      totalValue: sql<number>`sum(${orders.totalAmount})::int`,
    })
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .groupBy(deliveries.status);

    const deliveredValue = valueStats.find(v => v.status === 'delivered')?.totalValue || 0;
    const failedValue = valueStats.find(v => v.status === 'failed')?.totalValue || 0;

    const result: DeliveryStats = {
      totalDeliveries: stats?.total || 0,
      todayDeliveries: stats?.todayCount || 0,
      deliveredCount: stats?.delivered || 0,
      failedCount: stats?.failed || 0,
      waitingForDeliveryCount: stats?.waiting || 0,
      cancelledCount: stats?.cancelled || 0,
      pendingResolutionCount: resolutionStats?.pending || 0,
      totalDeliveredValue: deliveredValue,
      totalFailedValue: failedValue,
      resolutions: {
        reImportingCount: resolutionStats?.reImporting || 0,
        returningCount: resolutionStats?.returning || 0,
        retryingCount: resolutionStats?.retrying || 0,
        completedCount: resolutionStats?.completed || 0,
      },
    };

    return { success: true, data: result, message: "Success" };
  } catch (error) {
    logger.error({ error }, "Error getting delivery stats:");
    return { 
      success: false, 
      message: "Không thể lấy thống kê giao hàng" 
    };
  }
}

// Helper function to get delivery with order details
async function getDeliveryWithOrder(tx: any, deliveryId: string): Promise<DeliveryWithOrder | null> {
  const result = await tx.select({
    delivery: deliveries,
    order: orders,
    customer: {
      id: sql`${orders.customerId}`,
      name: sql`(SELECT name FROM customers WHERE id = ${orders.customerId})`,
      phone: sql`(SELECT phone FROM customers WHERE id = ${orders.customerId})`,
      address: sql`(SELECT address FROM customers WHERE id = ${orders.customerId})`,
    },
  })
  .from(deliveries)
  .innerJoin(orders, eq(deliveries.orderId, orders.id))
  .where(eq(deliveries.id, deliveryId))
  .limit(1);

  if (!result[0]) return null;

  // Get order items
  const items = await tx.select({
    id: orderItems.id,
    productName: sql`(SELECT name FROM products WHERE id = ${orderItems.productId})`,
    quantity: orderItems.quantity,
    price: orderItems.price,
    qrCode: orderItems.qrCode,
  })
  .from(orderItems)
  .where(eq(orderItems.orderId, result[0].order.id));

  // Get resolution if exists
  const [resolution] = await tx.select()
    .from(deliveryResolutions)
    .where(eq(deliveryResolutions.deliveryId, deliveryId))
    .orderBy(desc(deliveryResolutions.createdAt))
    .limit(1);

  return {
    ...result[0].delivery,
    order: {
      ...result[0].order,
      customer: result[0].customer as any,
      items,
    },
    resolution: resolution || null,
  } as DeliveryWithOrder;
}

// Mark order as shipped and create delivery record
export async function markOrderAsShipped(
  orderId: string, 
  shipperInfo: { 
    shipperName: string; 
    shipperPhone?: string; 
    trackingNumber?: string 
  }
): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if delivery already exists
    const existingDelivery = await db.select()
      .from(deliveries)
      .where(eq(deliveries.orderId, orderId))
      .limit(1);

    if (existingDelivery.length > 0) {
      return { success: false, message: "Thông tin giao hàng đã tồn tại cho đơn này" };
    }

    const deliveryId = nanoid();

    await db.transaction(async (tx) => {
      // Update order status to shipped
      await tx.update(orders)
        .set({
          deliveryStatus: "waiting_for_delivery",
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      // Update shipment items to shipped
      const items = await tx.select({ shipmentItemId: orderItems.shipmentItemId })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      const shipmentItemIds = items
        .map(i => i.shipmentItemId)
        .filter((id): id is string => id !== null);

      if (shipmentItemIds.length > 0) {
        await tx.update(shipmentItems)
          .set({ status: 'shipped' })
          .where(inArray(shipmentItems.id, shipmentItemIds));
      }

      // Create delivery record
      await tx.insert(deliveries).values({
        id: deliveryId,
        orderId,
        shipperName: shipperInfo.shipperName,
        shipperPhone: shipperInfo.shipperPhone || null,
        trackingNumber: shipperInfo.trackingNumber || null,
        status: "waiting_for_delivery",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add to history
      await tx.insert(deliveryHistory).values({
        id: nanoid(),
        deliveryId,
        toStatus: "waiting_for_delivery",
        notes: "Đơn hàng đã được giao cho shipper",
        changedBy: session.user.id,
        createdAt: new Date(),
      });
    });

    // Trigger Shopify fulfillment for Shopify orders (sends "on the way" email)
    const [order] = await db
      .select({
        shopifyOrderId: orders.shopifyOrderId,
        source: orders.source,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order?.source === "shopify" && order?.shopifyOrderId) {
      queueShopifyFulfillmentSync("create", {
        shopifyOrderId: order.shopifyOrderId,
        trackingNumber: shipperInfo.trackingNumber,
        deliveryId: deliveryId,
      });
    }

    return {
      success: true,
      message: "Đã chuyển đơn hàng sang trạng thái giao hàng"
    };
  } catch (error) {
    logger.error({ error }, "Error marking order as shipped:");
    return { 
      success: false, 
      message: "Không thể cập nhật trạng thái giao hàng" 
    };
  }
}

// Get all deliveries with pagination and filters
export async function getDeliveries(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<ActionResult<{ deliveries: DeliveryWithOrder[]; total: number; stats: DeliveryStats }>> {
  try {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Build query conditions
    const conditions = [];
    if (params.status && params.status !== 'all') {
      conditions.push(eq(deliveries.status, params.status));
    }

    // Add search condition using raw SQL to avoid table reference issues
    if (params.search && params.search.trim()) {
      const searchTerm = `%${params.search.trim()}%`;
      conditions.push(
        sql`(
          ${orders.orderNumber} ILIKE ${searchTerm}
          OR ${deliveries.trackingNumber} ILIKE ${searchTerm}
          OR ${deliveries.shipperName} ILIKE ${searchTerm}
          OR EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = ${orders.customerId}
            AND (
              customers.name ILIKE ${searchTerm}
              OR customers.phone ILIKE ${searchTerm}
            )
          )
        )`
      );
    }

    // Get deliveries
    const deliveryList = await db.select({
      delivery: deliveries,
      order: orders,
      customer: {
        id: sql`${orders.customerId}`,
        name: sql`(SELECT name FROM customers WHERE id = ${orders.customerId})`,
        phone: sql`(SELECT phone FROM customers WHERE id = ${orders.customerId})`,
        address: sql`(SELECT address FROM customers WHERE id = ${orders.customerId})`,
      },
    })
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(deliveries.createdAt))
    .limit(pageSize)
    .offset(offset);

    // Get total count - need to join orders table if we're searching
    const countResult = await db.select({
      total: sql<number>`count(*)::int`
    })
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.total || 0;

    if (deliveryList.length === 0) {
      const statsResult = await getDeliveryStats();
      return {
        success: true,
        message: "Success",
        data: {
          deliveries: [],
          total: 0,
          stats: statsResult.data || {} as DeliveryStats,
        },
      };
    }

    const orderIds = deliveryList.map(d => d.order.id);
    const allItems = await db.select({
      orderId: orderItems.orderId,
      id: orderItems.id,
      productName: sql`(SELECT name FROM products WHERE id = ${orderItems.productId})`,
      quantity: orderItems.quantity,
      price: orderItems.price,
      qrCode: orderItems.qrCode,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

    // Group items by order ID
    const itemsByOrderId = new Map<string, typeof allItems>();
    for (const item of allItems) {
      if (!itemsByOrderId.has(item.orderId)) {
        itemsByOrderId.set(item.orderId, []);
      }
      itemsByOrderId.get(item.orderId)!.push(item);
    }

    const deliveryIds = deliveryList.map(d => d.delivery.id);
    const allResolutions = await db.select()
      .from(deliveryResolutions)
      .where(inArray(deliveryResolutions.deliveryId, deliveryIds))
      .orderBy(desc(deliveryResolutions.createdAt));

    // Group resolutions by delivery ID (keep only the latest one per delivery)
    const resolutionByDeliveryId = new Map<string, typeof allResolutions[0]>();
    for (const resolution of allResolutions) {
      if (!resolutionByDeliveryId.has(resolution.deliveryId)) {
        resolutionByDeliveryId.set(resolution.deliveryId, resolution);
      }
    }

    // Build final result
    const deliveriesWithDetails: DeliveryWithOrder[] = deliveryList.map((d) => {
      const items = itemsByOrderId.get(d.order.id) || [];
      const resolution = resolutionByDeliveryId.get(d.delivery.id) || null;

      return {
        ...d.delivery,
        order: {
          ...d.order,
          customer: d.customer as any,
          items,
        },
        resolution,
      } as DeliveryWithOrder;
    });

    // Get stats
    const statsResult = await getDeliveryStats();
    const stats = statsResult.data || {
      totalDeliveries: 0,
      todayDeliveries: 0,
      deliveredCount: 0,
      failedCount: 0,
      waitingForDeliveryCount: 0,
      cancelledCount: 0,
      pendingResolutionCount: 0,
      totalDeliveredValue: 0,
      totalFailedValue: 0,
    };

    return {
      success: true,
      message: "Success",
      data: {
        deliveries: deliveriesWithDetails,
        total,
        stats,
      },
    };
  } catch (error) {
    logger.error({ error }, "Error getting deliveries:");
    return {
      success: false,
      message: "Không thể lấy danh sách giao hàng",
    };
  }
}