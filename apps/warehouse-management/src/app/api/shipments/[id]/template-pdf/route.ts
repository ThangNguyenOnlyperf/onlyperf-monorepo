import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { shipments } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import {
  generateTemplatePDFWithQRCodes,
  convertToQRCodeItems,
} from "~/lib/pdf-template-overlay";
import { clearTemplateCache } from "~/lib/badge-generator";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { logger, getUserContext } from "~/lib/logger";
import { getQRBaseURL } from "~/lib/qr-domain";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 }
      );
    }

    const userContext = getUserContext(session);
    const { id: shipmentId } = await params;

    // Get optional productId filter from query params
    const productId = request.nextUrl.searchParams.get("productId");

    logger.info(
      { ...userContext, shipmentId, productId },
      `User ${userContext.userName} requesting template PDF${productId ? ` for product ${productId}` : ""}`
    );

    // Fetch shipment with items
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!shipment) {
      logger.error(
        { ...userContext, shipmentId },
        `Shipment not found for user ${userContext.userName}`
      );
      return NextResponse.json(
        { error: "Không tìm thấy lô hàng" },
        { status: 404 }
      );
    }

    // Type assertion for items
    const items = shipment.items as Array<{
      id: string;
      qrCode: string | null;
      productId: string;
      quantity: number;
      product?: unknown;
    }>;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Lô hàng không có sản phẩm" },
        { status: 400 }
      );
    }

    // Filter items that have QR codes, optionally by productId
    const itemsWithQR = items.filter(
      (item): item is typeof item & { qrCode: string } => {
        const hasQR = item.qrCode !== null && item.qrCode !== undefined;
        const matchesProduct = !productId || item.productId === productId;
        return hasQR && matchesProduct;
      }
    );

    if (itemsWithQR.length === 0) {
      const errorMsg = productId
        ? "Không có sản phẩm nào có mã QR cho sản phẩm này"
        : "Không có sản phẩm nào có mã QR";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Get product name if filtering by product (for filename)
    let productName = "";
    if (productId && itemsWithQR[0]?.product) {
      const product = itemsWithQR[0].product as { name?: string };
      productName = product.name ? `-${product.name.replace(/[^a-zA-Z0-9]/g, "_")}` : "";
    }

    // Get organization's QR base URL
    const baseUrl = await getQRBaseURL(organizationId);

    // Convert to QRCodeItem format
    const qrItems = convertToQRCodeItems(
      itemsWithQR.map((item) => ({
        id: item.id,
        qrCode: item.qrCode,
      })),
      baseUrl
    );

    // Generate PDF using fixed pdf-lib approach (vector quality)
    const pdfBuffer = await generateTemplatePDFWithQRCodes(qrItems);

    // Clear caches after generation to free memory
    clearTemplateCache();

    const pageCount = Math.ceil(qrItems.length / 44);

    logger.info(
      {
        ...userContext,
        shipmentId,
        itemCount: qrItems.length,
        pageCount,
        bufferSize: pdfBuffer.length,
      },
      `User ${userContext.userName} successfully generated optimized template PDF`
    );

    // Return streaming response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="shipment-${shipmentId}${productName}-qr.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
        "X-Item-Count": qrItems.length.toString(),
        "X-Page-Count": pageCount.toString(),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    logger.error({ error }, "Error generating optimized template PDF");
    console.error("Error generating optimized template PDF:", error);

    return NextResponse.json(
      { error: "Lỗi khi tạo PDF. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
