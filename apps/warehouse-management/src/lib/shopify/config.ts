import { env } from "~/env";

export const SHOPIFY_ENABLED_SERVER = env.NEXT_PUBLIC_SHOPIFY_ENABLED === "true";

export const SHOPIFY_ENABLED_PUBLIC = env.NEXT_PUBLIC_SHOPIFY_ENABLED === "true";

export const SHOPIFY_ENABLED = SHOPIFY_ENABLED_PUBLIC;

export function shopifyIntegrationDisabledMessage(): string {
  return "Tích hợp Shopify đang tắt";
}
