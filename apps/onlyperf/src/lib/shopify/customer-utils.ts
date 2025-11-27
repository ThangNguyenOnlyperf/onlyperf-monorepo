import type { StoredAddress } from "@/lib/checkout/session-utils";

/**
 * Normalize a customer ID to Shopify GID format
 * @param customerId - Customer ID (can be numeric or already in GID format)
 * @returns Shopify GID format or undefined if no customer ID provided
 */
export function normalizeCustomerGid(
  customerId?: string | null,
): string | undefined {
  if (!customerId) return undefined;

  return customerId.startsWith("gid://shopify/Customer/")
    ? customerId
    : `gid://shopify/Customer/${customerId}`;
}

/**
 * Build a full name from first and last name
 * @param firstName - Customer's first name
 * @param lastName - Customer's last name
 * @returns Full name as a single string, or null if both names are empty
 */
export function buildFullName(
  firstName?: string | null,
  lastName?: string | null,
): string | null {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Build a full name from a StoredAddress
 * @param address - Address containing firstName and lastName
 * @returns Full name as a single string, or null if both names are empty
 */
export function buildFullNameFromAddress(
  address?: StoredAddress | null,
): string | null {
  if (!address) return null;
  return buildFullName(address.firstName, address.lastName);
}

/**
 * Build customer input for Shopify Admin API order creation
 * @param customerId - Customer ID (can be numeric or already in GID format)
 * @returns Customer input object for Shopify API, or undefined if no customer ID
 */
export function buildCustomerInput(
  customerId?: string | null,
): { toAssociate: { id: string } } | undefined {
  const customerGid = normalizeCustomerGid(customerId);
  return customerGid ? { toAssociate: { id: customerGid } } : undefined;
}
