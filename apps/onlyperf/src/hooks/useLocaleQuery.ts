"use client";

import { headers } from "next/headers";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/shopify/locale";
import { extractBuyerIp } from "@/lib/shopify/utils";

/**
 * Hook to get locale and buyer IP for Shopify queries
 */
export function useLocaleQuery() {
  const { locale } = useLocale();

  // Note: buyerIp needs to be extracted on server-side
  // This hook provides the locale, buyerIp should be passed
  // from server components where available
  return { locale };
}

/**
 * Server-side utility to get locale and buyer IP
 */
export async function getServerLocaleQuery() {
  const requestHeaders = await headers();
  const headersRecord: Record<string, string> = {};
  requestHeaders.forEach((value, key) => {
    headersRecord[key] = value;
  });

  return {
    buyerIp: extractBuyerIp(headersRecord),
  };
}
