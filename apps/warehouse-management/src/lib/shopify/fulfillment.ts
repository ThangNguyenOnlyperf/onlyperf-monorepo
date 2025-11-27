/**
 * Shopify Fulfillment API Integration
 *
 * Handles syncing fulfillment status to Shopify to trigger customer email notifications:
 * - "Your order is on the way" - When fulfillment is created
 * - "Your order has been delivered" - When fulfillment is marked as delivered
 */

import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { deliveries } from "~/server/db/schema";
import { logger } from "~/lib/logger";

import { shopifyGraphqlRequest, ShopifyApiError } from "./client";
import { SHOPIFY_ENABLED } from "./config";
import type {
  ShopifyFulfillmentResult,
  ShopifyDeliveryEventResult,
  GetFulfillmentOrdersResponse,
  FulfillmentCreateResponse,
  FulfillmentEventCreateResponse,
} from "./types";

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const GET_FULFILLMENT_ORDERS_QUERY = `
  query GetFulfillmentOrders($orderId: ID!) {
    order(id: $orderId) {
      id
      fulfillmentOrders(first: 10) {
        edges {
          node {
            id
            status
          }
        }
      }
    }
  }
`;

const FULFILLMENT_CREATE_MUTATION = `
  mutation FulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const FULFILLMENT_EVENT_CREATE_MUTATION = `
  mutation FulfillmentEventCreate($fulfillmentEventInput: FulfillmentEventInput!) {
    fulfillmentEventCreate(fulfillmentEventInput: $fulfillmentEventInput) {
      fulfillmentEvent {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get open fulfillment order IDs for a Shopify order
 */
export async function getFulfillmentOrderIds(
  shopifyOrderId: string
): Promise<string[]> {
  const response = await shopifyGraphqlRequest<GetFulfillmentOrdersResponse>({
    query: GET_FULFILLMENT_ORDERS_QUERY,
    variables: { orderId: shopifyOrderId },
  });

  if (!response.order) {
    logger.warn({ shopifyOrderId }, "Shopify order not found");
    return [];
  }

  // Filter for open fulfillment orders (not yet fulfilled)
  const openStatuses = ["OPEN", "IN_PROGRESS", "SCHEDULED"];
  const fulfillmentOrderIds = response.order.fulfillmentOrders.edges
    .filter((edge) => openStatuses.includes(edge.node.status))
    .map((edge) => edge.node.id);

  return fulfillmentOrderIds;
}

/**
 * Create fulfillment in Shopify (triggers "Your order is on the way" email)
 */
export async function createShopifyFulfillment(
  shopifyOrderId: string,
  trackingNumber?: string,
  trackingCompany?: string
): Promise<ShopifyFulfillmentResult> {
  try {
    // Get fulfillment order IDs
    const fulfillmentOrderIds = await getFulfillmentOrderIds(shopifyOrderId);

    if (fulfillmentOrderIds.length === 0) {
      logger.info(
        { shopifyOrderId },
        "No open fulfillment orders found - order may already be fulfilled"
      );
      return {
        success: true,
        error: "No open fulfillment orders found",
      };
    }

    // Build fulfillment input
    const lineItemsByFulfillmentOrder = fulfillmentOrderIds.map((id) => ({
      fulfillmentOrderId: id,
    }));

    interface FulfillmentInput {
      lineItemsByFulfillmentOrder: Array<{ fulfillmentOrderId: string }>;
      notifyCustomer: boolean;
      trackingInfo?: {
        number: string;
        company?: string;
      };
    }

    const fulfillmentInput: FulfillmentInput = {
      lineItemsByFulfillmentOrder,
      notifyCustomer: true,
    };

    // Add tracking info if provided
    if (trackingNumber) {
      fulfillmentInput.trackingInfo = {
        number: trackingNumber,
        ...(trackingCompany && { company: trackingCompany }),
      };
    }

    // Create fulfillment
    const response = await shopifyGraphqlRequest<FulfillmentCreateResponse>({
      query: FULFILLMENT_CREATE_MUTATION,
      variables: { fulfillment: fulfillmentInput },
    });

    if (response.fulfillmentCreate.userErrors.length > 0) {
      const errors = response.fulfillmentCreate.userErrors
        .map((e) => e.message)
        .join("; ");
      logger.error(
        { shopifyOrderId, errors },
        "Shopify fulfillment creation failed with user errors"
      );
      return {
        success: false,
        error: errors,
      };
    }

    const fulfillment = response.fulfillmentCreate.fulfillment;
    if (!fulfillment) {
      return {
        success: false,
        error: "No fulfillment returned from Shopify",
      };
    }

    logger.info(
      { shopifyOrderId, fulfillmentId: fulfillment.id, status: fulfillment.status },
      "Shopify fulfillment created successfully - customer will receive shipping notification"
    );

    return {
      success: true,
      fulfillmentId: fulfillment.id,
    };
  } catch (error) {
    const message = buildErrorMessage(error);
    logger.error(
      { shopifyOrderId, error: message },
      "Failed to create Shopify fulfillment"
    );
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Mark fulfillment as delivered (triggers "Your order has been delivered" email)
 */
export async function markShopifyFulfillmentDelivered(
  shopifyFulfillmentId: string
): Promise<ShopifyDeliveryEventResult> {
  try {
    const response = await shopifyGraphqlRequest<FulfillmentEventCreateResponse>({
      query: FULFILLMENT_EVENT_CREATE_MUTATION,
      variables: {
        fulfillmentEventInput: {
          fulfillmentId: shopifyFulfillmentId,
          status: "DELIVERED",
        },
      },
    });

    if (response.fulfillmentEventCreate.userErrors.length > 0) {
      const errors = response.fulfillmentEventCreate.userErrors
        .map((e) => e.message)
        .join("; ");
      logger.error(
        { shopifyFulfillmentId, errors },
        "Shopify delivery event creation failed with user errors"
      );
      return {
        success: false,
        error: errors,
      };
    }

    const event = response.fulfillmentEventCreate.fulfillmentEvent;
    if (!event) {
      return {
        success: false,
        error: "No fulfillment event returned from Shopify",
      };
    }

    logger.info(
      { shopifyFulfillmentId, eventId: event.id },
      "Shopify fulfillment marked as delivered - customer will receive delivery notification"
    );

    return {
      success: true,
      eventId: event.id,
    };
  } catch (error) {
    const message = buildErrorMessage(error);
    logger.error(
      { shopifyFulfillmentId, error: message },
      "Failed to mark Shopify fulfillment as delivered"
    );
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// Non-Blocking Queue Functions
// ============================================================================

interface FulfillmentSyncParams {
  shopifyOrderId?: string;
  shopifyFulfillmentId?: string;
  trackingNumber?: string;
  trackingCompany?: string;
  deliveryId?: string;
}

/**
 * Queue Shopify fulfillment sync (non-blocking)
 * Ensures warehouse operations are never blocked by Shopify API failures
 */
export function queueShopifyFulfillmentSync(
  action: "create" | "delivered",
  params: FulfillmentSyncParams
): void {
  if (!SHOPIFY_ENABLED) {
    logger.debug({ action }, "Shopify integration disabled, skipping fulfillment sync");
    return;
  }

  // Fire and forget - don't await
  performFulfillmentAction(action, params).catch((error) => {
    logger.error(
      { error, action, params },
      "Shopify fulfillment sync failed (non-blocking)"
    );
  });
}

/**
 * Perform the actual fulfillment action
 */
async function performFulfillmentAction(
  action: "create" | "delivered",
  params: FulfillmentSyncParams
): Promise<void> {
  switch (action) {
    case "create": {
      if (!params.shopifyOrderId) {
        logger.warn({ params }, "Missing shopifyOrderId for fulfillment creation");
        return;
      }

      const result = await createShopifyFulfillment(
        params.shopifyOrderId,
        params.trackingNumber,
        params.trackingCompany
      );

      // Store fulfillment ID in delivery record for later use
      if (result.success && result.fulfillmentId && params.deliveryId) {
        try {
          await db
            .update(deliveries)
            .set({ shopifyFulfillmentId: result.fulfillmentId })
            .where(eq(deliveries.id, params.deliveryId));

          logger.info(
            { deliveryId: params.deliveryId, fulfillmentId: result.fulfillmentId },
            "Stored Shopify fulfillment ID in delivery record"
          );
        } catch (dbError) {
          logger.error(
            { dbError, deliveryId: params.deliveryId },
            "Failed to store Shopify fulfillment ID"
          );
        }
      }
      break;
    }

    case "delivered": {
      if (!params.shopifyFulfillmentId) {
        logger.warn(
          { params },
          "Missing shopifyFulfillmentId for delivery confirmation"
        );
        return;
      }

      await markShopifyFulfillmentDelivered(params.shopifyFulfillmentId);
      break;
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function buildErrorMessage(error: unknown): string {
  if (error instanceof ShopifyApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error during Shopify fulfillment sync";
}
