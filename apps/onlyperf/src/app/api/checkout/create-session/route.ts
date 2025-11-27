import { NextResponse } from "next/server";
import { createSession } from "@/actions/checkout";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";

export async function POST(request: Request): Promise<Response> {
  try {
    const customerSession = await readCustomerSessionFromCookies();

    if (!customerSession) {
      return NextResponse.json(
        { error: "Không có quyền truy cập - vui lòng đăng nhập" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { shippingAddress, cartId, paymentMethod = "bank_transfer" } = body;

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Địa chỉ giao hàng là bắt buộc" },
        { status: 400 },
      );
    }

    // Get or use provided cart ID
    let activeCartId = cartId;

    if (!activeCartId) {
      // Try to get cart from cookies or create new one
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      activeCartId = cookieStore.get("shopify_cart_id")?.value;
    }

    if (!activeCartId) {
      return NextResponse.json(
        { error: "Không tìm thấy giỏ hàng" },
        { status: 400 },
      );
    }

    // Create checkout session with delivery info
    const result = await createSession({
      cartId: activeCartId,
      email: customerSession.customer.email,
      customerId: customerSession.customer.id,
      paymentMethod,
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phoneNumber: shippingAddress.phone,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2 || null,
        city: shippingAddress.city,
        province: shippingAddress.province || null,
        zip: shippingAddress.zip,
        country: shippingAddress.country,
      },
      isGuest: false,
    });

    return NextResponse.json({
      success: true,
      sessionId: result.summary.sessionId,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Không thể tạo phiên thanh toán" },
      { status: 500 },
    );
  }
}
