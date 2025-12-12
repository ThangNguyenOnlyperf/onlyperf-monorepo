/**
 * QR Domain Configuration Utilities
 *
 * Provides functions for retrieving and constructing QR code URLs
 * based on per-organization domain settings.
 */

import { db } from "~/server/db";
import { organizationSettings } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Default fallback values
const DEFAULT_DOMAIN = process.env.NEXT_PUBLIC_BASE_URL ?? "https://onlyperf.com";
const DEFAULT_PATH = "/p";

/**
 * QR Domain Configuration for an organization
 */
export interface QRDomainConfig {
  domain: string;
  path: string;
  baseUrl: string; // domain + path combined
}

/**
 * Get QR domain configuration for an organization
 *
 * @param organizationId The organization ID
 * @returns QRDomainConfig with domain, path, and combined baseUrl
 */
export async function getQRDomainConfig(organizationId: string): Promise<QRDomainConfig> {
  const settings = await db.query.organizationSettings.findFirst({
    where: eq(organizationSettings.organizationId, organizationId),
    columns: {
      qrCodeDomain: true,
      qrCodePath: true,
    },
  });

  const domain = settings?.qrCodeDomain || DEFAULT_DOMAIN;
  const path = settings?.qrCodePath || DEFAULT_PATH;

  return {
    domain,
    path,
    baseUrl: `${domain}${path}`,
  };
}

/**
 * Get the base URL for QR codes for an organization
 * This is the URL prefix that will be used when generating QR codes.
 *
 * @param organizationId The organization ID
 * @returns Base URL string (e.g., "https://btsport.com/p")
 */
export async function getQRBaseURL(organizationId: string): Promise<string> {
  const config = await getQRDomainConfig(organizationId);
  return config.baseUrl;
}

/**
 * Construct full QR code URL for a given short code
 *
 * @param shortCode The product short code (e.g., "X7KM9PQ2NR")
 * @param organizationId The organization ID
 * @returns Full URL (e.g., "https://btsport.com/p/X7KM9PQ2NR")
 */
export async function constructQRCodeURL(
  shortCode: string,
  organizationId: string
): Promise<string> {
  const baseUrl = await getQRBaseURL(organizationId);
  return `${baseUrl}/${shortCode}`;
}

/**
 * Get default QR base URL (without org context)
 * Used as fallback when organization context is not available.
 */
export function getDefaultQRBaseURL(): string {
  return `${DEFAULT_DOMAIN}${DEFAULT_PATH}`;
}
