import { type NextRequest } from "next/server";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import { transferOwnership } from "@/actions/warrantyActions";
import { transferOwnershipSchema } from "@/lib/warranty/schema";

/**
 * POST /api/warranty/transfer
 * Initiate ownership transfer
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await readCustomerSessionFromCookies();
    if (!session) {
      return Response.json(
        { success: false, error: "Vui lòng đăng nhập để chuyển quyền sở hữu" },
        { status: 401 },
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const result = transferOwnershipSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: "Dữ liệu không hợp lệ",
          details: result.error.issues,
        },
        { status: 400 },
      );
    }

    // 3. Call the action
    const transferResult = await transferOwnership(
      result.data,
      session.customer.id,
    );

    if (!transferResult.success) {
      return Response.json(
        { success: false, error: transferResult.error },
        { status: transferResult.status },
      );
    }

    return Response.json({
      success: true,
      transferId: transferResult.transferId,
      message: transferResult.message,
    });
  } catch (error) {
    console.error("❌ Ownership transfer error:", error);
    return Response.json(
      { success: false, error: "Đã có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
