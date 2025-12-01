import { NextResponse } from "next/server";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import { createCustomerAddress } from "@/lib/shopify/customer-account-api";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await readCustomerSessionFromCookies();

    if (!session) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { address, defaultAddress } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Dữ liệu địa chỉ là bắt buộc" },
        { status: 400 },
      );
    }

    // Create address using Shopify Customer Account API
    const result = await createCustomerAddress({
      session,
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        company: address.company,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        province: address.province,
        country: address.country,
        zip: address.zip,
        phoneNumber: address.phoneNumber,
      },
      defaultAddress: defaultAddress ?? false,
    });

    if (!result.ok || result.userErrors?.length) {
      return NextResponse.json(
        {
          error: "Không thể tạo địa chỉ",
          userErrors: result.userErrors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      customerAddress: result.customerAddress,
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}
