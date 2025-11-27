'use server';

import { db } from '~/server/db';
import { shipments, shipmentItems, products } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  generateTemplatePDFWithQRCodes,
  generateTemplatePDFBase64,
  convertToQRCodeItems,
  type QRCodeItem,
  type PDFGenerationOptions,
} from '~/lib/pdf-template-overlay';
import type { ActionResult } from './types';
import { logger, getUserContext } from '~/lib/logger';
import { auth } from '~/lib/auth';
import { headers } from 'next/headers';

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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userContext = getUserContext(session);

    logger.info(
      { ...userContext, shipmentId },
      `User ${userContext.userName} generating template PDF for shipment`
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
        { ...userContext, shipmentId },
        `Shipment has no items for user ${userContext.userName}`
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
        { ...userContext, shipmentId },
        `Shipment has no items with QR codes for user ${userContext.userName}`
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
        ...userContext,
        shipmentId,
        itemCount: qrItems.length,
        pageCount,
      },
      `User ${userContext.userName} successfully generated template PDF`
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userContext = getUserContext(session);

    logger.error(
      { ...userContext, shipmentId, error },
      `Error generating template PDF for user ${userContext.userName}`
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userContext = getUserContext(session);

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
        ...userContext,
        shipmentId,
        itemCount: qrItems.length,
        bufferSize: pdfBuffer.length,
      },
      `User ${userContext.userName} generated template PDF buffer`
    );

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating template PDF buffer:', error);
    return null;
  }
}
