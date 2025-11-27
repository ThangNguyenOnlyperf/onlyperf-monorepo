import { z } from "zod";

/**
 * Whitelisted email domains for guest checkout
 * Limited to major email providers to prevent spam
 */
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "lumines.io",
] as const;

/**
 * Check if an email domain is in the whitelist
 * Case-insensitive comparison
 */
export function isAllowedEmailDomain(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split("@")[1];

  if (!domain) {
    return false;
  }

  return ALLOWED_EMAIL_DOMAINS.includes(
    domain as (typeof ALLOWED_EMAIL_DOMAINS)[number],
  );
}

/**
 * Get formatted list of allowed email providers for display
 */
export function getAllowedEmailProvidersText(): string {
  return "Gmail, Outlook, Yahoo, iCloud";
}

/**
 * Zod schema for guest checkout email
 * Accepts all valid email formats (domain whitelist removed)
 */
export const guestEmailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

/**
 * Zod schema for optional email (authenticated users)
 */
export const optionalEmailSchema = z
  .string()
  .email("Invalid email format")
  .optional();
