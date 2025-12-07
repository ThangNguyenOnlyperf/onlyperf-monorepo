'use server';

import { nanoid } from 'nanoid';
import { db } from '~/server/db';
import { brands } from '~/server/db/schema';
import type { ActionResult } from './types';
import { eq, like, sql, asc, and } from 'drizzle-orm';
import { z } from 'zod';
import { BrandSchema, type BrandFormData, type Brand } from '~/lib/schemas/brandSchema';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';

export async function getBrandsAction(): Promise<ActionResult<Brand[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    const allBrands = await db
      .select()
      .from(brands)
      .where(eq(brands.organizationId, organizationId))
      .orderBy(asc(brands.name));

    return {
      success: true,
      data: allBrands,
      message: 'Lấy danh sách thương hiệu thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi lấy danh sách thương hiệu');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Không thể lấy danh sách thương hiệu',
    };
  }
}

export async function searchBrandsAction(query: string): Promise<ActionResult<Brand[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    const searchPattern = `%${query}%`;
    const matchingBrands = await db
      .select()
      .from(brands)
      .where(and(
        eq(brands.organizationId, organizationId),
        like(brands.name, searchPattern)
      ))
      .orderBy(asc(brands.name))
      .limit(10);

    return {
      success: true,
      data: matchingBrands,
      message: 'Tìm kiếm thương hiệu thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi tìm kiếm thương hiệu');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Không thể tìm kiếm thương hiệu',
    };
  }
}

export async function createBrandAction(data: BrandFormData): Promise<ActionResult<Brand>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['create:brands'] });
    logger.info({ brandName: data.name, userId, organizationId }, 'Đang tạo thương hiệu');

    const validatedData = BrandSchema.parse(data);

    // Check if brand already exists in this org
    const existingBrand = await db
      .select()
      .from(brands)
      .where(and(
        eq(brands.organizationId, organizationId),
        eq(brands.name, validatedData.name)
      ))
      .limit(1);

    if (existingBrand.length > 0) {
      logger.warn({ brandName: validatedData.name, organizationId }, 'Thương hiệu đã tồn tại');
      return {
        success: false,
        message: `Thương hiệu "${validatedData.name}" đã tồn tại`,
      };
    }

    // Create new brand
    const brandId = `brand_${nanoid()}`;
    logger.info({ brandId, brandName: validatedData.name, organizationId }, 'Đang thêm thương hiệu vào cơ sở dữ liệu');

    const [newBrand] = await db
      .insert(brands)
      .values({
        id: brandId,
        organizationId,
        name: validatedData.name,
        description: validatedData.description,
      })
      .returning();

    logger.info({ brandId, brandName: validatedData.name }, 'Tạo thương hiệu thành công');

    return {
      success: true,
      data: newBrand,
      message: `Đã tạo thương hiệu "${validatedData.name}" thành công`,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ validationErrors: error.errors }, 'Xác thực dữ liệu thương hiệu thất bại');
      return {
        success: false,
        message: error.errors[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, brandName: data.name }, 'Không có quyền tạo thương hiệu');
      return {
        success: false,
        message: error.message,
      };
    }

    logger.error({ error, brandName: data.name }, 'Lỗi khi tạo thương hiệu');
    return {
      success: false,
      message: 'Không thể tạo thương hiệu mới',
    };
  }
}

export async function updateBrandAction(
  id: string,
  data: BrandFormData
): Promise<ActionResult<Brand>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['update:brands'] });
    logger.info({ brandId: id, brandName: data.name, userId, organizationId }, 'Đang cập nhật thương hiệu');

    const validatedData = BrandSchema.parse(data);

    // Check if another brand with same name exists in this org
    const existingBrand = await db
      .select()
      .from(brands)
      .where(and(
        eq(brands.organizationId, organizationId),
        eq(brands.name, validatedData.name)
      ))
      .limit(1);

    if (existingBrand.length > 0 && existingBrand[0]!.id !== id) {
      return {
        success: false,
        message: `Thương hiệu "${validatedData.name}" đã tồn tại`,
      };
    }

    const [updatedBrand] = await db
      .update(brands)
      .set({
        name: validatedData.name,
        description: validatedData.description,
        updatedAt: new Date(),
      })
      .where(and(
        eq(brands.id, id),
        eq(brands.organizationId, organizationId)
      ))
      .returning();

    if (!updatedBrand) {
      return {
        success: false,
        message: 'Không tìm thấy thương hiệu',
      };
    }

    return {
      success: true,
      data: updatedBrand,
      message: 'Cập nhật thương hiệu thành công',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    logger.error({ error }, 'Lỗi khi cập nhật thương hiệu');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Không thể cập nhật thương hiệu',
    };
  }
}

export async function deleteBrandAction(id: string): Promise<ActionResult<void>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['delete:brands'] });
    logger.info({ brandId: id, userId, organizationId }, 'Đang xóa thương hiệu');

    // Check if brand exists in this org
    const [brand] = await db
      .select()
      .from(brands)
      .where(and(
        eq(brands.id, id),
        eq(brands.organizationId, organizationId)
      ))
      .limit(1);

    if (!brand) {
      return {
        success: false,
        message: 'Không tìm thấy thương hiệu',
      };
    }

    await db.delete(brands).where(and(
      eq(brands.id, id),
      eq(brands.organizationId, organizationId)
    ));

    logger.info({ brandId: id, organizationId }, 'Xóa thương hiệu thành công');

    return {
      success: true,
      message: 'Xóa thương hiệu thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi xóa thương hiệu');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Không thể xóa thương hiệu',
    };
  }
}

// Get or create brand by name (useful for migration or import)
export async function getOrCreateBrandAction(name: string): Promise<ActionResult<Brand>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['create:brands'] });
    logger.info({ brandName: name, userId, organizationId }, 'Đang tạo hoặc lấy thương hiệu');

    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        success: false,
        message: 'Tên thương hiệu không được để trống',
      };
    }

    // Check if brand exists in this org
    const [existingBrand] = await db
      .select()
      .from(brands)
      .where(and(
        eq(brands.organizationId, organizationId),
        eq(brands.name, trimmedName)
      ))
      .limit(1);

    if (existingBrand) {
      return {
        success: true,
        data: existingBrand,
        message: 'Thương hiệu đã tồn tại',
      };
    }

    // Create new brand
    const brandId = `brand_${nanoid()}`;
    const [newBrand] = await db
      .insert(brands)
      .values({
        id: brandId,
        organizationId,
        name: trimmedName,
      })
      .returning();

    return {
      success: true,
      data: newBrand!,
      message: `Đã tạo thương hiệu "${trimmedName}" thành công`,
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi trong getOrCreateBrand');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Không thể tạo hoặc lấy thương hiệu',
    };
  }
}