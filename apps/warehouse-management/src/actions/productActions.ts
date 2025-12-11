'use server';

import { nanoid } from 'nanoid';
import { db } from '~/server/db';
import { products, shipmentItems, brands, shopifyProducts, colors } from '~/server/db/schema';
import type { ActionResult } from './types';
import { eq, sql, desc, asc, and, like, or } from 'drizzle-orm';
import type { PaginationParams, PaginatedResult } from '~/lib/queries/paginateQuery';
import { z } from 'zod';
import {
  ProductSchema,
  type ProductFormData,
  type Product,
  type ProductMetrics
} from '~/lib/schemas/productSchema';
import { revalidatePath } from 'next/cache';
import { createShopifyProductFromWarehouse } from '~/lib/shopify/products';
import type { ShopifyProductSyncResult } from '~/lib/shopify/types';
import { logger, getUserContext } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';
import { getActionErrorMessage } from '~/lib/error-handling';

export async function getProductsWithStockAction(
  paginationParams?: PaginationParams
): Promise<ActionResult<PaginatedResult<Product>>> {
  try {
    const { organizationId } = await requireOrgContext();
    const { page = 1, pageSize = 100, sortBy = 'updatedAt', sortOrder = 'desc' } = paginationParams || {};
    const offset = (page - 1) * pageSize;

    // Base query for products with stock
    const baseQuery = db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        brandId: products.brandId,
        model: products.model,
        sku: products.sku,
        qrCode: products.qrCode,
        description: products.description,
        category: products.category,
        // Dynamic attributes as JSONB
        attributes: products.attributes,
        colorName: colors.name,
        colorHex: colors.hex,
        // Product type fields for pack support
        productType: products.productType,
        isPackProduct: products.isPackProduct,
        packSize: products.packSize,
        baseProductId: products.baseProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        totalQuantity: sql<number>`COALESCE(SUM(${shipmentItems.quantity}), 0)::int`,
        availableQuantity: sql<number>`COALESCE(SUM(CASE WHEN ${shipmentItems.status} = 'received' THEN ${shipmentItems.quantity} ELSE 0 END), 0)::int`,
        shopifyProductId: sql<string | null>`max(${shopifyProducts.shopifyProductId})`,
        shopifyVariantId: sql<string | null>`max(${shopifyProducts.shopifyVariantId})`,
        shopifyInventoryItemId: sql<string | null>`max(${shopifyProducts.shopifyInventoryItemId})`,
        shopifyLastSyncedAt: sql<Date | null>`max(${shopifyProducts.lastSyncedAt})`,
        shopifyLastSyncStatus: sql<string | null>`max(${shopifyProducts.lastSyncStatus})`,
        shopifyLastSyncError: sql<string | null>`max(${shopifyProducts.lastSyncError})`,
      })
      .from(products)
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .leftJoin(shipmentItems, eq(shipmentItems.productId, products.id))
      .leftJoin(shopifyProducts, eq(shopifyProducts.productId, products.id))
      .where(eq(products.organizationId, organizationId))
      .groupBy(products.id, colors.name, colors.hex);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(DISTINCT ${products.id})::int` })
      .from(products)
      .where(eq(products.organizationId, organizationId));
    const totalItems = countResult[0]?.count || 0;

    // Apply sorting and pagination
    let finalQuery;
    if (sortBy === 'totalQuantity' || sortBy === 'availableQuantity') {
      // Sort by aggregated columns
      const sortColumn = sortBy === 'totalQuantity' 
        ? sql<number>`COALESCE(SUM(${shipmentItems.quantity}), 0)`
        : sql<number>`COALESCE(SUM(CASE WHEN ${shipmentItems.status} = 'received' THEN ${shipmentItems.quantity} ELSE 0 END), 0)`;
      finalQuery = baseQuery.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
    } else if (sortBy && (products as any)[sortBy]) {
      // Sort by regular columns
      const sortColumn = (products as any)[sortBy];
      finalQuery = baseQuery.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
    } else {
      // Default sort
      finalQuery = baseQuery.orderBy(desc(products.updatedAt));
    }

    const productsWithStock = await finalQuery.limit(pageSize).offset(offset);

    return {
      success: true,
      data: {
        data: productsWithStock,
        metadata: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          totalItems,
        },
      },
      message: 'Lấy danh sách sản phẩm thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching products:');
    return {
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm',
    };
  }
}


export async function createProductAction(data: ProductFormData): Promise<ActionResult<Product>> {
  try {
    // Require authorization to create products (admin or warehouse staff)
    const { organizationId, userId, session } = await requireOrgContext({ permissions: ['create:products'] });
    const userContext = getUserContext(session);

    const validatedData = ProductSchema.parse(data);

    // Get brand name (must be in same org)
    const [brandInfo] = await db
      .select({ name: brands.name })
      .from(brands)
      .where(and(
        eq(brands.id, validatedData.brandId),
        eq(brands.organizationId, organizationId)
      ))
      .limit(1);

    if (!brandInfo) {
      return {
        success: false,
        message: 'Thương hiệu không tồn tại',
      };
    }

    // Look up color info for display in messages (must be in same org)
    const colorId = validatedData.attributes.colorId;
    const [colorInfo] = await db
      .select({ name: colors.name, hex: colors.hex })
      .from(colors)
      .where(and(
        eq(colors.id, colorId),
        eq(colors.organizationId, organizationId)
      ))
      .limit(1);

    if (!colorInfo) {
      return {
        success: false,
        message: 'Màu sắc không tồn tại',
      };
    }

    // Check if product with same brand, model and color exists in this org
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          eq(products.brandId, validatedData.brandId),
          eq(products.model, validatedData.model),
          sql`${products.attributes}->>'colorId' = ${colorId}`
        )
      )
      .limit(1);

    if (existingProduct) {
      return {
        success: false,
        message: `Sản phẩm ${brandInfo.name} ${validatedData.model} (${colorInfo.name}) đã tồn tại`,
      };
    }

    // Create new product
    const productId = `prd_${nanoid()}`;
    const productName = `${brandInfo.name} ${validatedData.model}`;

    logger.info({ ...userContext, organizationId, productName, brand: brandInfo.name, model: validatedData.model, colorId, colorName: colorInfo.name }, `User ${userContext.userName} creating product: ${productName}`);

    const [newProduct] = await db
      .insert(products)
      .values({
        id: productId,
        organizationId,
        name: productName,
        brand: brandInfo.name,
        brandId: validatedData.brandId,
        model: validatedData.model,
        sku: validatedData.sku ?? null,
        description: validatedData.description,
        category: validatedData.category,
        // Dynamic attributes as JSONB
        attributes: validatedData.attributes,
        // Product type fields for pack support
        productType: validatedData.productType ?? 'general',
        isPackProduct: validatedData.isPackProduct ?? false,
        packSize: validatedData.packSize ?? null,
        baseProductId: validatedData.baseProductId ?? null,
        qrCode: null,
      })
      .returning();

    let shopifyMessage = '';

    try {
      // Use color hex from already-fetched colorInfo for Shopify sync
      const syncResult = await createShopifyProductFromWarehouse(
        newProduct!,
        db,
        { colorHex: colorInfo.hex }
      );
      if (syncResult.status === 'success') {
        shopifyMessage = ' và đã đồng bộ với Shopify';
        logger.info({ ...userContext, productId: newProduct!.id, shopifyProductId: syncResult.shopifyProductId }, 'Product synced to Shopify successfully');
      } else if (syncResult.status === 'skipped') {
        shopifyMessage = syncResult.message ? ` (${syncResult.message})` : ' (Sản phẩm đã được đồng bộ với Shopify trước đó)';
      }
    } catch (shopifyError) {
      logger.error({ ...userContext, error: shopifyError, productId: newProduct!.id }, 'Shopify product sync failed');
      const shopifyErrorMessage = shopifyError instanceof Error ? shopifyError.message : 'Lỗi không xác định';
      shopifyMessage = ` nhưng không thể đồng bộ với Shopify: ${shopifyErrorMessage}`;
    }

    logger.info({ ...userContext, productId: newProduct!.id, productName }, `User ${userContext.userName} created product: ${productName} (${productId})`);

    revalidatePath('/products');
    revalidatePath('/shipments/new');
    revalidatePath('/shipments');

    return {
      success: true,
      data: {
        ...newProduct!,
        brandName: brandInfo.name,
      },
      message: `Đã tạo sản phẩm "${productName}" thành công${shopifyMessage}`,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0]?.message || 'Dữ liệu không hợp lệ',
      };
    }

    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message }, 'Không có quyền tạo sản phẩm');
      return {
        success: false,
        message: error.message,
      };
    }

    logger.error({ error }, 'Error creating product:');
    return {
      success: false,
      message: 'Không thể tạo sản phẩm mới',
    };
  }
}


export async function getProductsForSelectionAction(): Promise<ActionResult<Product[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    const productsWithBrands = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        brandId: products.brandId,
        model: products.model,
        sku: products.sku,
        qrCode: products.qrCode,
        description: products.description,
        category: products.category,
        // Dynamic attributes as JSONB
        attributes: products.attributes,
        colorName: colors.name,
        colorHex: colors.hex,
        // Product type fields for pack support
        productType: products.productType,
        isPackProduct: products.isPackProduct,
        packSize: products.packSize,
        baseProductId: products.baseProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        brandName: brands.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .where(eq(products.organizationId, organizationId))
      .orderBy(asc(products.name));

    return {
      success: true,
      data: productsWithBrands.map(p => ({
        ...p,
        brandName: p.brandName ?? p.brand,
      })),
      message: 'Lấy danh sách sản phẩm thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching products for selection:');
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể lấy danh sách sản phẩm'),
    };
  }
}

export async function searchProductsAction(query: string): Promise<ActionResult<Product[]>> {
  try {
    const { organizationId } = await requireOrgContext();
    const searchPattern = `%${query}%`;

    const matchingProducts = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        brandId: products.brandId,
        model: products.model,
        sku: products.sku,
        qrCode: products.qrCode,
        description: products.description,
        category: products.category,
        // Dynamic attributes as JSONB
        attributes: products.attributes,
        colorName: colors.name,
        colorHex: colors.hex,
        // Product type fields for pack support
        productType: products.productType,
        isPackProduct: products.isPackProduct,
        packSize: products.packSize,
        baseProductId: products.baseProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        brandName: brands.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .where(
        and(
          eq(products.organizationId, organizationId),
          or(
            like(products.name, searchPattern),
            like(products.model, searchPattern),
            like(products.brand, searchPattern),
            like(products.sku, searchPattern)
          )
        )
      )
      .orderBy(asc(products.name))
      .limit(20);

    return {
      success: true,
      data: matchingProducts.map(p => ({
        ...p,
        brandName: p.brandName || p.brand,
      })),
      message: 'Tìm kiếm sản phẩm thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Error searching products:');
    return {
      success: false,
      message: getActionErrorMessage(error, 'Không thể tìm kiếm sản phẩm'),
    };
  }
}

export async function getProductMetricsAction(): Promise<ActionResult<ProductMetrics>> {
  try {
    const { organizationId } = await requireOrgContext();

    const [productCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(eq(products.organizationId, organizationId));

    const [itemStats] = await db
      .select({
        totalItems: sql<number>`COALESCE(SUM(${shipmentItems.quantity}), 0)::int`,
        availableItems: sql<number>`COALESCE(SUM(CASE WHEN ${shipmentItems.status} = 'received' THEN ${shipmentItems.quantity} ELSE 0 END), 0)::int`,
        soldItems: sql<number>`COALESCE(SUM(CASE WHEN ${shipmentItems.status} = 'sold' THEN ${shipmentItems.quantity} ELSE 0 END), 0)::int`,
      })
      .from(shipmentItems)
      .where(eq(shipmentItems.organizationId, organizationId));

    const metrics: ProductMetrics = {
      totalProducts: productCount?.count || 0,
      totalItems: itemStats?.totalItems || 0,
      availableItems: itemStats?.availableItems || 0,
      soldItems: itemStats?.soldItems || 0,
    };

    return {
      success: true,
      data: metrics,
      message: 'Lấy thống kê sản phẩm thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching product metrics:');
    return {
      success: false,
      message: getActionErrorMessage(error, 'Lỗi khi lấy thống kê sản phẩm'),
    };
  }
}

export async function syncProductWithShopifyAction(
  productId: string
): Promise<ActionResult<{ sync: ShopifyProductSyncResult }>> {
  try {
    // Require authorization for Shopify sync (admin or warehouse staff)
    const { organizationId, userId } = await requireOrgContext({ permissions: ['create:products', 'update:products'] });
    logger.info({ userId, organizationId, productId }, 'Đang đồng bộ sản phẩm với Shopify');

    // Get product with color info in a single query (must be in same org)
    const [productWithColor] = await db
      .select({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        brand: products.brand,
        brandId: products.brandId,
        model: products.model,
        sku: products.sku,
        qrCode: products.qrCode,
        description: products.description,
        category: products.category,
        // Dynamic attributes as JSONB
        attributes: products.attributes,
        colorHex: colors.hex,
        colorName: colors.name,
        price: products.price,
        productType: products.productType,
        isPackProduct: products.isPackProduct,
        packSize: products.packSize,
        baseProductId: products.baseProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(colors, eq(colors.id, sql`(${products.attributes}->>'colorId')::text`))
      .where(and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId)
      ))
      .limit(1);

    if (!productWithColor) {
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm',
      };
    }

    const syncResult = await createShopifyProductFromWarehouse(
      productWithColor,
      db,
      { colorHex: productWithColor.colorHex ?? null }
    );
    const message = syncResult.status === 'success'
      ? 'Đã đồng bộ sản phẩm với Shopify thành công'
      : 'Sản phẩm đã được đồng bộ với Shopify';

    return {
      success: true,
      message,
      data: { sync: syncResult },
    };
  } catch (error) {
    logger.error({ error }, 'Shopify product sync failed:');
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';

    return {
      success: false,
      message: errorMessage,
      error: errorMessage,
    };
  }
}
