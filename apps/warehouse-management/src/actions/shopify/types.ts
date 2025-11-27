/**
 * Shared types for Shopify webhook actions
 */

// Result of processing a Shopify order
export interface OrderProcessingResult {
  orderId: string;
  orderNumber: string;
  itemsFulfilled: number;
  shopifyOrderId: string;
  shopifyOrderNumber: string;
}

// Result of inventory availability check
export interface InventoryCheckResult {
  available: boolean;
  productMap: Map<string, ProductInfo>;
  availableByProduct: Map<string, ShipmentItemInfo[]>;
  insufficientProducts?: string[];
  missingSKUs?: string[];
}

// Product information from database
export interface ProductInfo {
  id: string;
  name: string;
  price: number;
}

// Shipment item information
export interface ShipmentItemInfo {
  id: string;
  productId: string;
  quantity: number;
  qrCode: string;
}

// Inventory allocation for order creation
export interface InventoryAllocation {
  shipmentItemId: string;
  productId: string;
  qrCode: string;
  price: number;
}

// Customer upsert result
export interface CustomerUpsertResult {
  customerId: string;
  isNew: boolean;
}

// Needed quantities map (SKU -> quantity)
export type NeededQuantitiesMap = Map<string, number>;
