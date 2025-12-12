"use server";

import { db } from "~/server/db";
import { organizationSettings } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOrgContext } from "~/lib/authorization";
import { logger } from "~/lib/logger";
import type { ActionResult } from "./types";
import { getActionErrorMessage, serializeError } from "~/lib/error-handling";

/**
 * QR Domain settings form schema
 */
const QRDomainSettingsSchema = z.object({
  qrCodeDomain: z.string().url("Domain phải là URL hợp lệ (https://...)").optional().nullable(),
  qrCodePath: z.string().default("/p"),
});

export type QRDomainSettingsFormData = z.infer<typeof QRDomainSettingsSchema>;

/**
 * Response type for get settings
 */
export interface QRDomainSettingsResponse {
  qrCodeDomain: string | null;
  qrCodePath: string;
  previewUrl: string;
}

/**
 * Require owner role for settings access
 * Only org owners can configure QR domain
 */
async function requireOwner() {
  const context = await requireOrgContext();

  if (context.orgRole !== "owner") {
    throw new Error("Chỉ chủ sở hữu tổ chức mới có thể cấu hình domain QR code.");
  }

  return context;
}

/**
 * Get QR domain settings for the current organization
 */
export async function getQRDomainSettingsAction(): Promise<ActionResult<QRDomainSettingsResponse>> {
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

    // Build preview URL
    const domain = settings.qrCodeDomain || process.env.NEXT_PUBLIC_BASE_URL || "https://onlyperf.com";
    const path = settings.qrCodePath || "/p";
    const previewUrl = `${domain}${path}/X7KM9PQ2NR`;

    return {
      success: true,
      data: {
        qrCodeDomain: settings.qrCodeDomain,
        qrCodePath: settings.qrCodePath || "/p",
        previewUrl,
      },
      message: "Lấy cài đặt domain QR thành công.",
    };
  } catch (error) {
    logger.error({ error: serializeError(error) }, "Error fetching QR domain settings");
    return {
      success: false,
      message: getActionErrorMessage(error, "Không thể lấy cài đặt domain QR."),
    };
  }
}

/**
 * Update QR domain settings for the current organization
 */
export async function updateQRDomainSettingsAction(
  data: QRDomainSettingsFormData
): Promise<ActionResult<void>> {
  try {
    const { organizationId, userId, userName } = await requireOwner();

    logger.info(
      { userId, userName, organizationId },
      `User ${userName} updating QR domain settings`
    );

    const validatedData = QRDomainSettingsSchema.parse(data);

    // Get existing settings
    const existingSettings = await db.query.organizationSettings.findFirst({
      where: eq(organizationSettings.organizationId, organizationId),
    });

    if (!existingSettings) {
      return {
        success: false,
        message: "Không tìm thấy cài đặt tổ chức.",
      };
    }

    // Normalize domain - remove trailing slash
    let domain = validatedData.qrCodeDomain?.trim() || null;
    if (domain?.endsWith("/")) {
      domain = domain.slice(0, -1);
    }

    // Normalize path - ensure starts with /
    let path = validatedData.qrCodePath?.trim() || "/p";
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    // Remove trailing slash from path
    if (path.endsWith("/") && path.length > 1) {
      path = path.slice(0, -1);
    }

    await db
      .update(organizationSettings)
      .set({
        qrCodeDomain: domain,
        qrCodePath: path,
        updatedAt: new Date(),
      })
      .where(eq(organizationSettings.organizationId, organizationId));

    logger.info(
      { userId, userName, organizationId, domain, path },
      `QR domain settings updated by ${userName}`
    );

    return {
      success: true,
      message: "Đã cập nhật cài đặt domain QR thành công.",
    };
  } catch (error) {
    logger.error({ error: serializeError(error) }, "Error updating QR domain settings");

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0]?.message ?? "Dữ liệu không hợp lệ.",
      };
    }

    return {
      success: false,
      message: getActionErrorMessage(error, "Không thể cập nhật cài đặt domain QR."),
    };
  }
}
