"use server";

import { db } from "~/server/db";
import { organizationSettings } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOrgContext } from "~/lib/authorization";
import { encryptSecret, maskSecret, isEncrypted } from "~/lib/crypto";
import { createOrgShopifyClient, getOrgShopifyConfig } from "~/lib/shopify/org-client";
import { logger } from "~/lib/logger";
import type { ActionResult } from "./types";
import { getDbErrorMessage } from "~/lib/error-handling";

/**
 * Shopify settings form schema
 */
const ShopifySettingsSchema = z.object({
  shopifyEnabled: z.boolean(),
  shopifyStoreDomain: z.string().optional().nullable(),
  shopifyAdminApiAccessToken: z.string().optional().nullable(),
  shopifyApiVersion: z.string().default("2025-04"),
  shopifyLocationId: z.string().optional().nullable(),
  shopifyWebhookSecret: z.string().optional().nullable(),
});

export type ShopifySettingsFormData = z.infer<typeof ShopifySettingsSchema>;

/**
 * Response type for get settings (with masked secrets)
 */
export interface ShopifySettingsResponse {
  shopifyEnabled: boolean;
  shopifyStoreDomain: string | null;
  shopifyAdminApiAccessTokenMasked: string;
  shopifyApiVersion: string;
  shopifyLocationId: string | null;
  shopifyWebhookSecretMasked: string;
  webhookUrl: string;
  hasExistingToken: boolean;
  hasExistingWebhookSecret: boolean;
}

/**
 * Require owner role for settings access
 * Only org owners can configure Shopify integration
 */
async function requireOwner() {
  const context = await requireOrgContext();

  if (context.orgRole !== "owner") {
    throw new Error("Chỉ chủ sở hữu tổ chức mới có thể cấu hình tích hợp Shopify.");
  }

  return context;
}

/**
 * Get Shopify settings for the current organization
 * Returns masked tokens for security
 */
