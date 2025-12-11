'use server';

import { db } from '~/server/db';
import { qrPool } from '~/server/db/schema';
import { generateShortCode } from '~/lib/product-code';
import { eq, desc, sql, and } from 'drizzle-orm';
import type { ActionResult, QRPoolStatus } from './types';
import type { PaginationParams, PaginatedResult } from '~/lib/queries/paginateQuery';
import { requireOrgContext } from '~/lib/authorization';
import { getActionErrorMessage } from '~/lib/error-handling';
import { getQRPoolPDFMeta, type PDFFileMeta } from '~/lib/qr-pool-pdf-generator';

// Types for QR Pool
export type QRPoolItem = typeof qrPool.$inferSelect;

export interface QRPoolStats {
  available: number;
  used: number;
  total: number;
}

export interface QRBatch {
  batchId: string;
  generatedAt: Date;
  count: number;
  availableCount: number;
}

/**
 * Generate a batch of generic QR codes in the pool
 */
export async function generateQRPoolBatchAction(
  quantity: number
): Promise<ActionResult<{ batchId: string; count: number }>> {
  try {
    const { organizationId, userName } = await requireOrgContext({
      permissions: ['create:qr-pool']
    });

    if (quantity < 1 || quantity > 10000) {
      return {
        success: false,
        message: 'Số lượng phải từ 1 đến 10,000',
      };
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const generatedAt = new Date();

    // Generate unique QR codes
    const existingCodes = await db
      .select({ qrCode: qrPool.qrCode })
      .from(qrPool)
      .where(eq(qrPool.organizationId, organizationId));

    const existingSet = new Set(existingCodes.map(c => c.qrCode));

    const newQRCodes: (typeof qrPool.$inferInsert)[] = [];
    let attempts = 0;
    const maxAttempts = quantity * 3;

    while (newQRCodes.length < quantity && attempts < maxAttempts) {
      const code = generateShortCode();
      if (!existingSet.has(code)) {
        existingSet.add(code);
        newQRCodes.push({
          organizationId,
          qrCode: code,
          status: 'available',
          batchId,
          generatedAt,
        });
      }
      attempts++;
    }

    if (newQRCodes.length < quantity) {
      return {
        success: false,
        message: `Chỉ tạo được ${newQRCodes.length}/${quantity} mã QR (không đủ mã duy nhất)`,
      };
    }

    // Insert in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < newQRCodes.length; i += batchSize) {
      const batch = newQRCodes.slice(i, i + batchSize);
      await db.insert(qrPool).values(batch);
    }

    return {
      success: true,
      message: `Đã tạo ${quantity} mã QR thành công`,
      data: { batchId, count: quantity },
    };
  } catch (error) {
    console.error('generateQRPoolBatchAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể tạo mã QR'),
    };
  }
}

/**
 * Get QR Pool statistics
 */
export async function getQRPoolStatsAction(): Promise<ActionResult<QRPoolStats>> {
  try {
    const { organizationId } = await requireOrgContext();

    const stats = await db
      .select({
        status: qrPool.status,
        count: sql<number>`count(*)::int`,
      })
      .from(qrPool)
      .where(eq(qrPool.organizationId, organizationId))
      .groupBy(qrPool.status);

    const result: QRPoolStats = {
      available: 0,
      used: 0,
      total: 0,
    };

    for (const stat of stats) {
      if (stat.status === 'available') {
        result.available = stat.count;
      } else if (stat.status === 'used') {
        result.used = stat.count;
      }
      result.total += stat.count;
    }

    return {
      success: true,
      message: 'Lấy thống kê thành công',
      data: result,
    };
  } catch (error) {
    console.error('getQRPoolStatsAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy thống kê QR Pool'),
    };
  }
}

/**
 * Get QR Pool list with pagination
 */
