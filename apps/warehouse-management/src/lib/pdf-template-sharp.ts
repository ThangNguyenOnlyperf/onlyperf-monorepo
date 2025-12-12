import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { PDFDocument } from "pdf-lib";
import {
  type TemplateConfig,
  cmToPoints,
  loadTemplateConfig,
  calculateCenteredPosition,
} from "./template-config-schema";

/**
 * Item data for QR code generation
 */
export interface QRCodeItem {
  id: string;
  qrCode: string;
  url: string;
}

interface GenerationOptions {
  templateConfigPath?: string;
  dpi?: number;
}

const DEFAULT_DPI = 300;
const CM_TO_INCH = 2.54;

/**
 * Convert cm to pixels at given DPI
 */
function cmToPixels(cm: number, dpi: number = DEFAULT_DPI): number {
  return Math.round((cm / CM_TO_INCH) * dpi);
}

/**
 * Generate QR code as PNG buffer
 */
async function generateQRBuffer(
  url: string,
  sizePx: number
): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: sizePx,
    margin: 1,
    errorCorrectionLevel: "L",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Load template image from filesystem
 */
async function loadTemplateImage(imagePath: string): Promise<Buffer> {
  const fullPath = path.join(process.cwd(), "public", imagePath);
  return fs.readFile(fullPath);
}

/**
 * Generate a single page with QR codes composited onto template
 */
async function generatePage(
  templateBuffer: Buffer,
  items: QRCodeItem[],
  config: TemplateConfig,
  dpi: number
): Promise<Buffer> {
  // Calculate QR size in pixels
  const qrSizePx = cmToPixels(config.qrCodeSize.width, dpi);
  const slotWidthPx = cmToPixels(config.slotDimensions.width, dpi);
  const slotHeightPx = cmToPixels(config.slotDimensions.height, dpi);

  // Generate QR overlays
  const overlays: OverlayOptions[] = [];

  for (let i = 0; i < items.length && i < config.grid.totalSlots; i++) {
    const item = items[i];
    const slot = config.coordinates[i];

    if (!item || !slot) continue;

    const qrBuffer = await generateQRBuffer(item.url, qrSizePx);

    // Calculate centered position within slot (in cm)
    const centered = calculateCenteredPosition(
      slot.left,
      slot.top,
      config.slotDimensions.width,
      config.slotDimensions.height,
      config.qrCodeSize.width,
      config.qrCodeSize.height
    );

    // Convert to pixels
    // Note: PNG uses top-left origin (same as Preview coordinates), so no conversion needed
    const leftPx = cmToPixels(centered.left, dpi);
    const topPx = cmToPixels(centered.top, dpi);

    overlays.push({
      input: qrBuffer,
      left: leftPx,
      top: topPx,
    });
  }

  // Composite QR codes onto template
  return sharp(templateBuffer)
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Generate PDF with QR codes using Sharp-based image compositing
 * This is much faster and produces smaller files than pdf-lib embed approach
 */
export async function generateTemplatePDFOptimized(
  items: QRCodeItem[],
  options: GenerationOptions = {}
): Promise<Buffer> {
  const configPath = options.templateConfigPath ?? "TEM STAMP - FILE IN.json";
  const dpi = options.dpi ?? DEFAULT_DPI;

  // Load configuration
  const config = await loadTemplateConfig(configPath);

  // Determine template image path
  const templateImagePath =
    config.templateImage ?? config.templateFile.replace(".pdf", ".png");

  // Load template image
  const templateBuffer = await loadTemplateImage(templateImagePath);

  // Calculate pagination
  const slotsPerPage = config.grid.totalSlots;
  const totalPages = Math.ceil(items.length / slotsPerPage);

  // Generate page images
  const pageBuffers: Buffer[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const startIdx = pageIdx * slotsPerPage;
    const pageItems = items.slice(startIdx, startIdx + slotsPerPage);

    const pageBuffer = await generatePage(
      templateBuffer,
      pageItems,
      config,
      dpi
    );
    pageBuffers.push(pageBuffer);
  }

  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const pageWidthPts = cmToPoints(config.pageSize.width);
  const pageHeightPts = cmToPoints(config.pageSize.height);

  for (const pageBuffer of pageBuffers) {
    const image = await pdfDoc.embedPng(pageBuffer);
    const page = pdfDoc.addPage([pageWidthPts, pageHeightPts]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidthPts,
      height: pageHeightPts,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * Generate and return as base64 (for backward compatibility)
 */
export async function generateTemplatePDFOptimizedBase64(
  items: QRCodeItem[],
  options: GenerationOptions = {}
): Promise<string> {
  const buffer = await generateTemplatePDFOptimized(items, options);
  return buffer.toString("base64");
}

/**
 * Utility: Convert shipment items to QRCodeItem format
 * @param items - Array of items with id and qrCode
 * @param baseUrl - Full base URL including path (e.g., "https://btsport.com/p")
 *                  If not provided, defaults to env or "https://onlyperf.com/p"
 */
export function convertToQRCodeItems(
  items: Array<{ id: string; qrCode: string }>,
  baseUrl?: string
): QRCodeItem[] {
  // Default to env + /p if no baseUrl provided (backwards compatible)
  const url = baseUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://onlyperf.com"}/p`;

  return items.map((item) => ({
    id: item.id,
    qrCode: item.qrCode,
    url: `${url}/${item.qrCode}`,
  }));
}
