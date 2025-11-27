/**
 * Utility functions for Shopify order processing
 * These are pure functions without database access
 */

import type { ShippingAddress, LineItem } from "~/lib/schemas/shopifyWebhookSchema";
import type { NeededQuantitiesMap } from "./types";

/**
 * Format shipping address into a single string
 */
export function formatShippingAddress(address: ShippingAddress): string {
  const parts = [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.zip,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXX
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${random}`;
}

/**
 * Calculate needed quantities from line items
 */
export function calculateNeededQuantities(
  lineItems: LineItem[]
): NeededQuantitiesMap {
  return lineItems.reduce((acc, item) => {
    acc.set(item.sku, (acc.get(item.sku) ?? 0) + item.quantity);
    return acc;
  }, new Map<string, number>());
}
