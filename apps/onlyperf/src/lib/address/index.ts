/**
 * Address Utilities Module
 *
 * Centralized module for handling address conversions and formatting
 * between Vietnamese address structure and Shopify-compatible format.
 */

export type { ShopifyAddress, VietnameseAddress } from "./utils";
export {
  convertToShopifyAddress,
  formatAddressMultiLine,
  formatAddressOneLine,
  formatCustomerAddressForDisplay,
  formatFullName,
  formatPhoneNumberDisplay,
  formatPhoneNumberE164,
  isCompleteCustomerAddress,
  isValidShopifyAddress,
  isValidVietnameseAddress,
} from "./utils";
