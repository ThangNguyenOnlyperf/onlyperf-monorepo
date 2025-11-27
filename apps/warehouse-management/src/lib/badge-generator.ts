import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { PDFDocument } from 'pdf-lib';
import type { BadgeConfig } from './badge-config-schema';
import { getBadgeTemplate } from './badge-config-schema';
import { logger } from '~/lib/logger';

export interface BadgeItem {
  id: string;
  shortCode: string;
  url: string; // Full URL for QR code (e.g., https://onlyperf.com/p/ABCD1234)
}

export interface BadgeGenerationResult {
  pdfBuffer: Buffer;
  totalBadges: number;
  config: BadgeConfig;
}

/**
 * Generate QR code as buffer
 */
async function createQrBuffer(
  url: string,
  size: number,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'H'
): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: size,
    margin: 0,
    errorCorrectionLevel,
    color: {
      dark: '#1f1f1f',
      light: '#ffffff',
    },
  });
}

/**
 * Fetch template image from public URL or local filesystem
 */
async function fetchTemplateBuffer(templatePath: string): Promise<Buffer> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const url = `${baseUrl}${templatePath}`;
    const response = await fetch(url);

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch template from URL, falling back to filesystem');
  }

  const templateAbsolute = path.resolve(process.cwd(), `public${templatePath}`);
  return await fs.readFile(templateAbsolute);
}

/**
 * Generate badge with QR code embedded
 */
async function generateBadgeWithQR(
  item: BadgeItem,
  config: BadgeConfig
): Promise<Buffer> {
  const template = getBadgeTemplate(config.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const templateBuffer = await fetchTemplateBuffer(template.path);
  const templateMeta = await sharp(templateBuffer).metadata();

  if (!templateMeta.width || !templateMeta.height) {
    throw new Error('Template image metadata is missing width/height.');
  }

  // Calculate scaling
  const scale = config.badgeTargetWidth / templateMeta.width;
  const qrSize = Math.round(template.qrBox.size * scale);
  const qrLeft = Math.round(template.qrBox.x * scale);
  const qrTop = Math.round(template.qrBox.y * scale);

  // Resize template
  const resizedTemplate = await sharp(templateBuffer)
    .resize({ width: config.badgeTargetWidth })
    .png()
    .toBuffer();

  const qrBuffer = await createQrBuffer(item.url, qrSize);
  const badgeWithQr = await sharp(resizedTemplate)
    .composite([{ input: qrBuffer, left: qrLeft, top: qrTop }])
    .png()
    .toBuffer();

  return badgeWithQr;
}

/**
 * Generate standalone QR code (QR-only mode)
 */
async function generateStandaloneQR(
  item: BadgeItem,
  size: number
): Promise<Buffer> {
  return createQrBuffer(item.url, size);
}

/**
 * Generate badge sheet PDF
 * Supports both QR-only and badge modes
 */
export async function generateBadgeSheet(
  items: BadgeItem[],
  config: BadgeConfig
): Promise<BadgeGenerationResult> {
  // Calculate page dimensions in pixels
  const pageWidthPx = Math.round((config.pageWidth / 2.54) * config.dpi);
  const pageHeightPx = Math.round((config.pageHeight / 2.54) * config.dpi);

  // Determine item dimensions based on mode
  let itemWidth: number;
  let itemHeight: number;

  if (config.mode === 'badge' && config.templateId) {
    const template = getBadgeTemplate(config.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Fetch template buffer (works in both local and production)
    const templateBuffer = await fetchTemplateBuffer(template.path);
    const templateMeta = await sharp(templateBuffer).metadata();

    if (!templateMeta.width || !templateMeta.height) {
      throw new Error('Template metadata missing');
    }

    const scale = config.badgeTargetWidth / templateMeta.width;
    itemWidth = config.badgeTargetWidth;
    itemHeight = Math.round(templateMeta.height * scale);
  } else {
    // QR-only mode: use square QR codes
    itemWidth = config.badgeTargetWidth;
    itemHeight = config.badgeTargetWidth;
  }

  // Calculate grid layout
  const availableWidth = pageWidthPx - config.margin * 2;
  const availableHeight = pageHeightPx - config.margin * 2;

  const columns = Math.floor((availableWidth + config.gapX) / (itemWidth + config.gapX));
  const rows = Math.floor((availableHeight + config.gapY) / (itemHeight + config.gapY));

  if (columns <= 0 || rows <= 0) {
    throw new Error('Item size too large for the chosen page dimensions.');
  }

  // Generate item images
  const compositeLayers: OverlayOptions[] = [];

  for (const [index, item] of items.entries()) {
    if (index >= columns * rows) {
      logger.warn({ maxItems: columns * rows, totalItems: items.length }, `Only ${columns * rows} items fit on page. Skipping remaining items.`);
      break;
    }

    let itemBuffer: Buffer;

    if (config.mode === 'badge' && config.templateId) {
      itemBuffer = await generateBadgeWithQR(item, config);
    } else {
      itemBuffer = await generateStandaloneQR(item, itemWidth);
    }

    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = config.margin + column * (itemWidth + config.gapX);
    const top = config.margin + row * (itemHeight + config.gapY);

    compositeLayers.push({ input: itemBuffer, left, top });
  }

  // Create page with all items
  const page = sharp({
    create: {
      width: pageWidthPx,
      height: pageHeightPx,
      channels: 3,
      background: '#ffffff',
    },
  });

  const sheetBuffer = await page.composite(compositeLayers).png().toBuffer();

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const pdfWidth = (config.pageWidth / 2.54) * 72; // Convert cm to points
  const pdfHeight = (config.pageHeight / 2.54) * 72;
  const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight]);

  const png = await pdfDoc.embedPng(sheetBuffer);
  const imageScale = Math.min(pdfWidth / png.width, pdfHeight / png.height);
  const imageWidth = png.width * imageScale;
  const imageHeight = png.height * imageScale;

  pdfPage.drawImage(png, {
    x: (pdfWidth - imageWidth) / 2,
    y: (pdfHeight - imageHeight) / 2,
    width: imageWidth,
    height: imageHeight,
  });

  const pdfBytes = await pdfDoc.save();

  return {
    pdfBuffer: Buffer.from(pdfBytes),
    totalBadges: Math.min(items.length, columns * rows),
    config,
  };
}
