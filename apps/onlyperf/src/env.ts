import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SEPAY_API_KEY: z.string().min(1).optional(),
    WAREHOUSE_WEBHOOK_URL: z.string().url().optional(),
    WAREHOUSE_WEBHOOK_SECRET: z.string().min(1).optional(),
    SEPAY_BANK_ACCOUNT: z.string().min(1),
    SEPAY_BANK_NAME: z.string().min(1),
    SEPAY_BANK_BIN: z.string().min(1).optional(),
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: z.string().min(1),
    SHOPIFY_STORE_DOMAIN: z.string().min(1),
    SHOPIFY_API_VERSION: z.string().default("2025-04"),
    SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: z.string().min(1),
    SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET: z.string().min(1),
    SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    SEPAY_API_KEY: process.env.SEPAY_API_KEY,
    WAREHOUSE_WEBHOOK_URL: process.env.WAREHOUSE_WEBHOOK_URL,
    WAREHOUSE_WEBHOOK_SECRET: process.env.WAREHOUSE_WEBHOOK_SECRET,
    SEPAY_BANK_ACCOUNT: process.env.SEPAY_BANK_ACCOUNT,
    SEPAY_BANK_NAME: process.env.SEPAY_BANK_NAME,
    SEPAY_BANK_BIN: process.env.SEPAY_BANK_BIN,
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
    SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID:
      process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
    SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET:
      process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET,
    SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI:
      process.env.SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
