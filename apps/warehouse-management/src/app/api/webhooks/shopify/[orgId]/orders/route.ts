import { NextResponse } from "next/server";
import { verifyWebhookRequest } from "~/lib/security/hmac";
import { OrderPaidEventSchema } from "~/lib/schemas/shopifyWebhookSchema";
import { processShopifyOrderAction } from "~/actions/shopify/orderWebhookActions";
import { getOrgShopifyConfig } from "~/lib/shopify/org-client";
import { z } from "zod";
import { logger } from "~/lib/logger";

/**
 * Per-Organization Shopify Order Webhook Handler
 * Receives order.paid events from Shopify when customers pay via Sepay
 *
 * Route: /api/webhooks/shopify/[orgId]/orders
 *
 * Security: HMAC signature verification using org-specific webhook secret
 * Flow: Get org config → Verify → Validate → Process via server action
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  // Step 1: Get organization-specific Shopify configuration
  const orgConfig = await getOrgShopifyConfig(orgId);

  if (!orgConfig) {
    logger.warn({ organizationId: orgId }, "Shopify webhook rejected: Organization not found or Shopify not configured");
    return NextResponse.json(
      { error: "Organization not found or Shopify not configured" },
      { status: 404 }
    );
  }

  if (!orgConfig.webhookSecret) {
    logger.error({ organizationId: orgId }, "Shopify webhook rejected: Webhook secret not configured for organization");
    return NextResponse.json(
      { error: "Webhook secret not configured for this organization" },
      { status: 500 }
    );
  }

  // Step 2: Verify HMAC signature using org-specific secret
  const verification = await verifyWebhookRequest(request, orgConfig.webhookSecret);

  if (!verification.valid) {
    logger.warn({ organizationId: orgId, error: verification.error }, "Shopify webhook verification failed: Invalid HMAC signature");
    return NextResponse.json(
      { error: "Unauthorized", details: verification.error },
      { status: 401 }
    );
  }

  // Step 3: Parse and validate payload with Zod
  try {
    const rawPayload = JSON.parse(verification.body!) as unknown;
    const payload = OrderPaidEventSchema.parse(rawPayload);

    // Step 4: Process order via server action with organization context
    const result = await processShopifyOrderAction(payload, orgId);

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
    logger.info({
      organizationId: orgId,
      warehouseOrderId: result.data.orderId,
      warehouseOrderNumber: result.data.orderNumber,
      shopifyOrderId: result.data.shopifyOrderId,
      shopifyOrderNumber: result.data.shopifyOrderNumber,
    }, `Shopify webhook processed successfully for org ${orgId}`);

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
      logger.error({ organizationId: orgId, validationErrors: error.errors }, "Shopify webhook payload validation failed");
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
      logger.error({ organizationId: orgId, error }, "Failed to parse Shopify webhook payload: Invalid JSON");
      return NextResponse.json(
        { error: "Invalid JSON payload", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    logger.error({ organizationId: orgId, error }, "Unexpected error processing Shopify webhook");
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
