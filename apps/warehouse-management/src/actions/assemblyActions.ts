'use server';

import { db } from '~/server/db';
import { bundles, bundleItems, products, qrPool, inventory } from '~/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { ActionResult, ProductRelationWithPackSize } from './types';
import { requireOrgContext } from '~/lib/authorization';
import { getActionErrorMessage } from '~/lib/error-handling';

// Types for Assembly
export interface AssemblyBundle {
  id: string;
  name: string;
  qrCode: string;
  status: string;
  currentPhaseIndex: number;
  assemblyStartedAt: Date | null;
}

export interface AssemblyBundleItem {
  id: string;
  productId: string;
  expectedCount: number;
  scannedCount: number;
  phaseOrder: number;
  product: ProductRelationWithPackSize | null;
}

export interface AssemblySession {
  bundle: AssemblyBundle;
  items: AssemblyBundleItem[];
  currentItem: AssemblyBundleItem | null;
}

export interface ScanResult {
  success: boolean;
  scannedCount: number;
  expectedCount: number;
  isPhaseComplete: boolean;
  isAllComplete: boolean;
  productName: string;
}

/**
 * Start an assembly session by scanning the bundle QR code
 */
export async function startAssemblySessionAction(
  bundleQRCode: string
): Promise<ActionResult<AssemblySession>> {
  try {
    const { organizationId, userId } = await requireOrgContext();

    // Find bundle by QR code
    const [bundle] = await db
      .select()
      .from(bundles)
      .where(
        and(
          eq(bundles.organizationId, organizationId),
          eq(bundles.qrCode, bundleQRCode)
        )
      )
      .limit(1);

    if (!bundle) {
      return {
        success: false,
        message: 'Không tìm thấy lô hàng với mã QR này',
      };
    }

    if (bundle.status === 'completed') {
      return {
        success: false,
        message: 'Lô hàng này đã hoàn thành lắp ráp',
      };
    }

    if (bundle.status === 'sold') {
      return {
        success: false,
        message: 'Lô hàng này đã được bán',
      };
    }

    // Get bundle items with product info, ordered by phase
    const items = await db
      .select({
        id: bundleItems.id,
        productId: bundleItems.productId,
        expectedCount: bundleItems.expectedCount,
        scannedCount: bundleItems.scannedCount,
        phaseOrder: bundleItems.phaseOrder,
        product: {
          id: products.id,
          name: products.name,
          brand: products.brand,
          model: products.model,
          packSize: products.packSize,
        },
      })
      .from(bundleItems)
      .leftJoin(products, eq(bundleItems.productId, products.id))
      .where(eq(bundleItems.bundleId, bundle.id))
      .orderBy(asc(bundleItems.phaseOrder));

    if (items.length === 0) {
      return {
        success: false,
        message: 'Lô hàng không có sản phẩm nào',
      };
    }

    // If bundle is pending, start the assembly session
    if (bundle.status === 'pending') {
      await db
        .update(bundles)
        .set({
          status: 'assembling',
          assemblyStartedAt: new Date(),
          assembledBy: userId,
        })
        .where(eq(bundles.id, bundle.id));
    }

    // Get current item based on currentPhaseIndex
    const currentItem = items[bundle.currentPhaseIndex] ?? null;

    return {
      success: true,
      message: 'Bắt đầu phiên lắp ráp',
      data: {
        bundle: {
          id: bundle.id,
          name: bundle.name,
          qrCode: bundle.qrCode,
          status: bundle.status === 'pending' ? 'assembling' : bundle.status,
          currentPhaseIndex: bundle.currentPhaseIndex,
          assemblyStartedAt: bundle.assemblyStartedAt,
        },
        items: items as AssemblyBundleItem[],
        currentItem,
      },
    };
  } catch (error) {
    console.error('startAssemblySessionAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể bắt đầu phiên lắp ráp'),
    };
  }
}

/**
 * Scan a pack QR code during assembly
 */
