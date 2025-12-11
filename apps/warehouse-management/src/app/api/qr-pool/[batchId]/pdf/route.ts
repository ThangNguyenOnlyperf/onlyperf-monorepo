import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { qrPool } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { generateQRPoolPDFFile, getQRPoolPDFMeta } from "~/lib/qr-pool-pdf-generator";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";

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
    const fileParam = request.nextUrl.searchParams.get("file");

    // Fetch QR codes for this batch
    const qrCodes = await db
      .select({ qrCode: qrPool.qrCode, id: qrPool.id, generatedAt: qrPool.generatedAt })
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

    // If no file param, return metadata about available files
    if (!fileParam) {
      const files = getQRPoolPDFMeta(qrCodes.length, batchId, generatedAt);
      return NextResponse.json({
        batchId,
        totalQRs: qrCodes.length,
        totalFiles: files.length,
        files: files.map((f) => ({
          fileNumber: f.fileNumber,
          qrCount: f.qrCount,
          filename: f.filename,
        })),
      });
    }

    // Parse file index
    const fileIndex = parseInt(fileParam, 10);
    if (isNaN(fileIndex) || fileIndex < 1) {
      return NextResponse.json(
        { error: "Invalid file index" },
        { status: 400 }
      );
    }

    // Generate PDF for the specified file
    const result = await generateQRPoolPDFFile(qrCodes, batchId, fileIndex, generatedAt);

    // Return PDF response
    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": result.pdfBuffer.length.toString(),
        "X-QR-Count": result.qrCount.toString(),
        "X-File-Number": result.fileNumber.toString(),
        "X-Total-Files": result.totalFiles.toString(),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error generating QR Pool PDF:", error);

    // Check for invalid file index error
    if (error instanceof Error && error.message.includes("Invalid file index")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Lỗi khi tạo PDF. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
