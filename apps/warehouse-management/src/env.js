import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    TYPESENSE_HOST: z.string(),
    TYPESENSE_PORT: z.string(),
    TYPESENSE_PROTOCOL: z.enum(["http", "https"]),
    TYPESENSE_API_KEY: z.string(),
    // Legacy global Shopify config (optional - per-org settings preferred)
    // Still used by fulfillment.ts until migrated to org-client
    SHOPIFY_STORE_DOMAIN: z.string().optional(),
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: z.string().optional(),
    SHOPIFY_API_VERSION: z.string().default("2025-04"),
    SHOPIFY_LOCATION_ID: z.string().optional(),
    // Encryption key for storing sensitive data (API tokens, secrets)
    SECRETS_ENCRYPTION_KEY: z.string().min(32),
    // Server-only toggle if you need it in server code
    SHOPIFY_ENABLED: z
      .enum(["true", "false"]) // explicit string for env handling
      .default("true"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_BASE_URL: z.string().url(),
    NEXT_PUBLIC_SHOPIFY_ENABLED: z
      .enum(["true", "false"])
      .default("true"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    TYPESENSE_HOST: process.env.TYPESENSE_HOST,
    TYPESENSE_PORT: process.env.TYPESENSE_PORT,
    TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL,
    TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION ?? "2025-04",
    SHOPIFY_LOCATION_ID: process.env.SHOPIFY_LOCATION_ID,
    SECRETS_ENCRYPTION_KEY: process.env.SECRETS_ENCRYPTION_KEY,
    SHOPIFY_ENABLED: process.env.SHOPIFY_ENABLED ?? "true",
    NEXT_PUBLIC_SHOPIFY_ENABLED:
      process.env.NEXT_PUBLIC_SHOPIFY_ENABLED ?? process.env.SHOPIFY_ENABLED ?? "true",
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