export async function getQRPoolListAction(
  filters?: { status?: 'available' | 'used'; batchId?: string },
  pagination?: PaginationParams
): Promise<ActionResult<PaginatedResult<QRPoolItem>>> {
  try {
    const { organizationId } = await requireOrgContext();

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [eq(qrPool.organizationId, organizationId)];
    if (filters?.status) {
      conditions.push(eq(qrPool.status, filters.status));
    }
    if (filters?.batchId) {
      conditions.push(eq(qrPool.batchId, filters.batchId));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(qrPool)
      .where(whereClause);

    const totalItems = countResult?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated data
    const data = await db
      .select()
      .from(qrPool)
      .where(whereClause)
      .orderBy(desc(qrPool.generatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      success: true,
      message: 'Lấy danh sách QR thành công',
      data: {
        data,
        metadata: {
          currentPage: page,
          pageSize,
          totalPages,
          totalItems,
        },
      },
    };
  } catch (error) {
    console.error('getQRPoolListAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy danh sách QR'),
    };
  }
}

/**
 * Get QR batch history
 */
export async function getQRBatchesAction(): Promise<ActionResult<QRBatch[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    const batches = await db
      .select({
        batchId: qrPool.batchId,
        generatedAt: sql<Date>`MIN(${qrPool.generatedAt})`.as('generatedAt'),
        count: sql<number>`count(*)::int`,
        availableCount: sql<number>`SUM(CASE WHEN ${qrPool.status} = 'available' THEN 1 ELSE 0 END)::int`.as('availableCount'),
      })
      .from(qrPool)
      .where(eq(qrPool.organizationId, organizationId))
      .groupBy(qrPool.batchId)
      .orderBy(desc(sql`MIN(${qrPool.generatedAt})`));

    // Filter out null batchIds and cast to proper type
    const result: QRBatch[] = batches
      .filter(b => b.batchId !== null)
      .map(b => ({
        batchId: b.batchId!,
        generatedAt: b.generatedAt,
        count: b.count,
        availableCount: b.availableCount,
      }));

    return {
      success: true,
      message: 'Lấy lịch sử batch thành công',
      data: result,
    };
  } catch (error) {
    console.error('getQRBatchesAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy lịch sử batch'),
    };
  }
}

/**
 * Get a single QR code from the pool (for validation)
 */
export async function getQRPoolItemAction(
  qrCode: string
): Promise<ActionResult<QRPoolItem | null>> {
  try {
    const { organizationId } = await requireOrgContext();

    const [item] = await db
      .select()
      .from(qrPool)
      .where(
        and(
          eq(qrPool.organizationId, organizationId),
          eq(qrPool.qrCode, qrCode)
        )
      )
      .limit(1);

    return {
      success: true,
      message: item ? 'Tìm thấy QR' : 'Không tìm thấy QR',
      data: item ?? null,
    };
  } catch (error) {
    console.error('getQRPoolItemAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể tìm mã QR'),
    };
  }
}

/**
 * Get PDF file metadata for a QR batch
 * Returns info about how many PDF files will be generated
 */
export async function getQRPoolBatchPDFMetaAction(
  batchId: string
): Promise<ActionResult<{ batchId: string; totalQRs: number; files: PDFFileMeta[] }>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get count of QR codes in this batch
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(qrPool)
      .where(
        and(
          eq(qrPool.organizationId, organizationId),
          eq(qrPool.batchId, batchId)
        )
      );

    const totalQRs = countResult?.count ?? 0;

    if (totalQRs === 0) {
      return {
        success: false,
        message: 'Không tìm thấy batch hoặc batch rỗng',
      };
    }

    // Get generatedAt from batch (query first QR code)
    const [firstQR] = await db
      .select({ generatedAt: qrPool.generatedAt })
      .from(qrPool)
      .where(
        and(
          eq(qrPool.organizationId, organizationId),
          eq(qrPool.batchId, batchId)
        )
      )
      .limit(1);

    const generatedAt = firstQR?.generatedAt ?? new Date();

    // Get PDF file metadata
    const files = getQRPoolPDFMeta(totalQRs, batchId, generatedAt);

    return {
      success: true,
      message: `Batch có ${totalQRs} mã QR, tạo ${files.length} file PDF`,
      data: {
        batchId,
        totalQRs,
        files,
      },
    };
  } catch (error) {
    console.error('getQRPoolBatchPDFMetaAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy thông tin PDF'),
    };
  }
}
