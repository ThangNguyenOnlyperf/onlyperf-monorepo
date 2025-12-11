'use server';

import { db } from '~/server/db';
import { bundles, bundleItems, products, inventory, user } from '~/server/db/schema';
import { generateShortCode } from '~/lib/product-code';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import type { ActionResult, BundleStatus, ProductRelation, UserRelation } from './types';
import type { PaginationParams, PaginatedResult } from '~/lib/queries/paginateQuery';
import { requireOrgContext } from '~/lib/authorization';
import { getActionErrorMessage } from '~/lib/error-handling';

// Types for Bundles
export type Bundle = typeof bundles.$inferSelect;
export type BundleItem = typeof bundleItems.$inferSelect;

export interface BundleItemInput {
  productId: string;
  expectedCount: number;
  phaseOrder: number;
}

export interface BundleWithItems extends Bundle {
  items: (BundleItem & {
    product: ProductRelation | null;
  })[];
  createdByUser: UserRelation | null;
  assembledByUser: UserRelation | null;
  _count: {
    inventoryItems: number;
  };
}

export interface BundleListItem extends Bundle {
  _count: {
    items: number;
    inventoryItems: number;
  };
  totalExpected: number;
  totalScanned: number;
}

export interface BundleFilters {
  status?: BundleStatus;
  search?: string;
}

/**
 * Create a new bundle with its items
 */
export async function createBundleAction(data: {
  name: string;
  items: BundleItemInput[];
}): Promise<ActionResult<Bundle>> {
  try {
    const { organizationId, userId } = await requireOrgContext({
      permissions: ['create:bundles']
    });

    if (!data.name.trim()) {
      return {
        success: false,
        message: 'Tên lô hàng không được để trống',
      };
    }

    if (data.items.length === 0) {
      return {
        success: false,
        message: 'Lô hàng phải có ít nhất một sản phẩm',
      };
    }

    // Validate all products exist
    const productIds = data.items.map(item => item.productId);
    const existingProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          inArray(products.id, productIds)
        )
      );

    if (existingProducts.length !== productIds.length) {
      return {
        success: false,
        message: 'Một số sản phẩm không tồn tại trong hệ thống',
      };
    }

    // Generate unique QR code for the bundle
    const existingCodes = await db
      .select({ qrCode: bundles.qrCode })
      .from(bundles)
      .where(eq(bundles.organizationId, organizationId));

    const existingSet = new Set(existingCodes.map(c => c.qrCode));
    let qrCode = generateShortCode();
    let attempts = 0;
    while (existingSet.has(qrCode) && attempts < 100) {
      qrCode = generateShortCode();
      attempts++;
    }

    if (existingSet.has(qrCode)) {
      return {
        success: false,
        message: 'Không thể tạo mã QR duy nhất, vui lòng thử lại',
      };
    }

    // Create bundle and items in a transaction
    const [created] = await db.transaction(async (tx) => {
      // Create bundle
      const [bundle] = await tx
        .insert(bundles)
        .values({
          organizationId,
          name: data.name.trim(),
          qrCode,
          status: 'pending',
          currentPhaseIndex: 0,
          createdBy: userId,
        })
        .returning();

      if (!bundle) {
        throw new Error('Failed to create bundle');
      }

      // Create bundle items
      const bundleItemsData = data.items.map(item => ({
        bundleId: bundle.id,
        productId: item.productId,
        expectedCount: item.expectedCount,
        scannedCount: 0,
        phaseOrder: item.phaseOrder,
      }));

      await tx.insert(bundleItems).values(bundleItemsData);

      return [bundle];
    });

    return {
      success: true,
      message: 'Đã tạo lô hàng thành công',
      data: created,
    };
  } catch (error) {
    console.error('createBundleAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể tạo lô hàng'),
    };
  }
}

/**
 * Get bundles list with pagination
 */
