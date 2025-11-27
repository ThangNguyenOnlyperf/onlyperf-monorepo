import QRCode from 'qrcode';
import { env } from '~/env';

export interface QRCodeOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  isDarkMode?: boolean;
}

/**
 * Get the base URL for QR codes from environment variable
 */
export function getQRBaseURL(): string {
  return env.NEXT_PUBLIC_BASE_URL;
}

/**
 * Generate a QR code with the specified options
 * @param data The data to encode in the QR code
 * @param options QR code generation options
 * @returns Base64 data URL of the QR code image
 */
export async function generateQRCode(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    size = 177, // 1.5cm at 300 DPI (suitable for ABCD1234 format codes)
    errorCorrectionLevel = 'H', // 30% error correction - increased for small QR codes and warehouse environment
    margin = 1,
    isDarkMode = false,
  } = options;

  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel,
    type: 'image/png',
    width: size,
    margin,
    color: {
      dark: isDarkMode ? '#FFFFFF' : '#000000',
      light: isDarkMode ? '#000000' : '#FFFFFF',
    },
  };

  try {
    return await QRCode.toDataURL(data, qrOptions);
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`);
  }
}

/**
 * Generate a product QR code with short code URL
 * @param shortCode The 8-character short code (ABCD1234 format)
 * @returns Base64 data URL of the QR code image
 *
 * TODO: Create product lookup page at /p/[code] to handle QR scans
 * This page should:
 * - Look up product by shortCode
 * - Display product information (brand, model, color, etc.)
 * - Show current status (pending, received, sold, shipped)
 * - Show storage location if available
 * - Track scan analytics
 */
export async function generateProductQRCode(
  shortCode: string
): Promise<string> {
  const baseUrl = getQRBaseURL();
  const url = `${baseUrl}/p/${shortCode}`;
  return generateQRCode(url);
}

/**
 * @deprecated Use generateShortCode from ~/lib/product-code instead
 * This function generates long codes that don't fit on small QR labels
 *
 * Generate a unique product code based on receipt number and sequence
 * @param receiptNumber The receipt number (e.g., "PN-2024-001")
 * @param sequence The sequence number within the shipment
 * @returns Product code in format PB_{RECEIPT_NUMBER}_{SEQUENCE}
 */
export function generateProductCode(receiptNumber: string, sequence: number): string {
  const seq = sequence.toString().padStart(4, '0');
  return `PB_${receiptNumber}_${seq}`;
}

/**
 * Generate QR codes for curved surfaces (25-50% larger)
 * @param data The data to encode
 * @param curvePercentage Percentage increase for curved surfaces (25-50)
 * @returns Base64 data URL of the QR code image
 */
export async function generateCurvedSurfaceQRCode(
  data: string,
  curvePercentage = 25
): Promise<string> {
  const baseSize = 177;
  const increasedSize = Math.round(baseSize * (1 + curvePercentage / 100));
  
  return generateQRCode(data, { size: increasedSize });
}

/**
 * Generate a batch of QR codes
 * @param items Array of items to generate QR codes for
 * @returns Array of QR code data URLs
 */
export async function generateBatchQRCodes(
  items: Array<{ id: string; code: string }>
): Promise<Array<{ id: string; code: string; qrCode: string }>> {
  const results = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      code: item.code,
      qrCode: await generateProductQRCode(item.code),
    }))
  );
  
  return results;
}

/**
 * Validate QR code data format
 * @param data The QR code data to validate
 * @returns True if valid, false otherwise
 */
export function validateQRCodeData(data: string): boolean {
  // Check if it's a valid URL format
  try {
    const url = new URL(data);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return /^PB\d{10,}$/.test(data) || /^PB_[A-Z0-9-]+_\d{4}$/.test(data);
  }
}