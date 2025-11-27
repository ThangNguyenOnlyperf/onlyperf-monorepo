import { NextResponse } from "next/server";
import { verifyWebhookRequest } from "~/lib/security/hmac";
import { OrderPaidEventSchema } from "~/lib/schemas/shopifyWebhookSchema";
import { processShopifyOrderAction } from "~/actions/shopify/orderWebhookActions";
import { z } from "zod";
import { logger } from "~/lib/logger";

/**
 * Shopify Order Webhook Handler
 * Receives order.paid events from onlyperf when customers pay via Sepay
 *
 * Security: HMAC signature verification required
 * Flow: Verify → Validate → Process via server action
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("Shopify webhook rejected: SHOPIFY_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Step 1: Verify HMAC signature
  const verification = await verifyWebhookRequest(request, webhookSecret);

  if (!verification.valid) {
    logger.warn({ error: verification.error }, "Shopify webhook verification failed: Invalid HMAC signature");
    return NextResponse.json(
      { error: "Unauthorized", details: verification.error },
      { status: 401 }
    );
  }

  // Step 2: Parse and validate payload with Zod
  try {
    const rawPayload = JSON.parse(verification.body!) as unknown;
    const payload = OrderPaidEventSchema.parse(rawPayload);

    // Step 3: Process order via server action
    const result = await processShopifyOrderAction(payload);

    if (!result.success || !result.data) {
      // Determine error code based on message
      let errorCode = "PROCESSING_ERROR";
      let statusCode = 400;

      if (result.message?.includes("Không tìm thấy sản phẩm")) {
        errorCode = "MISSING_SKU";
      } else if (result.message?.includes("Không đủ hàng")) {
        errorCode = "INSUFFICIENT_INVENTORY";
      } else if (result.message?.includes("khách hàng")) {
        errorCode = "CUSTOMER_ERROR";
        statusCode = 500;
      } else if (result.error) {
        statusCode = 500;
      }

      return NextResponse.json(
        {
          error: result.message ?? "Lỗi khi xử lý đơn hàng",
          code: errorCode,
          details: result.data,
        },
        { status: statusCode }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        warehouseOrderId: result.data.orderId,
        warehouseOrderNumber: result.data.orderNumber,
        shopifyOrderId: result.data.shopifyOrderId,
        shopifyOrderNumber: result.data.shopifyOrderNumber,
        itemsFulfilled: result.data.itemsFulfilled,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      logger.error({ validationErrors: error.errors }, "Shopify webhook payload validation failed");
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      logger.error({ error }, "Failed to parse Shopify webhook payload: Invalid JSON");
      return NextResponse.json(
        { error: "Invalid JSON payload", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    logger.error({ error }, "Unexpected error processing Shopify webhook");
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