export async function scanAssemblyQRAction(
  bundleId: string,
  packQRCode: string
): Promise<ActionResult<ScanResult>> {
  try {
    const { organizationId, userId } = await requireOrgContext();

    // Get bundle
    const [bundle] = await db
      .select()
      .from(bundles)
      .where(
        and(
          eq(bundles.organizationId, organizationId),
          eq(bundles.id, bundleId)
        )
      )
      .limit(1);

    if (!bundle) {
      return {
        success: false,
        message: 'Không tìm thấy lô hàng',
      };
    }

    if (bundle.status !== 'assembling') {
      return {
        success: false,
        message: 'Lô hàng không ở trạng thái lắp ráp',
      };
    }

    // Check if QR exists in qrPool and is available
    const [qrItem] = await db
      .select()
      .from(qrPool)
      .where(
        and(
          eq(qrPool.organizationId, organizationId),
          eq(qrPool.qrCode, packQRCode)
        )
      )
      .limit(1);

    if (!qrItem) {
      return {
        success: false,
        message: 'Mã QR không tồn tại trong hệ thống',
      };
    }

    if (qrItem.status !== 'available') {
      return {
        success: false,
        message: 'Mã QR đã được sử dụng',
      };
    }

    // Get bundle items ordered by phase
    const items = await db
      .select({
        id: bundleItems.id,
        productId: bundleItems.productId,
        expectedCount: bundleItems.expectedCount,
        scannedCount: bundleItems.scannedCount,
        phaseOrder: bundleItems.phaseOrder,
        productName: products.name,
      })
      .from(bundleItems)
      .leftJoin(products, eq(bundleItems.productId, products.id))
      .where(eq(bundleItems.bundleId, bundleId))
      .orderBy(asc(bundleItems.phaseOrder));

    // Get current bundle item
    const currentItem = items[bundle.currentPhaseIndex];
    if (!currentItem) {
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm hiện tại',
      };
    }

    // Check if current phase is already complete
    if (currentItem.scannedCount >= currentItem.expectedCount) {
      return {
        success: false,
        message: 'Pha hiện tại đã hoàn thành. Vui lòng chuyển sang pha tiếp theo.',
      };
    }

    // Transaction: mark QR as used, create inventory item, update scanned count
    await db.transaction(async (tx) => {
      // Mark QR as used
      await tx
        .update(qrPool)
        .set({
          status: 'used',
          usedAt: new Date(),
        })
        .where(eq(qrPool.id, qrItem.id));

      // Create inventory item
      await tx.insert(inventory).values({
        organizationId,
        qrCode: packQRCode,
        productId: currentItem.productId,
        status: 'in_stock',
        sourceType: 'assembly',
        bundleId,
        createdBy: userId,
      });

      // Increment scanned count
      await tx
        .update(bundleItems)
        .set({
          scannedCount: currentItem.scannedCount + 1,
        })
        .where(eq(bundleItems.id, currentItem.id));
    });

    const newScannedCount = currentItem.scannedCount + 1;
    const isPhaseComplete = newScannedCount >= currentItem.expectedCount;

    // Check if all phases are complete
    const isAllComplete = isPhaseComplete && bundle.currentPhaseIndex >= items.length - 1;

    return {
      success: true,
      message: `Đã quét ${newScannedCount}/${currentItem.expectedCount}`,
      data: {
        success: true,
        scannedCount: newScannedCount,
        expectedCount: currentItem.expectedCount,
        isPhaseComplete,
        isAllComplete,
        productName: currentItem.productName ?? '',
      },
    };
  } catch (error) {
    console.error('scanAssemblyQRAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể quét mã QR'),
    };
  }
}

/**
 * Confirm phase transition to next phase
 */
