'use server';

import { db } from '~/server/db';
import { colors } from '~/server/db/schema';
import type { ActionResult } from './types';
import { desc, like, eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { ColorSchema, type Color, type ColorFormData } from '~/lib/schemas/colorSchema';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';

export async function getColorsAction(): Promise<ActionResult<Color[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    const all = await db
      .select()
      .from(colors)
      .where(eq(colors.organizationId, organizationId))
      .orderBy(desc(colors.createdAt));

    return {
      success: true,
      message: 'Lấy danh sách màu thành công',
      data: all as unknown as Color[],
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi lấy danh sách màu');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể lấy danh sách màu',
    };
  }
}

export async function searchColorsAction(query: string): Promise<ActionResult<Color[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    const searchQuery = `%${query}%`;
    const results = await db
      .select()
      .from(colors)
      .where(and(
        eq(colors.organizationId, organizationId),
        like(colors.name, searchQuery)
      ))
      .orderBy(desc(colors.createdAt));

    return {
      success: true,
      message: 'Tìm kiếm màu thành công',
      data: results as unknown as Color[],
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi tìm kiếm màu');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tìm kiếm màu',
    };
  }
}

export async function createColorAction(input: ColorFormData): Promise<ActionResult<Color>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['create:colors'] });
    logger.info({ colorName: input.name, hex: input.hex, userId, organizationId }, 'Đang tạo màu');

    const data = ColorSchema.parse(input);

    // prevent duplicates by name in this org
    const [existing] = await db
      .select()
      .from(colors)
      .where(and(
        eq(colors.organizationId, organizationId),
        eq(colors.name, data.name)
      ))
      .limit(1);

    if (existing) {
      logger.warn({ colorName: data.name, organizationId }, 'Màu đã tồn tại');
      return {
        success: false,
        error: 'Màu đã tồn tại',
      };
    }

    const colorId = `col_${Date.now()}`;
    logger.info({ colorId, colorName: data.name, hex: data.hex, organizationId }, 'Đang thêm màu vào cơ sở dữ liệu');

    const [created] = await db
      .insert(colors)
      .values({
        id: colorId,
        organizationId,
        name: data.name,
        hex: data.hex,
      })
      .returning();

    logger.info({ colorId, colorName: data.name, organizationId }, 'Tạo màu thành công');

    return {
      success: true,
      message: 'Tạo màu thành công',
      data: created as unknown as Color,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ validationErrors: error.errors }, 'Xác thực dữ liệu màu thất bại');
      return {
        success: false,
        error: error.errors[0]?.message ?? 'Dữ liệu màu không hợp lệ',
      };
    }

    logger.error({ error, colorName: input.name }, 'Lỗi khi tạo màu');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo màu',
    };
  }
}

