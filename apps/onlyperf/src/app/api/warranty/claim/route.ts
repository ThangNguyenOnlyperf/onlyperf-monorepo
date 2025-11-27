import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { shipmentItems, warrantyClaims } from "@perf/db/schema";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import { addMonths } from "date-fns";

// Zod schema for claim submission
const claimSchema = z.object({
  qrCode: z.string().regex(/^[A-Z]{4}\d{4}$/, "Invalid QR code format"),
  claimType: z.enum(["defect", "damage", "repair", "replacement"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  images: z.array(z.string().url()).optional().default([]),
});

/**
 * POST /api/warranty/claim
 * Submit a warranty claim
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await readCustomerSessionFromCookies();
    if (!session) {
      return Response.json(
        { success: false, error: "Vui lòng đăng nhập để gửi yêu cầu bảo hành" },
        { status: 401 },
      );
    }

    const customerId = session.customer.id;

    // 2. Parse and validate request body
    const body = await request.json();
    const result = claimSchema.safeParse(body);

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

    const { qrCode, claimType, title, description, images } = result.data;

    // 3. Lookup shipment item (product unit)
    const unit = await db.query.shipmentItems.findFirst({
      where: eq(shipmentItems.qrCode, qrCode),
    });

    if (!unit) {
      return Response.json(
        { success: false, error: "Sản phẩm không tồn tại" },
        { status: 404 },
      );
    }

    // 4. Check ownership
    if (unit.currentOwnerId !== customerId) {
      return Response.json(
        {
          success: false,
          error: "Bạn không phải chủ sở hữu của sản phẩm này",
        },
        { status: 403 },
      );
    }

    // 5. Check warranty status
    if (unit.warrantyStatus === "pending") {
      return Response.json(
        {
          success: false,
          error: "Bảo hành chưa được kích hoạt. Vui lòng chờ sản phẩm được giao.",
        },
        { status: 400 },
      );
    }

    if (unit.warrantyStatus === "void") {
      return Response.json(
        { success: false, error: "Bảo hành đã bị hủy" },
        { status: 400 },
      );
    }

    // Check if warranty is expired
    if (unit.deliveredAt) {
      const warrantyEndDate = addMonths(unit.deliveredAt, unit.warrantyMonths);
      if (new Date() > warrantyEndDate) {
        return Response.json(
          { success: false, error: "Bảo hành đã hết hạn" },
          { status: 400 },
        );
      }
    }

    // 6. Create warranty claim
    const [claim] = await db
      .insert(warrantyClaims)
      .values({
        shipmentItemId: unit.id,
        customerId,
        claimType,
        title,
        description,
        images: images.length > 0 ? images : null,
        status: "pending",
        submittedAt: new Date(),
      })
      .returning();

    console.log(`✅ Warranty claim created: ${claim.id} for QR ${qrCode}`);

    return Response.json({
      success: true,
      claimId: claim.id,
      message: "Yêu cầu bảo hành đã được gửi thành công",
    });
  } catch (error) {
    console.error("❌ Warranty claim error:", error);
    return Response.json(
      { success: false, error: "Đã có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
