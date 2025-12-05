"use server";

import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import {
  updateCustomerProfile,
  refreshCustomerMetaCookie,
} from "@/lib/shopify/customer-account-api";

/**
 * Server action wrapper for updating customer profile (firstName, lastName)
 * Allows client components to update profile via Shopify Customer Account API
 */
export async function updateProfileAction(input: {
  firstName: string;
  lastName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await readCustomerSessionFromCookies();
    if (!session) {
      return {
        success: false,
        error: "Bạn cần đăng nhập để cập nhật hồ sơ",
      };
    }

    const result = await updateCustomerProfile({
      session,
      input: {
        firstName: input.firstName || null,
        lastName: input.lastName || null,
      },
    });

    if (!result.ok || result.userErrors?.length) {
      const errorMessage =
        result.userErrors?.map((e) => e.message).join(", ") ||
        "Không thể cập nhật hồ sơ";
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Update the meta cookie so UI reflects new name without re-auth
    if (result.customer) {
      await refreshCustomerMetaCookie({
        session,
        customer: result.customer,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[updateProfileAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Đã xảy ra lỗi",
    };
  }
}
