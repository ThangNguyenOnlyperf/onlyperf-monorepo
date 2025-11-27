import { NextResponse } from "next/server";

import { createCheckoutSession } from "@/actions/checkout";
import { createCheckoutSessionInputSchema } from "@/lib/checkout/session-schema";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";

export async function POST(request: Request) {
  try {
    const session = await readCustomerSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createCheckoutSessionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { summary } = await createCheckoutSession(parsed.data);

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("Create checkout session error", error);
    if (error instanceof Error) {
      const message = error.message;
      if (message === "Customer session required") {
        return NextResponse.json(
          { success: false, message: "Không có quyền truy cập" },
          { status: 401 },
        );
      }
      if (message === "Cart not found") {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy giỏ hàng" },
          { status: 404 },
        );
      }

      if (
        message === "Cart total amount must be greater than zero" ||
        message === "Cart is empty"
      ) {
        return NextResponse.json(
          { success: false, message: "Giỏ hàng trống" },
          { status: 400 },
        );
      }
    }
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}
