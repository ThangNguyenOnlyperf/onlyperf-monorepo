'use server';

import { db } from '~/server/db';
import { storages } from '~/server/db/schema';
import { eq, desc, sql, asc } from 'drizzle-orm';
import type { ActionResult } from './types';
import type { PaginationParams, PaginatedResult } from '~/lib/queries/paginateQuery';
import { logger } from '~/lib/logger';
import { requireAuth } from '~/lib/authorization';

export type Storage = typeof storages.$inferSelect;
export type StorageFormData = {
  name: string;
  location: string;
  capacity: number;
  priority: number;
};

export async function createStorageAction(
  data: StorageFormData
): Promise<ActionResult<Storage>> {
  try {
    // Require admin role to create storage locations
    const session = await requireAuth({ roles: ['admin'] });
    logger.info({ storageName: data.name, location: data.location, capacity: data.capacity, userId: session.user.id, userEmail: session.user.email }, 'Đang tạo kho');

    const storageId = `stg_${Date.now()}`;

    logger.info({ storageId, storageName: data.name }, 'Đang thêm kho vào cơ sở dữ liệu');

    const [newStorage] = await db.insert(storages).values({
      id: storageId,
      name: data.name,
      location: data.location,
      capacity: data.capacity,
      priority: data.priority,
    }).returning();

    logger.info({ storageId, storageName: data.name }, 'Tạo kho thành công');

    return {
      success: true,
      message: 'Kho đã được tạo thành công',
      data: newStorage,
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, storageName: data.name }, 'Không có quyền tạo kho');
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error({ error, storageName: data.name }, 'Lỗi khi tạo kho');
    return {
      success: false,
      error: 'Lỗi khi tạo kho',
    };
  }
}

export async function updateStorageAction(
  id: string,
  data: StorageFormData
): Promise<ActionResult<Storage>> {
  try {
    // Require admin role to update storage locations
    const session = await requireAuth({ roles: ['admin'] });
    logger.info({ storageId: id, newName: data.name, newLocation: data.location, userId: session.user.id, userEmail: session.user.email }, 'Đang cập nhật kho');

    // Get old storage data for logging
    const [oldStorage] = await db
      .select()
      .from(storages)
      .where(eq(storages.id, id))
      .limit(1);

    if (!oldStorage) {
      logger.warn({ storageId: id }, 'Không tìm thấy kho để cập nhật');
      return {
        success: false,
        error: 'Không tìm thấy kho',
      };
    }

    const [updatedStorage] = await db
      .update(storages)
      .set({
        name: data.name,
        location: data.location,
        capacity: data.capacity,
        priority: data.priority,
        updatedAt: new Date(),
      })
      .where(eq(storages.id, id))
      .returning();

    if (!updatedStorage) {
      logger.warn({ storageId: id }, 'Không tìm thấy kho để cập nhật sau khi truy vấn');
      return {
        success: false,
        error: 'Không tìm thấy kho',
      };
    }

    logger.info({
      storageId: id,
      oldName: oldStorage.name,
      newName: data.name,
      oldLocation: oldStorage.location,
      newLocation: data.location,
      oldCapacity: oldStorage.capacity,
      newCapacity: data.capacity,
    }, 'Cập nhật kho thành công');

    return {
      success: true,
      message: 'Kho đã được cập nhật thành công',
      data: updatedStorage,
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, storageId: id }, 'Không có quyền cập nhật kho');
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error({ error, storageId: id, newName: data.name }, 'Lỗi khi cập nhật kho');
    return {
      success: false,
      error: 'Lỗi khi cập nhật kho',
    };
  }
}

