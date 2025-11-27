"use server";

import { db } from "~/server/db";
import {
  orders,
  orderItems,
  customers,
  products,
  shipmentItems,
} from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { ActionResult } from "../types";
import type {
  OrderPaidEvent,
  LineItem,
  ShippingAddress,
  Customer,
} from "~/lib/schemas/shopifyWebhookSchema";
import type {
  OrderProcessingResult,
  InventoryCheckResult,
  ProductInfo,
  ShipmentItemInfo,
  InventoryAllocation,
  CustomerUpsertResult,
} from "./types";
import {
  formatShippingAddress,
  generateOrderNumber,
  calculateNeededQuantities,
} from "./utils";
import { logger } from "~/lib/logger";

// ============================================================================
// HELPER SERVER ACTIONS
// ============================================================================

/**
 * Validate inventory availability for order fulfillment
 * Checks:
 * 1. All SKUs exist in warehouse
 * 2. Sufficient inventory available (status='received')
 */
export async function validateInventoryAvailabilityAction(
  lineItems: LineItem[]
): Promise<ActionResult<InventoryCheckResult>> {
  try {
    // Step 1: Map SKUs to warehouse products
    const skus = lineItems.map((item) => item.sku);
    const foundProducts = await db.query.products.findMany({
      where: inArray(products.id, skus),
      columns: {
        id: true,
        name: true,
        price: true,
      },
    });

    const productMap = new Map(
      foundProducts.map((p) => [p.id, p as ProductInfo])
    );

    // Check for missing SKUs
    const missingSKUs = skus.filter((sku) => !productMap.has(sku));
    if (missingSKUs.length > 0) {
      return {
        success: false,
        message: `Không tìm thấy sản phẩm trong kho: ${missingSKUs.join(", ")}`,
        data: {
          available: false,
          productMap,
          availableByProduct: new Map(),
          missingSKUs,
        },
      };
    }

    // Step 2: Find available shipment items (status='received')
    const neededQuantities = calculateNeededQuantities(lineItems);

    const availableItems = await db.query.shipmentItems.findMany({
      where: and(
        inArray(shipmentItems.productId, skus),
        eq(shipmentItems.status, "received")
      ),
      columns: {
        id: true,
        productId: true,
        quantity: true,
        qrCode: true,
      },
    });

    // Group by product ID
    const availableByProduct = new Map<string, ShipmentItemInfo[]>();
    for (const item of availableItems) {
      if (!availableByProduct.has(item.productId)) {
        availableByProduct.set(item.productId, []);
      }
      availableByProduct.get(item.productId)!.push(item as ShipmentItemInfo);
    }

    // Step 3: Check if we have enough inventory
    const insufficientProducts: string[] = [];
    for (const [productId, needed] of neededQuantities.entries()) {
      const available = availableByProduct.get(productId) ?? [];
      const totalAvailable = available.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      if (totalAvailable < needed) {
        const product = productMap.get(productId);
        insufficientProducts.push(
          `${product?.name ?? productId} (cần ${needed}, có ${totalAvailable})`
        );
      }
    }

    if (insufficientProducts.length > 0) {
      return {
        success: false,
        message: `Không đủ hàng trong kho: ${insufficientProducts.join(", ")}`,
        data: {
          available: false,
          productMap,
          availableByProduct,
          insufficientProducts,
        },
      };
    }

    // Success: all checks passed
    return {
      success: true,
      message: "Kiểm tra tồn kho thành công",
      data: {
        available: true,
        productMap,
        availableByProduct,
      },
    };
  } catch (error) {
    logger.error({ error, lineItems }, "Error validating inventory for Shopify webhook");
    return {
      success: false,
      message: "Lỗi khi kiểm tra tồn kho",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upsert customer (find existing by phone or create new)
 */
export async function upsertCustomerAction(
  customerData: Customer,
  shippingAddress: ShippingAddress
): Promise<ActionResult<CustomerUpsertResult>> {
  try {
    const customerName =
      customerData.name ??
      shippingAddress.name ??
      customerData.email.split("@")[0] ??
      "Khách hàng";

    const customerPhone =
      customerData.phone ?? shippingAddress.phone ?? "";
    const customerAddress = formatShippingAddress(shippingAddress);

    let customerId: string;
    let isNew = false;

    if (customerPhone) {
      // Try to find existing customer by phone
      const existingCustomer = await db.query.customers.findFirst({
        where: eq(customers.phone, customerPhone),
      });

      if (existingCustomer) {
        // Update existing customer
        await db
          .update(customers)
          .set({
            name: customerName,
            address: customerAddress,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existingCustomer.id));

        customerId = existingCustomer.id;
      } else {
        // Create new customer
        customerId = nanoid();
        isNew = true;
        await db.insert(customers).values({
          id: customerId,
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      // No phone, create new customer with email as identifier
      customerId = nanoid();
      isNew = true;
      await db.insert(customers).values({
        id: customerId,
        name: customerName,
        phone: customerData.email, // Use email as phone placeholder
        address: customerAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      success: true,
      message: isNew ? "Tạo khách hàng mới thành công" : "Cập nhật khách hàng thành công",
      data: { customerId, isNew },
    };
  } catch (error) {
    logger.error({ error, customerEmail: customerData.email, customerPhone: customerData.phone ?? shippingAddress.phone }, "Error upserting customer for Shopify webhook");
    return {
      success: false,
      message: "Lỗi khi xử lý thông tin khách hàng",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create order without allocating specific shipment items
 * Staff will manually scan QR codes during fulfillment to complete the order
 */
export async function allocateInventoryAction(
  payload: OrderPaidEvent,
  customerId: string,
  availableByProduct: Map<string, ShipmentItemInfo[]>
): Promise<ActionResult<OrderProcessingResult>> {
  try {
    const result = await db.transaction(async (tx) => {
      // Generate order number
      const orderNumber = generateOrderNumber();
      const orderId = nanoid();

      // Create order with pending fulfillment status
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        customerId,
        source: "shopify",
        shopifyOrderId: payload.shopifyOrderId,
        shopifyOrderNumber: payload.shopifyOrderNumber,
        customerType: "b2c",
        totalAmount: Math.round(payload.amount), // Ensure integer
        paymentMethod: payload.provider === "cod" ? "cash" : "bank_transfer",
        paymentStatus: payload.provider === "cod" ? "Unpaid" : "Paid",
        paymentCode: payload.paymentCode,
        deliveryStatus: "processing",
        fulfillmentStatus: "pending", // Awaiting manual fulfillment
        notes: `Shopify order ${payload.shopifyOrderNumber}. Payment via ${payload.gateway}. Awaiting manual fulfillment.`,
        processedBy: null, // Automated order
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create order items WITHOUT specific shipment allocation
      // Staff will scan QR codes to fulfill these items
      const orderItemsData = payload.lineItems.flatMap((lineItem) => {
        // Create one order_item per quantity
        return Array.from({ length: lineItem.quantity }, () => ({
          id: nanoid(),
          orderId,
          shipmentItemId: null, // Not allocated yet - staff will scan
          productId: lineItem.sku,
          quantity: 1,
          price: Math.round(lineItem.price),
          qrCode: null, // Will be filled when scanned
          fulfillmentStatus: "pending", // Awaiting scan
          createdAt: new Date(),
        }));
      });

      await tx.insert(orderItems).values(orderItemsData);

      // Do NOT mark any shipment items as allocated
      // They stay as 'received' until staff scans them

      return {
        orderId,
        orderNumber,
        itemsFulfilled: 0, // No items fulfilled yet
        shopifyOrderId: payload.shopifyOrderId,
        shopifyOrderNumber: payload.shopifyOrderNumber,
      };
    });

    const totalItems = payload.lineItems.reduce((sum, item) => sum + item.quantity, 0);
    logger.info({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      shopifyOrderId: payload.shopifyOrderId,
      shopifyOrderNumber: payload.shopifyOrderNumber,
      totalItems,
      customerId,
    }, `Successfully created warehouse order ${result.orderNumber} for Shopify order ${payload.shopifyOrderNumber}, awaiting manual fulfillment: ${totalItems} items`);

    return {
      success: true,
      message: `Tạo đơn hàng ${result.orderNumber} thành công. Đang chờ nhân viên quét QR để hoàn thành.`,
      data: result,
    };
  } catch (error) {
    logger.error({ error, shopifyOrderId: payload.shopifyOrderId, shopifyOrderNumber: payload.shopifyOrderNumber, customerId }, "Error creating order for Shopify webhook");
    return {
      success: false,
      message: "Lỗi khi tạo đơn hàng",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// MAIN ORCHESTRATOR ACTION
// ============================================================================

/**
 * Process Shopify order webhook payload
 * Main entry point that orchestrates the entire order creation flow
 *
 * Flow:
 * 1. Validate inventory availability (SKUs exist, sufficient stock)
 * 2. Upsert customer (find by phone or create new)
 * 3. Allocate inventory and create order (in transaction)
 */
export async function processShopifyOrderAction(
  payload: OrderPaidEvent
): Promise<ActionResult<OrderProcessingResult>> {
  try {
    logger.info({
      shopifyOrderId: payload.shopifyOrderId,
      shopifyOrderNumber: payload.shopifyOrderNumber,
      amount: payload.amount,
      itemCount: payload.lineItems.length,
    }, `Processing Shopify order: ${payload.shopifyOrderNumber} (${payload.shopifyOrderId})`);

    // Step 1: Validate inventory availability
    const inventoryCheck = await validateInventoryAvailabilityAction(
      payload.lineItems
    );

    if (!inventoryCheck.success || !inventoryCheck.data?.available) {
      logger.warn({
        shopifyOrderId: payload.shopifyOrderId,
        shopifyOrderNumber: payload.shopifyOrderNumber,
        reason: inventoryCheck.message,
      }, "Shopify order processing failed: Inventory check failed");
      return {
        success: false,
        message: inventoryCheck.message ?? "Lỗi khi kiểm tra tồn kho",
        error: JSON.stringify(inventoryCheck.data),
      };
    }

    const { availableByProduct } = inventoryCheck.data;

    // Step 2: Upsert customer
    const customerResult = await upsertCustomerAction(
      payload.customer,
      payload.shippingAddress
    );

    if (!customerResult.success || !customerResult.data) {
      logger.error({
        shopifyOrderId: payload.shopifyOrderId,
        shopifyOrderNumber: payload.shopifyOrderNumber,
        error: customerResult.error,
      }, "Shopify order processing failed: Customer upsert failed");
      return {
        success: false,
        message: customerResult.message ?? "Lỗi khi xử lý khách hàng",
        error: customerResult.error,
      };
    }

    const { customerId } = customerResult.data;

    // Step 3: Allocate inventory and create order
    const allocationResult = await allocateInventoryAction(
      payload,
      customerId,
      availableByProduct
    );

    if (!allocationResult.success || !allocationResult.data) {
      logger.error({
        shopifyOrderId: payload.shopifyOrderId,
        shopifyOrderNumber: payload.shopifyOrderNumber,
        customerId,
        error: allocationResult.error,
      }, "Shopify order processing failed: Order allocation failed");
      return {
        success: false,
        message: allocationResult.message ?? "Lỗi khi tạo đơn hàng",
        error: allocationResult.error,
      };
    }

    logger.info({
      shopifyOrderId: payload.shopifyOrderId,
      shopifyOrderNumber: payload.shopifyOrderNumber,
      orderNumber: allocationResult.data.orderNumber,
      customerId,
    }, `Shopify order ${payload.shopifyOrderNumber} processed successfully - warehouse order ${allocationResult.data.orderNumber} created`);

    return {
      success: true,
      message: `Đơn hàng ${allocationResult.data.orderNumber} đã được tạo thành công`,
      data: allocationResult.data,
    };
  } catch (error) {
    logger.error({ error, shopifyOrderId: payload.shopifyOrderId, shopifyOrderNumber: payload.shopifyOrderNumber }, "Unexpected error processing Shopify order");
    return {
      success: false,
      message: "Lỗi khi xử lý đơn hàng Shopify",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
