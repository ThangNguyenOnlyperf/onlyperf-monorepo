"use server";

import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import {
  createCustomerAddress as createCustomerAddressApi,
  updateCustomerAddress as updateCustomerAddressApi,
  deleteCustomerAddress as deleteCustomerAddressApi,
} from "@/lib/shopify/customer-account-api";

type ShopifyAddress = {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  address1: string | null;
  address2?: string | null;
  city: string | null;
  province?: string | null;
  country: string | null;
  zip: string | null;
  company?: string | null;
};

function cleanAddress(address: ShopifyAddress): {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  company?: string;
} {
  return {
    firstName: address.firstName ?? undefined,
    lastName: address.lastName ?? undefined,
    phoneNumber: address.phoneNumber ?? undefined,
    address1: address.address1 ?? "",
    address2: address.address2 ?? undefined,
    city: address.city ?? "",
    province: address.province ?? undefined,
    country: address.country ?? "VN",
    zip: address.zip ?? "700000",
    company: address.company ?? undefined,
  };
}

export async function saveCustomerAddress(
  address: ShopifyAddress,
  defaultAddress: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await readCustomerSessionFromCookies();
    if (!session) {
      return {
        success: false,
        error: "Bạn cần đăng nhập để lưu địa chỉ giao hàng",
      };
    }

    const cleanedAddress = cleanAddress(address);

    const result = await createCustomerAddressApi({
      session,
      address: cleanedAddress,
      defaultAddress,
    });

    if (!result.ok || result.userErrors?.length) {
      const errorMessage =
        result.userErrors?.map((e) => e.message).join(", ") || "Unknown error";
      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Không thể lưu địa chỉ",
    };
  }
}

export async function updateCustomerAddressAction(
  addressId: string,
  address: ShopifyAddress,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await readCustomerSessionFromCookies();
    if (!session) {
      return {
        success: false,
        error: "Bạn cần đăng nhập để cập nhật địa chỉ",
      };
    }

    const cleanedAddress = cleanAddress(address);

    const result = await updateCustomerAddressApi({
      session,
      addressId,
      address: cleanedAddress,
    });

    if (!result.ok || result.userErrors?.length) {
      const errorMessage =
        result.userErrors?.map((e) => e.message).join(", ") ||
        "Không thể cập nhật địa chỉ";
      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Đã xảy ra lỗi khi cập nhật",
    };
  }
}

export async function deleteCustomerAddressAction(
  addressId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await readCustomerSessionFromCookies();
    if (!session) {
      return {
        success: false,
        error: "Bạn cần đăng nhập để xóa địa chỉ",
      };
    }

    const result = await deleteCustomerAddressApi({
      session,
      addressId,
    });

    if (!result.ok || result.userErrors?.length) {
      const errorMessage =
        result.userErrors?.map((e) => e.message).join(", ") ||
        "Không thể xóa địa chỉ";
      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Đã xảy ra lỗi khi xóa",
    };
  }
}
