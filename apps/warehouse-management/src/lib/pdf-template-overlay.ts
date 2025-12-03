import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";

// Limit Sharp's internal cache to prevent memory leaks on repeated generation
sharp.cache({ memory: 50, files: 20, items: 100 });
sharp.concurrency(2); // Limit concurrent operations
import {
  type TemplateConfig,
  type SlotCoordinate,
  cmToPoints,
  previewToPDFCoordinate,
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
    color?: {
      dark?: string;
      light?: string;
    };
  };
}

/**
 * Generate QR code as PNG buffer
 */
async function generateQRCodePNG(
  data: string,
  sizeCm: number,
  options?: PDFGenerationOptions["qrCodeOptions"]
): Promise<Buffer> {
  const sizePixels = Math.round(cmToPoints(sizeCm) * 2); // 2x resolution for quality

  // Generate QR code as data URL with transparent background
  const qrDataURL = await QRCode.toDataURL(data, {
    errorCorrectionLevel: options?.errorCorrectionLevel ?? "L",
    margin: options?.margin ?? 1,
    width: sizePixels,
    color: {
      dark: options?.color?.dark ?? "#000000",
      light: "#00000000", // Transparent background (RGBA)
    },
  });

  // Convert data URL to buffer
  const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Process with sharp: rotate -90° to match template coordinate system
  return sharp(buffer)
    .rotate(-90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(sizePixels, sizePixels, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    })
    .png()
    .toBuffer();
}

/**
 * Generate QR codes for a single page worth of items
 * This limits memory usage by only holding one page's worth of buffers at a time
 */
async function generateQRCodesForPage(
  items: QRCodeItem[],
  qrSizeCm: number,
  options?: PDFGenerationOptions["qrCodeOptions"]
): Promise<Buffer[]> {
  return Promise.all(
    items.map((item) => generateQRCodePNG(item.url, qrSizeCm, options))
  );
}

/**
 * Embed QR code at specific position on PDF page
 */
async function embedQRCodeAtPosition(
  pdfDoc: PDFDocument,
  page: PDFPage,
  qrBuffer: Buffer,
  slot: SlotCoordinate,
  config: TemplateConfig,
  rotation: 0 | 90 | 180 | 270 = 0
): Promise<void> {
  // Embed PNG image
  const qrImage = await pdfDoc.embedPng(qrBuffer);

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
  const pdfX = cmToPoints(transformed.x);
  const pdfY = cmToPoints(transformed.y);
  const qrWidth = cmToPoints(qrWidthCm);
  const qrHeight = cmToPoints(qrHeightCm);

  // Draw QR code on page
  page.drawImage(qrImage, {
    x: pdfX,
    y: pdfY,
    width: qrWidth,
    height: qrHeight,
  });
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

  // Process each page - generate QR codes per-page to limit memory usage
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

    // Generate QR codes for THIS PAGE ONLY (memory optimization)
    const qrBuffers = await generateQRCodesForPage(
      pageItems,
      config.qrCodeSize.width,
      options.qrCodeOptions
    );

    // Overlay QR codes for this page
    for (let i = 0; i < pageItems.length; i++) {
      const slot = config.coordinates[i];
      const qrBuffer = qrBuffers[i];

      if (!slot) {
        console.warn(
          `No slot coordinate defined for position ${i} on page ${pageIndex + 1}`
        );
        continue;
      }

      if (!qrBuffer) {
        console.warn(
          `No QR buffer available for position ${i} on page ${pageIndex + 1}`
        );
        continue;
      }

      await embedQRCodeAtPosition(
        pdfDoc,
        newPage,
        qrBuffer,
        slot,
        config,
        pageRotation // Use actual page rotation for coordinate transformation
      );
    }

    // Clear buffer references to allow GC (memory optimization)
    qrBuffers.length = 0;
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
