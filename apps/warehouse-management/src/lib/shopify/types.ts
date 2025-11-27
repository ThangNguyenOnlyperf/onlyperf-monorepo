export interface ShopifyProductSyncResult {
  status: "success" | "skipped";
  shopifyProductId?: string;
  shopifyVariantId?: string;
  shopifyInventoryItemId?: string | null;
  message?: string;
}

export interface ShopifyInventorySyncResult {
  productId: string;
  status: "success" | "skipped" | "error";
  quantity: number;
  message?: string;
  shopifyInventoryItemId?: string | null;
}

export interface ShopifyFullSyncResult {
  product: ShopifyProductSyncResult;
  inventory: ShopifyInventorySyncResult;
}

// ============================================================================
// Fulfillment Types (for customer email notifications)
// ============================================================================

export interface ShopifyFulfillmentResult {
  success: boolean;
  fulfillmentId?: string;
  error?: string;
}

export interface ShopifyDeliveryEventResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export interface FulfillmentOrderNode {
  id: string;
  status: string;
}

export interface GetFulfillmentOrdersResponse {
  order: {
    id: string;
    fulfillmentOrders: {
      edges: Array<{
        node: FulfillmentOrderNode;
      }>;
    };
  } | null;
}

export interface FulfillmentCreateResponse {
  fulfillmentCreate: {
    fulfillment: {
      id: string;
      status: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export interface FulfillmentEventCreateResponse {
  fulfillmentEventCreate: {
    fulfillmentEvent: {
      id: string;
      status: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}
