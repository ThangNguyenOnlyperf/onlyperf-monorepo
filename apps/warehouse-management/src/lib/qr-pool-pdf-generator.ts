import {
  generateTemplatePDFWithQRCodes,
  type QRCodeItem,
} from "./pdf-template-overlay";

const DEFAULT_BATCH_SIZE = 100;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://onlyperf.com";

/**
 * Metadata for a single PDF file in a batched generation
 */
export interface PDFFileMeta {
  fileNumber: number;
  totalFiles: number;
  qrCount: number;
  filename: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Result of generating a single batched PDF
 */
export interface BatchedPDFResult extends PDFFileMeta {
  pdfBuffer: Buffer;
}

/**
 * QR code data from the pool
 */
interface QRPoolItem {
  qrCode: string;
  id?: string;
}

/**
 * Split an array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Generate filename for a PDF file in a batch
 * Format: {YYYY-MM-DD}-{shortId}.pdf
 * For multi-part: {YYYY-MM-DD}-{shortId}-part-{number}.pdf
 */
function generateFilename(
  batchId: string,
  fileNumber: number,
  totalFiles: number,
  generatedAt: Date
): string {
  // Use short batch ID for cleaner filenames
  const shortBatchId = batchId.length > 12 ? batchId.slice(-12) : batchId;
  const dateStr = formatDateForFilename(generatedAt);

  if (totalFiles === 1) {
    return `${dateStr}-${shortBatchId}.pdf`;
  }

  // Pad file number for proper sorting (001, 002, etc.)
  const paddedNumber = String(fileNumber).padStart(String(totalFiles).length, "0");
  return `${dateStr}-${shortBatchId}-part-${paddedNumber}.pdf`;
}

/**
 * Convert QR pool items to QRCodeItem format for PDF generation
 */
function toQRCodeItems(qrCodes: QRPoolItem[]): QRCodeItem[] {
  return qrCodes.map((item, index) => ({
    id: item.id ?? `qr-${index}`,
    qrCode: item.qrCode,
    url: `${BASE_URL}/p/${item.qrCode}`,
  }));
}

/**
 * Get metadata about PDF files that would be generated for a batch
 * Useful for UI to show file list before generating
 */
export function getQRPoolPDFMeta(
  qrCount: number,
  batchId: string,
  generatedAt: Date,
  batchSize: number = DEFAULT_BATCH_SIZE
): PDFFileMeta[] {
  const totalFiles = Math.ceil(qrCount / batchSize);
  const files: PDFFileMeta[] = [];

  for (let i = 0; i < totalFiles; i++) {
    const startIndex = i * batchSize;
    const endIndex = Math.min(startIndex + batchSize, qrCount);
    const fileQrCount = endIndex - startIndex;

    files.push({
      fileNumber: i + 1,
      totalFiles,
      qrCount: fileQrCount,
      filename: generateFilename(batchId, i + 1, totalFiles, generatedAt),
      startIndex,
      endIndex,
    });
  }

  return files;
}

/**
 * Generate a single PDF file for a specific file index in a batch
 * Memory efficient - only generates one file at a time
 */
export async function generateQRPoolPDFFile(
  qrCodes: QRPoolItem[],
  batchId: string,
  fileIndex: number, // 1-indexed
  generatedAt: Date,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<BatchedPDFResult> {
  const totalFiles = Math.ceil(qrCodes.length / batchSize);

  if (fileIndex < 1 || fileIndex > totalFiles) {
    throw new Error(`Invalid file index: ${fileIndex}. Must be between 1 and ${totalFiles}`);
  }

  const startIndex = (fileIndex - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, qrCodes.length);
  const chunk = qrCodes.slice(startIndex, endIndex);

  const qrCodeItems = toQRCodeItems(chunk);
  const pdfBuffer = await generateTemplatePDFWithQRCodes(qrCodeItems);

  return {
    fileNumber: fileIndex,
    totalFiles,
    qrCount: chunk.length,
    filename: generateFilename(batchId, fileIndex, totalFiles, generatedAt),
    startIndex,
    endIndex,
    pdfBuffer,
  };
}

/**
 * Generate all PDF files for a batch
 * Warning: For large batches, consider using generateQRPoolPDFFile() one at a time
 * to avoid memory issues
 */
export async function generateAllQRPoolPDFs(
  qrCodes: QRPoolItem[],
  batchId: string,
  generatedAt: Date,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<BatchedPDFResult[]> {
  const chunks = chunkArray(qrCodes, batchSize);
  const totalFiles = chunks.length;
  const results: BatchedPDFResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const qrCodeItems = toQRCodeItems(chunk);
    const pdfBuffer = await generateTemplatePDFWithQRCodes(qrCodeItems);

    results.push({
      fileNumber: i + 1,
      totalFiles,
      qrCount: chunk.length,
      filename: generateFilename(batchId, i + 1, totalFiles, generatedAt),
      startIndex: i * batchSize,
      endIndex: i * batchSize + chunk.length,
      pdfBuffer,
    });
  }

  return results;
}