export async function deleteStorageAction(
  id: string
): Promise<ActionResult<boolean>> {
  try {
    // Require admin role to delete storage locations
    const session = await requireAuth({ roles: ['admin'] });
    logger.info({ storageId: id, userId: session.user.id, userEmail: session.user.email }, 'Đang xóa kho');

    const [storageWithCapacity] = await db
      .select({
        name: storages.name,
        location: storages.location,
        usedCapacity: storages.usedCapacity,
      })
      .from(storages)
      .where(eq(storages.id, id))
      .limit(1);

    if (!storageWithCapacity) {
      logger.warn({ storageId: id }, 'Không tìm thấy kho để xóa');
      return {
        success: false,
        error: 'Không tìm thấy kho',
      };
    }

    if (storageWithCapacity.usedCapacity > 0) {
      logger.warn({
        storageId: id,
        storageName: storageWithCapacity.name,
        usedCapacity: storageWithCapacity.usedCapacity
      }, 'Không thể xóa kho đang chứa hàng');
      return {
        success: false,
        error: 'Không thể xóa kho đang chứa hàng',
      };
    }

    await db.delete(storages).where(eq(storages.id, id));

    logger.info({
      storageId: id,
      storageName: storageWithCapacity.name,
      location: storageWithCapacity.location
    }, 'Xóa kho thành công');

    return {
      success: true,
      message: 'Kho đã được xóa thành công',
      data: true,
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, storageId: id }, 'Không có quyền xóa kho');
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error({ error, storageId: id }, 'Lỗi khi xóa kho');
    return {
      success: false,
      error: 'Lỗi khi xóa kho',
    };
  }
}

export async function getStoragesAction(
  paginationParams?: PaginationParams
): Promise<ActionResult<PaginatedResult<Storage>>> {
  try {
    const { page = 1, pageSize = 100, sortBy = 'priority', sortOrder = 'desc' } = paginationParams ?? {};
    const offset = (page - 1) * pageSize;

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storages);
    const totalItems = countResult?.[0]?.count ?? 0;

    let finalQuery;
    const baseQuery = db.select().from(storages);
    
    if (sortBy && (storages as any)[sortBy]) {
      const sortColumn = (storages as any)[sortBy];
      if (sortBy === 'priority') {
        finalQuery = baseQuery.orderBy(
          sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn),
          asc(storages.name)
        );
      } else {
        finalQuery = baseQuery.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
      }
    } else {
      finalQuery = baseQuery.orderBy(desc(storages.priority), asc(storages.name));
    }

    const storageList = await finalQuery.limit(pageSize).offset(offset);

    return {
      success: true,
      message: 'Lấy danh sách kho thành công',
      data: {
        data: storageList,
        metadata: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          totalItems,
        },
      },
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi lấy danh sách kho');
    return {
      success: false,
      error: 'Lỗi khi lấy danh sách kho',
    };
  }
}


export async function getStorageByIdAction(
  id: string
): Promise<ActionResult<Storage>> {
  try {
    const [storage] = await db
      .select()
      .from(storages)
      .where(eq(storages.id, id))
      .limit(1);

    if (!storage) {
      return {
        success: false,
        error: 'Không tìm thấy kho',
      };
    }

    return {
      success: true,
      message: 'Lấy thông tin kho thành công',
      data: storage,
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi lấy thông tin kho');
    return {
      success: false,
      error: 'Lỗi khi lấy thông tin kho',
    };
  }
}

export async function getStorageMetricsAction(): Promise<ActionResult<{
  totalStorages: number;
  totalCapacity: number;
  totalUsedCapacity: number;
  utilizationRate: number;
}>> {
  try {
    const metrics = await db
      .select({
        totalStorages: sql<number>`count(*)::int`,
        totalCapacity: sql<number>`coalesce(sum(${storages.capacity}), 0)::int`,
        totalUsedCapacity: sql<number>`coalesce(sum(${storages.usedCapacity}), 0)::int`,
      })
      .from(storages);

    const result = metrics[0] || {
      totalStorages: 0,
      totalCapacity: 0,
      totalUsedCapacity: 0,
    };

    const utilizationRate = result.totalCapacity > 0
      ? Math.round((result.totalUsedCapacity / result.totalCapacity) * 100)
      : 0;

    return {
      success: true,
      message: 'Lấy thống kê kho thành công',
      data: {
        ...result,
        utilizationRate,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Lỗi khi lấy thống kê kho');
    return {
      success: false,
      error: 'Lỗi khi lấy thống kê kho',
    };
  }
}