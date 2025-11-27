import { z } from "zod";

/**
 * Vietnamese phone number regex
 * Accepts formats:
 * - +84xxxxxxxxx (international)
 * - 0xxxxxxxxx (local with leading zero)
 * Total digits: 9-10 after country code/leading zero
 */
export const VIETNAMESE_PHONE_REGEX = /^(\+84|0)[0-9]{9,10}$/;

/**
 * Validate Vietnamese phone number format
 */
export function isValidVietnamesePhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") {
    return false;
  }

  const cleanPhone = phone.trim().replace(/\s+/g, "");
  return VIETNAMESE_PHONE_REGEX.test(cleanPhone);
}

/**
 * Normalize Vietnamese phone to international format (+84...)
 * Converts: 0912345678 → +84912345678
 */
export function normalizeVietnamesePhone(phone: string): string {
  if (!phone) {
    return phone;
  }

  const cleanPhone = phone.trim().replace(/\s+/g, "");

  // Already in international format
  if (cleanPhone.startsWith("+84")) {
    return cleanPhone;
  }

  // Convert local format to international
  if (cleanPhone.startsWith("0")) {
    return `+84${cleanPhone.slice(1)}`;
  }

  // If doesn't start with +84 or 0, assume local and add +84
  return `+84${cleanPhone}`;
}

/**
 * Zod schema for Vietnamese phone number with validation
 */
export const vietnamesePhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(isValidVietnamesePhone, {
    message:
      "Invalid Vietnamese phone number. Must start with +84 or 0, followed by 9-10 digits.",
  })
  .transform(normalizeVietnamesePhone);

/**
 * Zod schema for optional phone number
 */
export const optionalVietnamesePhoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || isValidVietnamesePhone(val), {
    message:
      "Invalid Vietnamese phone number. Must start with +84 or 0, followed by 9-10 digits.",
  })
  .transform((val) => (val ? normalizeVietnamesePhone(val) : val));
