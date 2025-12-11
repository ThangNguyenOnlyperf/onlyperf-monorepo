import "server-only";
import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import QRCode from "qrcode";
import {
  type TemplateConfig,
  type SlotCoordinate,
  cmToPoints,
  calculateCenteredPosition,
  loadTemplateConfig,
} from "./template-config-schema";
import fs from "fs/promises";
import path from "path";

/**
 * Transform coordinates for rotated PDF templates
 * When template was designed in rotated view (90°), coordinates need transformation
 */
function transformCoordinatesForRotation(
  left: number,
  top: number,
  qrWidth: number,
  qrHeight: number,
  configPageWidth: number,
  configPageHeight: number,
  rotation: 0 | 90 | 180 | 270
): { x: number; y: number } {
  switch (rotation) {
    case 90:
      // 90° rotation: x = top, y = left (direct mapping for this template)
      return {
        x: top,
        y: left,
      };
    case 180:
      return {
        x: configPageWidth - left - qrWidth,
        y: configPageHeight - top - qrHeight,
      };
    case 270:
      return {
        x: configPageHeight - top - qrHeight,
        y: left,
      };
    default:
      return { x: left, y: configPageHeight - top - qrHeight };
  }
}

/**
 * Item data for QR code generation
 */
export interface QRCodeItem {
  id: string;
  qrCode: string; // The short code (e.g., "ABCD1234")
  url: string;    // Full URL for QR code (e.g., "https://onlyperf.com/p/ABCD1234")
}

/**
 * Options for PDF generation
 */
export interface PDFGenerationOptions {
  templateConfigPath?: string; // Path to template JSON (relative to public/)
  templatePDFPath?: string;     // Path to template PDF (relative to public/)
  qrCodeOptions?: {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
  };
}

/**
 * QR code matrix data for vector rendering
 */
interface QRMatrix {
  modules: boolean[][];
  size: number;
}

/**
 * Get QR code as raw matrix for vector rendering
 * Uses qrcode library's create() method to get module data
 */
function getQRCodeMatrix(
  data: string,
  errorCorrectionLevel: "L" | "M" | "Q" | "H" = "L"
): QRMatrix {
  const qr = QRCode.create(data, { errorCorrectionLevel });
  const size = qr.modules.size;
  const modules: boolean[][] = [];

  for (let row = 0; row < size; row++) {
    modules[row] = [];
    for (let col = 0; col < size; col++) {
      // qr.modules.get() returns 1 for dark, 0 for light
      modules[row]![col] = qr.modules.get(row, col) === 1;
    }
  }

  return { modules, size };
}

/**
 * Draw QR code as vector rectangles at specific position on PDF page
 * Vector rendering = perfect print quality at any size, smaller file size
 */
