'use server';

import { db } from '~/server/db';
import { shipments, shipmentItems, products } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  generateTemplatePDFWithQRCodes,
  generateTemplatePDFBase64,
  convertToQRCodeItems,
  type QRCodeItem,
  type PDFGenerationOptions,
} from '~/lib/pdf-template-overlay';
import type { ActionResult } from './types';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';

/**
 * Result type for PDF generation
 */
export interface PDFGenerationResult {
  pdfBase64: string;
  itemCount: number;
  pageCount: number;
}

/**
 * Generate template-based PDF for a shipment
 * Returns base64-encoded PDF for client-side download
 */
export async function generateShipmentTemplatePDFAction(
  shipmentId: string,
  options?: PDFGenerationOptions
): Promise<ActionResult<PDFGenerationResult>> {
  try {
    const { organizationId, userId, userName } = await requireOrgContext();

    logger.info(
      { userId, userName, organizationId, shipmentId },
      `User ${userName} generating template PDF for shipment`
    );

    // Fetch shipment with items (must be in same org)
    const shipment = await db.query.shipments.findFirst({
      where: and(
        eq(shipments.id, shipmentId),
        eq(shipments.organizationId, organizationId)
      ),
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
        { userId, userName, organizationId, shipmentId },
        `Shipment not found for user ${userName}`
      );
      return {
        success: false,
        error: 'Không tìm thấy lô hàng',
      };
    }

    // Type assertion for items
    const items = shipment.items as Array<{
      id: string;
      qrCode: string | null;
      productId: string;
      quantity: number;
      product?: any;
    }>;

    if (!items || items.length === 0) {
      logger.warn(
        { userId, userName, organizationId, shipmentId },
        `Shipment has no items for user ${userName}`
      );
      return {
        success: false,
        error: 'Lô hàng không có sản phẩm',
      };
    }

    // Filter items that have QR codes
    const itemsWithQR = items.filter((item): item is typeof item & { qrCode: string } =>
      item.qrCode !== null && item.qrCode !== undefined
    );

    if (itemsWithQR.length === 0) {
      logger.warn(
        { userId, userName, organizationId, shipmentId },
        `Shipment has no items with QR codes for user ${userName}`
      );
      return {
        success: false,
        error: 'Không có sản phẩm nào có mã QR',
      };
    }

    // Convert to QRCodeItem format
    const qrItems = convertToQRCodeItems(
      itemsWithQR.map((item) => ({
        id: item.id,
        qrCode: item.qrCode!,
      }))
    );

    // Generate PDF
    const pdfBase64 = await generateTemplatePDFBase64(qrItems, options);

    // Calculate page count (44 slots per page)
    const pageCount = Math.ceil(qrItems.length / 44);

    logger.info(
      {
        userId,
        userName,
        organizationId,
        shipmentId,
        itemCount: qrItems.length,
        pageCount,
      },
      `User ${userName} successfully generated template PDF`
    );

    return {
      success: true,
      data: {
        pdfBase64,
        itemCount: qrItems.length,
        pageCount,
      },
      message: `Đã tạo PDF với ${qrItems.length} mã QR trên ${pageCount} trang`,
    };
  } catch (error) {
    logger.error(
      { shipmentId, error },
      'Error generating template PDF'
    );

    console.error('Error generating template PDF:', error);
    return {
      success: false,
      error: 'Lỗi khi tạo PDF. Vui lòng thử lại.',
    };
  }
}

/**
 * Generate template-based PDF and return as buffer (for download/streaming)
 */
export async function generateShipmentTemplatePDFBufferAction(
  shipmentId: string,
  options?: PDFGenerationOptions
): Promise<Buffer | null> {
  try {
    const { organizationId, userId, userName } = await requireOrgContext();

    // Fetch shipment with items (must be in same org)
    const shipment = await db.query.shipments.findFirst({
      where: and(
        eq(shipments.id, shipmentId),
        eq(shipments.organizationId, organizationId)
      ),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!shipment) {
      return null;
    }

    // Type assertion for items
    const items = shipment.items as Array<{
      id: string;
      qrCode: string | null;
      productId: string;
      quantity: number;
      product?: any;
    }>;

    if (!items || items.length === 0) {
      return null;
    }

    // Filter items that have QR codes
    const itemsWithQR = items.filter((item): item is typeof item & { qrCode: string } =>
      item.qrCode !== null && item.qrCode !== undefined
    );

    if (itemsWithQR.length === 0) {
      return null;
    }

    // Convert to QRCodeItem format
    const qrItems = convertToQRCodeItems(
      itemsWithQR.map((item) => ({
        id: item.id,
        qrCode: item.qrCode!,
      }))
    );

    // Generate PDF buffer
    const pdfBuffer = await generateTemplatePDFWithQRCodes(qrItems, options);

    logger.info(
      {
        userId,
        userName,
        organizationId,
        shipmentId,
        itemCount: qrItems.length,
        bufferSize: pdfBuffer.length,
      },
      `User ${userName} generated template PDF buffer`
    );

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating template PDF buffer:', error);
    return null;
  }
}