export async function confirmPhaseTransitionAction(
  bundleId: string
): Promise<ActionResult<{ newPhaseIndex: number; isComplete: boolean }>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get bundle
    const [bundle] = await db
      .select()
      .from(bundles)
      .where(
        and(
          eq(bundles.organizationId, organizationId),
          eq(bundles.id, bundleId)
        )
      )
      .limit(1);

    if (!bundle) {
      return {
        success: false,
        message: 'Không tìm thấy lô hàng',
      };
    }

    // Get total number of phases
    const items = await db
      .select({ id: bundleItems.id })
      .from(bundleItems)
      .where(eq(bundleItems.bundleId, bundleId));

    const totalPhases = items.length;
    const newPhaseIndex = bundle.currentPhaseIndex + 1;

    if (newPhaseIndex >= totalPhases) {
      // All phases complete, but don't mark as completed yet
      return {
        success: true,
        message: 'Đã hoàn thành tất cả các pha',
        data: {
          newPhaseIndex: bundle.currentPhaseIndex,
          isComplete: true,
        },
      };
    }

    // Move to next phase
    await db
      .update(bundles)
      .set({
        currentPhaseIndex: newPhaseIndex,
      })
      .where(eq(bundles.id, bundleId));

    return {
      success: true,
      message: 'Đã chuyển sang pha tiếp theo',
      data: {
        newPhaseIndex,
        isComplete: false,
      },
    };
  } catch (error) {
    console.error('confirmPhaseTransitionAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể chuyển pha'),
    };
  }
}

/**
 * Complete the assembly session
 */
export async function completeAssemblyAction(
  bundleId: string
): Promise<ActionResult<void>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get bundle
    const [bundle] = await db
      .select()
      .from(bundles)
      .where(
        and(
          eq(bundles.organizationId, organizationId),
          eq(bundles.id, bundleId)
        )
      )
      .limit(1);

    if (!bundle) {
      return {
        success: false,
        message: 'Không tìm thấy lô hàng',
      };
    }

    // Verify all items are complete
    const items = await db
      .select({
        expectedCount: bundleItems.expectedCount,
        scannedCount: bundleItems.scannedCount,
      })
      .from(bundleItems)
      .where(eq(bundleItems.bundleId, bundleId));

    const allComplete = items.every(item => item.scannedCount >= item.expectedCount);

    if (!allComplete) {
      return {
        success: false,
        message: 'Chưa hoàn thành tất cả các sản phẩm',
      };
    }

    // Mark bundle as completed
    await db
      .update(bundles)
      .set({
        status: 'completed',
        assemblyCompletedAt: new Date(),
      })
      .where(eq(bundles.id, bundleId));

    return {
      success: true,
      message: 'Đã hoàn thành lắp ráp lô hàng',
    };
  } catch (error) {
    console.error('completeAssemblyAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể hoàn thành lắp ráp'),
    };
  }
}

/**
 * Get assembly session state (for refreshing)
 */
export async function getAssemblySessionAction(
  bundleId: string
): Promise<ActionResult<AssemblySession>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get bundle
    const [bundle] = await db
      .select()
      .from(bundles)
      .where(
        and(
          eq(bundles.organizationId, organizationId),
          eq(bundles.id, bundleId)
        )
      )
      .limit(1);

    if (!bundle) {
      return {
        success: false,
        message: 'Không tìm thấy lô hàng',
      };
    }

    // Get bundle items with product info
    const items = await db
      .select({
        id: bundleItems.id,
        productId: bundleItems.productId,
        expectedCount: bundleItems.expectedCount,
        scannedCount: bundleItems.scannedCount,
        phaseOrder: bundleItems.phaseOrder,
        product: {
          id: products.id,
          name: products.name,
          brand: products.brand,
          model: products.model,
          packSize: products.packSize,
        },
      })
      .from(bundleItems)
      .leftJoin(products, eq(bundleItems.productId, products.id))
      .where(eq(bundleItems.bundleId, bundle.id))
      .orderBy(asc(bundleItems.phaseOrder));

    const currentItem = items[bundle.currentPhaseIndex] ?? null;

    return {
      success: true,
      message: 'Lấy trạng thái phiên lắp ráp thành công',
      data: {
        bundle: {
          id: bundle.id,
          name: bundle.name,
          qrCode: bundle.qrCode,
          status: bundle.status,
          currentPhaseIndex: bundle.currentPhaseIndex,
          assemblyStartedAt: bundle.assemblyStartedAt,
        },
        items: items as AssemblyBundleItem[],
        currentItem,
      },
    };
  } catch (error) {
    console.error('getAssemblySessionAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy trạng thái phiên lắp ráp'),
    };
  }
}