function embedQRCodeVectorAtPosition(
  page: PDFPage,
  data: string,
  slot: SlotCoordinate,
  config: TemplateConfig,
  rotation: 0 | 90 | 180 | 270 = 0,
  errorCorrectionLevel: "L" | "M" | "Q" | "H" = "L"
): void {
  const qrMatrix = getQRCodeMatrix(data, errorCorrectionLevel);

  // Get QR dimensions in cm
  const qrWidthCm = config.qrCodeSize.width;
  const qrHeightCm = config.qrCodeSize.height;

  // Get slot dimensions
  const slotWidthCm = config.slotDimensions.width;
  const slotHeightCm = config.slotDimensions.height;

  // Calculate centered position within slot (in cm, Preview coordinates)
  const centeredPos = calculateCenteredPosition(
    slot.left,
    slot.top,
    slotWidthCm,
    slotHeightCm,
    qrWidthCm,
    qrHeightCm
  );

  // Transform coordinates based on rotation
  const transformed = transformCoordinatesForRotation(
    centeredPos.left,
    centeredPos.top,
    qrWidthCm,
    qrHeightCm,
    config.pageSize.width,
    config.pageSize.height,
    rotation
  );

  // Convert to points
  const baseX = cmToPoints(transformed.x);
  const baseY = cmToPoints(transformed.y);
  const qrWidthPt = cmToPoints(qrWidthCm);

  // Calculate module size (QR code modules + 1 unit quiet zone on each side)
  // Standard QR quiet zone is 4 modules, but we use 1 for compact labels
  const quietZone = 1;
  const moduleSize = qrWidthPt / (qrMatrix.size + quietZone * 2);

  // Draw each dark module as a filled rectangle
  // Note: We apply -90° rotation to match the original PNG behavior
  // by swapping row/col and adjusting the coordinate calculation
  for (let row = 0; row < qrMatrix.size; row++) {
    for (let col = 0; col < qrMatrix.size; col++) {
      if (qrMatrix.modules[row]![col]) {
        // Apply -90° rotation transformation:
        // In rotated space: new_col = row, new_row = (size - 1 - col)
        const rotatedRow = qrMatrix.size - 1 - col;
        const rotatedCol = row;

        page.drawRectangle({
          x: baseX + (rotatedCol + quietZone) * moduleSize,
          y: baseY + (rotatedRow + quietZone) * moduleSize,
          width: moduleSize,
          height: moduleSize,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
}

/**
 * Generate PDF with QR codes overlaid on template
 */
export async function generateTemplatePDFWithQRCodes(
  items: QRCodeItem[],
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  // Default paths
  const templateConfigPath =
    options.templateConfigPath ?? "TEM STAMP - FILE IN.json";
  const templatePDFPath =
    options.templatePDFPath ?? "TEM STAMP - FILE IN.pdf";

  // Load template configuration
  const config = await loadTemplateConfig(templateConfigPath);

  // Load template PDF as source document
  const templatePath = path.join(process.cwd(), "public", templatePDFPath);
  const templateBytes = await fs.readFile(templatePath);
  const templateDoc = await PDFDocument.load(templateBytes);

  // Create new output document
  const pdfDoc = await PDFDocument.create();

  // Calculate how many pages needed
  const slotsPerPage = config.grid.totalSlots;
  const totalPages = Math.ceil(items.length / slotsPerPage);

  // Get error correction level from options
  const errorCorrectionLevel = options.qrCodeOptions?.errorCorrectionLevel ?? "L";

  // Process each page - vector drawing is memory efficient (no buffers)
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    // Copy template page from source document (preserves original formatting)
    const [copiedPage] = await pdfDoc.copyPages(templateDoc, [0]);
    const newPage = pdfDoc.addPage(copiedPage);

    // Get actual page rotation (PDF may have internal rotation flag)
    const pageRotation = newPage.getRotation().angle as 0 | 90 | 180 | 270;

    // Calculate item range for this page
    const startIdx = pageIndex * slotsPerPage;
    const endIdx = Math.min(startIdx + slotsPerPage, items.length);
    const pageItems = items.slice(startIdx, endIdx);

    // Draw QR codes as vector rectangles (no PNG buffers needed)
    for (let i = 0; i < pageItems.length; i++) {
      const slot = config.coordinates[i];
      const item = pageItems[i];

      if (!slot) {
        console.warn(
          `No slot coordinate defined for position ${i} on page ${pageIndex + 1}`
        );
        continue;
      }

      if (!item) {
        console.warn(
          `No item available for position ${i} on page ${pageIndex + 1}`
        );
        continue;
      }

      // Draw QR code as vector rectangles - perfect print quality
      embedQRCodeVectorAtPosition(
        newPage,
        item.url,
        slot,
        config,
        pageRotation,
        errorCorrectionLevel
      );
    }
  }

  // Save PDF to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generate PDF and return as base64 string (for client-side use)
 */
export async function generateTemplatePDFBase64(
  items: QRCodeItem[],
  options: PDFGenerationOptions = {}
): Promise<string> {
  const buffer = await generateTemplatePDFWithQRCodes(items, options);
  return buffer.toString("base64");
}

/**
 * Utility: Convert shipment items to QRCodeItem format
 */
export function convertToQRCodeItems(
  items: Array<{ id: string; qrCode: string }>,
  baseUrl?: string
): QRCodeItem[] {
  const url = baseUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://onlyperf.com";

  return items.map((item) => ({
    id: item.id,
    qrCode: item.qrCode,
    url: `${url}/p/${item.qrCode}`,
  }));
}