export async function getBundlesAction(
  filters?: BundleFilters,
  pagination?: PaginationParams
): Promise<ActionResult<PaginatedResult<BundleListItem>>> {
  try {
    const { organizationId } = await requireOrgContext();

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [eq(bundles.organizationId, organizationId)];

    if (filters?.status) {
      conditions.push(eq(bundles.status, filters.status));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bundles)
      .where(whereClause);

    const totalItems = countResult?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get bundles with aggregates
    const bundlesData = await db
      .select({
        id: bundles.id,
        organizationId: bundles.organizationId,
        qrCode: bundles.qrCode,
        name: bundles.name,
        status: bundles.status,
        currentPhaseIndex: bundles.currentPhaseIndex,
        assemblyStartedAt: bundles.assemblyStartedAt,
        assemblyCompletedAt: bundles.assemblyCompletedAt,
        assembledBy: bundles.assembledBy,
        createdBy: bundles.createdBy,
        createdAt: bundles.createdAt,
      })
      .from(bundles)
      .where(whereClause)
      .orderBy(desc(bundles.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Get bundle items counts and inventory counts for each bundle
    const bundleIds = bundlesData.map(b => b.id);

    let itemsCounts: { bundleId: string; itemCount: number; totalExpected: number; totalScanned: number }[] = [];
    let inventoryCounts: { bundleId: string | null; inventoryCount: number }[] = [];

    if (bundleIds.length > 0) {
      itemsCounts = await db
        .select({
          bundleId: bundleItems.bundleId,
          itemCount: sql<number>`count(*)::int`,
          totalExpected: sql<number>`COALESCE(SUM(${bundleItems.expectedCount}), 0)::int`,
          totalScanned: sql<number>`COALESCE(SUM(${bundleItems.scannedCount}), 0)::int`,
        })
        .from(bundleItems)
        .where(inArray(bundleItems.bundleId, bundleIds))
        .groupBy(bundleItems.bundleId);

      inventoryCounts = await db
        .select({
          bundleId: inventory.bundleId,
          inventoryCount: sql<number>`count(*)::int`,
        })
        .from(inventory)
        .where(inArray(inventory.bundleId, bundleIds))
        .groupBy(inventory.bundleId);
    }

    const itemsCountMap = new Map(itemsCounts.map(c => [c.bundleId, c]));
    const inventoryCountMap = new Map(inventoryCounts.map(c => [c.bundleId, c.inventoryCount]));

    const data: BundleListItem[] = bundlesData.map(bundle => ({
      ...bundle,
      _count: {
        items: itemsCountMap.get(bundle.id)?.itemCount ?? 0,
        inventoryItems: inventoryCountMap.get(bundle.id) ?? 0,
      },
      totalExpected: itemsCountMap.get(bundle.id)?.totalExpected ?? 0,
      totalScanned: itemsCountMap.get(bundle.id)?.totalScanned ?? 0,
    }));

    return {
      success: true,
      message: 'Lấy danh sách lô hàng thành công',
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
    console.error('getBundlesAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy danh sách lô hàng'),
    };
  }
}

/**
 * Get bundle detail with items
 */
export async function getBundleDetailAction(
  bundleId: string
): Promise<ActionResult<BundleWithItems | null>> {
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
        data: null,
      };
    }

    // Get bundle items with product info
    const items = await db
      .select({
        id: bundleItems.id,
        bundleId: bundleItems.bundleId,
        productId: bundleItems.productId,
        expectedCount: bundleItems.expectedCount,
        scannedCount: bundleItems.scannedCount,
        phaseOrder: bundleItems.phaseOrder,
        product: {
          id: products.id,
          name: products.name,
          brand: products.brand,
          model: products.model,
        },
      })
      .from(bundleItems)
      .leftJoin(products, eq(bundleItems.productId, products.id))
      .where(eq(bundleItems.bundleId, bundleId))
      .orderBy(bundleItems.phaseOrder);

    // Get inventory count
    const [inventoryCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(eq(inventory.bundleId, bundleId));

    // Get created by user
    let createdByUser = null;
    if (bundle.createdBy) {
      const [u] = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, bundle.createdBy))
        .limit(1);
      createdByUser = u ?? null;
    }

    // Get assembled by user
    let assembledByUser = null;
    if (bundle.assembledBy) {
      const [u] = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, bundle.assembledBy))
        .limit(1);
      assembledByUser = u ?? null;
    }

    const result: BundleWithItems = {
      ...bundle,
      items: items as BundleWithItems['items'],
      createdByUser,
      assembledByUser,
      _count: {
        inventoryItems: inventoryCount?.count ?? 0,
      },
    };

    return {
      success: true,
      message: 'Lấy chi tiết lô hàng thành công',
      data: result,
    };
  } catch (error) {
    console.error('getBundleDetailAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy chi tiết lô hàng'),
    };
  }
}

/**
 * Delete a bundle (only if pending status)
 */
export async function deleteBundleAction(
  bundleId: string
): Promise<ActionResult<void>> {
  try {
    const { organizationId } = await requireOrgContext({
      permissions: ['delete:bundles']
    });

    // Check bundle exists and is pending
    const [bundle] = await db
      .select({ id: bundles.id, status: bundles.status })
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

    if (bundle.status !== 'pending') {
      return {
        success: false,
        message: 'Chỉ có thể xóa lô hàng ở trạng thái chờ xử lý',
      };
    }

    // Delete bundle (cascade will delete bundleItems)
    await db
      .delete(bundles)
      .where(eq(bundles.id, bundleId));

    return {
      success: true,
      message: 'Đã xóa lô hàng thành công',
    };
  } catch (error) {
    console.error('deleteBundleAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể xóa lô hàng'),
    };
  }
}

/**
 * Get products for bundle creation (ball packs)
 */
export async function getProductsForBundleAction(): Promise<ActionResult<{
  id: string;
  name: string;
  brand: string;
  model: string;
  packSize: number | null;
}[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    // Get products that can be bundled (ball packs, paddles, etc.)
    const productsList = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        model: products.model,
        packSize: products.packSize,
      })
      .from(products)
      .where(eq(products.organizationId, organizationId))
      .orderBy(products.name);

    return {
      success: true,
      message: 'Lấy danh sách sản phẩm thành công',
      data: productsList,
    };
  } catch (error) {
    console.error('getProductsForBundleAction error:', error);
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy danh sách sản phẩm'),
    };
  }
}
