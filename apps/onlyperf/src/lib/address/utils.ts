import type { CustomerAddress } from "@/lib/shopify/customer-account-api";

/**
 * Vietnamese Address Structure
 * Used for address collection with Province API cascading selects
 */
export interface VietnameseAddress {
  firstName: string;
  lastName: string;
  phone: string;
  provinceCode: number;
  provinceName: string;
  districtCode: number;
  districtName: string;
  wardCode: number;
  wardName: string;
  address1: string; // Street address
  address2?: string | null;
  company?: string | null;
}

/**
 * Shopify-compatible Address Format
 * Used for API calls to Shopify Admin/Customer APIs
 */
export interface ShopifyAddress {
  firstName: string;
  lastName: string;
  phone: string;
  city: string; // Province name
  address1: string; // Full address (district + ward + street)
  address2?: string | null;
  province?: string | null; // Not used for Vietnam
  country: string; // Always "VN"
  zip: string; // Default "700000"
  company?: string | null;
}

/**
 * Convert Vietnamese address structure to Shopify format
 *
 * Mapping:
 * - city = provinceName (e.g., "Hồ Chí Minh")
 * - address1 = districtName + wardName + street (e.g., "Quận 1, Phường Bến Nghé, 80 Điện Biên Phủ")
 * - province = null (not used for Vietnam)
 * - country = "VN"
 * - zip = "700000" (default)
 */
export function convertToShopifyAddress(
  vietnamese: VietnameseAddress,
): ShopifyAddress {
  return {
    firstName: vietnamese.firstName,
    lastName: vietnamese.lastName,
    phone: vietnamese.phone,
    city: vietnamese.provinceName,
    address1: `${vietnamese.districtName}, ${vietnamese.wardName}, ${vietnamese.address1}`,
    address2: vietnamese.address2 || null,
    province: null,
    country: "VN",
    zip: "700000",
    company: vietnamese.company || null,
  };
}

/**
 * Convert Shopify CustomerAddress to display format
 * Extracts key information for UI display
 */
export function formatCustomerAddressForDisplay(address: CustomerAddress): {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  city: string;
  address1: string;
  address2: string | null;
  province: string | null;
  country: string;
  company: string | null;
  zip: string;
} {
  return {
    id: address.id || "",
    firstName: address.firstName || "",
    lastName: address.lastName || "",
    phoneNumber: address.phoneNumber || "",
    city: address.city || "",
    address1: address.address1 || "",
    address2: address.address2 || null,
    province: address.province || null,
    country: address.country || "VN",
    company: address.company || null,
    zip: address.zip || "700000",
  };
}

/**
 * Format address for single-line display
 * Example: "80 Điện Biên Phủ, Quận 1, Hồ Chí Minh"
 */
export function formatAddressOneLine(address: {
  address1?: string | null;
  city?: string | null;
}): string {
  const parts = [address.address1, address.city].filter(Boolean);
  return parts.join(", ");
}

/**
 * Format address for multi-line display
 * Returns array of address lines
 */
export function formatAddressMultiLine(address: {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  zip?: string | null;
}): string[] {
  const lines: string[] = [];

  if (address.address1) lines.push(address.address1);
  if (address.address2) lines.push(address.address2);

  const cityProvinceZip = [address.city, address.province, address.zip]
    .filter(Boolean)
    .join(", ");
  if (cityProvinceZip) lines.push(cityProvinceZip);

  if (address.country) lines.push(address.country);

  return lines;
}

/**
 * Format name from first and last name
 * Example: "Nguyen" + "Thang" => "Nguyen Thang"
 */
export function formatFullName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [lastName, firstName].filter(Boolean).join(" ");
}

/**
 * Validate if address has minimum required fields for Shopify
 */
export function isValidShopifyAddress(
  address: Partial<ShopifyAddress>,
): address is ShopifyAddress {
  return Boolean(
    address.firstName &&
      address.lastName &&
      address.phone &&
      address.city &&
      address.address1 &&
      address.country &&
      address.zip,
  );
}

/**
 * Validate if Vietnamese address has all required fields
 */
export function isValidVietnameseAddress(
  address: Partial<VietnameseAddress>,
): address is VietnameseAddress {
  return Boolean(
    address.firstName &&
      address.lastName &&
      address.phone &&
      address.provinceCode &&
      address.provinceName &&
      address.districtCode &&
      address.districtName &&
      address.wardCode &&
      address.wardName &&
      address.address1,
  );
}

/**
 * Check if CustomerAddress has all fields populated
 */
export function isCompleteCustomerAddress(
  address: CustomerAddress | null | undefined,
): boolean {
  if (!address) return false;
  return Boolean(
    address.id &&
      address.firstName &&
      address.lastName &&
      address.phoneNumber &&
      address.city &&
      address.address1,
  );
}

/**
 * Parse Vietnamese phone number to E.164 format
 * Examples:
 * - "0898271703" => "+84898271703"
 * - "+84898271703" => "+84898271703"
 * - "84898271703" => "+84898271703"
 */
export function formatPhoneNumberE164(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If starts with 0, replace with +84
  if (digits.startsWith("0")) {
    return `+84${digits.slice(1)}`;
  }

  // If starts with 84, add +
  if (digits.startsWith("84")) {
    return `+${digits}`;
  }

  // If already has +, return as is
  if (phone.startsWith("+84")) {
    return phone;
  }

  // Default: assume it's a local number and add +84
  return `+84${digits}`;
}

/**
 * Format phone number for display (remove +84 prefix)
 * Example: "+84898271703" => "0898271703"
 */
export function formatPhoneNumberDisplay(phone: string): string {
  if (phone.startsWith("+84")) {
    return `0${phone.slice(3)}`;
  }
  return phone;
}
