import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { qrPool } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { getQRBaseURL } from "~/lib/qr-domain";

/**
 * Format date as YYYY-MM-DD
 */
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
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

    const { batchId } = await params;

    // Fetch QR codes for this batch
    const qrCodes = await db
      .select({ qrCode: qrPool.qrCode, generatedAt: qrPool.generatedAt })
      .from(qrPool)
      .where(
        and(
          eq(qrPool.organizationId, organizationId),
          eq(qrPool.batchId, batchId)
        )
      )
      .orderBy(qrPool.generatedAt);

    if (qrCodes.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy batch hoặc batch rỗng" },
        { status: 404 }
      );
    }

    // Get generatedAt from the first QR code
    const generatedAt = qrCodes[0]?.generatedAt ?? new Date();
    const dateStr = formatDateForFilename(generatedAt);
    const shortBatchId = batchId.length > 12 ? batchId.slice(-12) : batchId;
    const filename = `${dateStr}-${shortBatchId}.csv`;

    // Get organization's QR base URL
    const baseUrl = await getQRBaseURL(organizationId);

    // Generate CSV content
    const csvHeader = "url\n";
    const csvRows = qrCodes
      .map((qr) => `${baseUrl}/${qr.qrCode}`)
      .join("\n");
    const csvContent = csvHeader + csvRows;

    // Return CSV response
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(csvContent, "utf-8").toString(),
        "X-QR-Count": qrCodes.length.toString(),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error generating QR Pool CSV:", error);

    return NextResponse.json(
      { error: "Lỗi khi tạo CSV. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