export async function getShopifySettingsAction(): Promise<ActionResult<ShopifySettingsResponse>> {
  try {
    const { organizationId } = await requireOwner();

    const settings = await db.query.organizationSettings.findFirst({
      where: eq(organizationSettings.organizationId, organizationId),
    });

    if (!settings) {
      return {
        success: false,
        message: "Không tìm thấy cài đặt tổ chức.",
      };
    }

    // Build webhook URL for this org
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/shopify/${organizationId}/orders`;

    return {
      success: true,
      data: {
        shopifyEnabled: settings.shopifyEnabled,
        shopifyStoreDomain: settings.shopifyStoreDomain,
        shopifyAdminApiAccessTokenMasked: maskSecret(settings.shopifyAdminApiAccessToken),
        shopifyApiVersion: settings.shopifyApiVersion ?? "2025-04",
        shopifyLocationId: settings.shopifyLocationId,
        shopifyWebhookSecretMasked: maskSecret(settings.shopifyWebhookSecret),
        webhookUrl,
        hasExistingToken: !!settings.shopifyAdminApiAccessToken,
        hasExistingWebhookSecret: !!settings.shopifyWebhookSecret,
      },
      message: "Lấy cài đặt Shopify thành công.",
    };
  } catch (error) {
    logger.error({ error }, "Error fetching Shopify settings");
    return {
      success: false,
      message: getDbErrorMessage(error, "Không thể lấy cài đặt Shopify."),
    };
  }
}

/**
 * Update Shopify settings for the current organization
 * Encrypts sensitive fields before storage
 */
export async function updateShopifySettingsAction(
  data: ShopifySettingsFormData
): Promise<ActionResult<void>> {
  try {
    const { organizationId, userId, userName } = await requireOwner();

    logger.info(
      { userId, userName, organizationId },
      `User ${userName} updating Shopify settings`
    );

    const validatedData = ShopifySettingsSchema.parse(data);

    // Get existing settings to preserve encrypted tokens if not changed
    const existingSettings = await db.query.organizationSettings.findFirst({
      where: eq(organizationSettings.organizationId, organizationId),
    });

    if (!existingSettings) {
      return {
        success: false,
        message: "Không tìm thấy cài đặt tổ chức.",
      };
    }

    // Prepare update values
    const updateValues: Partial<typeof organizationSettings.$inferInsert> = {
      shopifyEnabled: validatedData.shopifyEnabled,
      shopifyApiVersion: validatedData.shopifyApiVersion,
      shopifyLocationId: validatedData.shopifyLocationId || null,
      updatedAt: new Date(),
    };

    // Handle store domain
    if (validatedData.shopifyStoreDomain !== undefined) {
      updateValues.shopifyStoreDomain = validatedData.shopifyStoreDomain || null;
    }

    // Handle API token - only update if a new value is provided
    // Empty string or null means "keep existing", actual value means "update"
    if (validatedData.shopifyAdminApiAccessToken && validatedData.shopifyAdminApiAccessToken.trim()) {
      // Encrypt the new token
      updateValues.shopifyAdminApiAccessToken = encryptSecret(validatedData.shopifyAdminApiAccessToken);
      logger.info({ organizationId }, "Shopify API token updated and encrypted");
    }
    // If empty/null, keep existing token (don't update the field)

    // Handle webhook secret - same logic
    if (validatedData.shopifyWebhookSecret && validatedData.shopifyWebhookSecret.trim()) {
      updateValues.shopifyWebhookSecret = encryptSecret(validatedData.shopifyWebhookSecret);
      logger.info({ organizationId }, "Shopify webhook secret updated and encrypted");
    }

    await db
      .update(organizationSettings)
      .set(updateValues)
      .where(eq(organizationSettings.organizationId, organizationId));

    logger.info(
      { userId, userName, organizationId, enabled: validatedData.shopifyEnabled },
      `Shopify settings updated by ${userName}`
    );

    return {
      success: true,
      message: "Đã cập nhật cài đặt Shopify thành công.",
    };
  } catch (error) {
    logger.error({ error }, "Error updating Shopify settings");

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0]?.message ?? "Dữ liệu không hợp lệ.",
      };
    }

    return {
      success: false,
      message: getDbErrorMessage(error, "Không thể cập nhật cài đặt Shopify."),
    };
  }
}

/**
 * Test Shopify connection with current settings
 */
export async function testShopifyConnectionAction(): Promise<
  ActionResult<{ shopName: string; plan: string }>
> {
  try {
    const { organizationId, userName } = await requireOwner();

    logger.info({ organizationId, userName }, `Testing Shopify connection for org`);

    const config = await getOrgShopifyConfig(organizationId);

    if (!config) {
      return {
        success: false,
        message: "Shopify chưa được cấu hình hoặc đã bị tắt.",
      };
    }

    const client = createOrgShopifyClient(config, organizationId);

    // Query shop info to verify connection
    const query = `
      query {
        shop {
          name
          plan {
            displayName
          }
        }
      }
    `;

    const result = await client.graphqlRequest<{
      shop: {
        name: string;
        plan: { displayName: string };
      };
    }>({ query });

    logger.info(
      { organizationId, shopName: result.shop.name },
      "Shopify connection test successful"
    );

    return {
      success: true,
      data: {
        shopName: result.shop.name,
        plan: result.shop.plan.displayName,
      },
      message: `Kết nối thành công với cửa hàng "${result.shop.name}".`,
    };
  } catch (error) {
    logger.error({ error }, "Shopify connection test failed");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể kết nối với Shopify.",
    };
  }
}

/**
 * Clear Shopify configuration (disable and remove credentials)
 */
export async function clearShopifySettingsAction(): Promise<ActionResult<void>> {
  try {
    const { organizationId, userName } = await requireOwner();

    logger.info({ organizationId, userName }, `Clearing Shopify settings`);

    await db
      .update(organizationSettings)
      .set({
        shopifyEnabled: false,
        shopifyStoreDomain: null,
        shopifyAdminApiAccessToken: null,
        shopifyApiVersion: "2025-04",
        shopifyLocationId: null,
        shopifyWebhookSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationSettings.organizationId, organizationId));

    logger.info({ organizationId, userName }, "Shopify settings cleared");

    return {
      success: true,
      message: "Đã xóa cấu hình Shopify.",
    };
  } catch (error) {
    logger.error({ error }, "Error clearing Shopify settings");
    return {
      success: false,
      message: getDbErrorMessage(error, "Không thể xóa cấu hình Shopify."),
    };
  }
}
