'use server';

import { db } from '~/server/db';
import { providers } from '~/server/db/schema';
import { eq, desc, like, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './types';
import { logger } from '~/lib/logger';
import { requireAuth } from '~/lib/authorization';

export type Provider = typeof providers.$inferSelect;
export type ProviderType = 'supplier' | 'retailer' | 'seller';

export interface CreateProviderInput {
  type: ProviderType;
  name: string;
  taxCode?: string;
  address?: string;
  telephone: string;
  accountNo?: string;
}

export interface UpdateProviderInput extends CreateProviderInput {
  id: string;
}

export async function getProvidersAction(): Promise<ActionResult<Provider[]>> {
  try {
    const allProviders = await db
      .select()
      .from(providers)
      .orderBy(desc(providers.createdAt));

    return {
      success: true,
      message: 'Lấy danh sách nhà cung cấp thành công',
      data: allProviders,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching providers:');
    return {
      success: false,
      error: 'Không thể lấy danh sách nhà cung cấp',
    };
  }
}

export async function searchProvidersAction(query: string): Promise<ActionResult<Provider[]>> {
  try {
    const searchQuery = `%${query}%`;
    const results = await db
      .select()
      .from(providers)
      .where(
        or(
          like(providers.name, searchQuery),
          like(providers.telephone, searchQuery),
          like(providers.taxCode, searchQuery)
        )
      )
      .orderBy(desc(providers.createdAt));

    return {
      success: true,
      message: 'Tìm kiếm thành công',
      data: results,
    };
  } catch (error) {
    logger.error({ error }, 'Error searching providers:');
    return {
      success: false,
      error: 'Không thể tìm kiếm nhà cung cấp',
    };
  }
}

export async function createProviderAction(input: CreateProviderInput): Promise<ActionResult<Provider>> {
  try {
    // Require admin role to create providers
    const session = await requireAuth({ roles: ['admin'] });
    logger.info({ providerName: input.name, providerType: input.type, userId: session.user.id, userEmail: session.user.email }, 'Creating provider...');

    if (input.type === 'supplier' || input.type === 'retailer') {
      if (!input.taxCode) {
        logger.warn({ providerName: input.name, providerType: input.type }, 'Missing taxCode for supplier/retailer');
        return {
          success: false,
          error: 'Mã số thuế là bắt buộc cho nhà cung cấp/đại lý',
        };
      }
      if (!input.address) {
        logger.warn({ providerName: input.name, providerType: input.type }, 'Missing address for supplier/retailer');
        return {
          success: false,
          error: 'Địa chỉ là bắt buộc cho nhà cung cấp/đại lý',
        };
      }
    }

    const providerId = `prov_${Date.now()}`;

    const [newProvider] = await db
      .insert(providers)
      .values({
        id: providerId,
        type: input.type,
        name: input.name,
        taxCode: input.taxCode || null,
        address: input.address || null,
        telephone: input.telephone,
        accountNo: input.accountNo || null,
      })
      .returning();

    revalidatePath('/shipments/new');
    revalidatePath('/providers');

    logger.info({ providerId, providerName: input.name, providerType: input.type }, 'Successfully created provider');

    return {
      success: true,
      message: 'Tạo nhà cung cấp thành công',
      data: newProvider,
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, providerName: input.name }, 'Không có quyền tạo nhà cung cấp');
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error({ error, providerName: input.name, providerType: input.type }, 'Error creating provider');
    return {
      success: false,
      error: 'Không thể tạo nhà cung cấp',
    };
  }
}

export async function updateProviderAction(input: UpdateProviderInput): Promise<ActionResult<Provider>> {
  try {
    // Require admin role to update providers
    const session = await requireAuth({ roles: ['admin'] });
    logger.info({ providerId: input.id, providerName: input.name, userId: session.user.id, userEmail: session.user.email }, 'Updating provider...');

    // Validate required fields based on type
    if (input.type === 'supplier' || input.type === 'retailer') {
      if (!input.taxCode) {
        return {
          success: false,
          error: 'Mã số thuế là bắt buộc cho nhà cung cấp/đại lý',
        };
      }
      if (!input.address) {
        return {
          success: false,
          error: 'Địa chỉ là bắt buộc cho nhà cung cấp/đại lý',
        };
      }
    }

    const [updatedProvider] = await db
      .update(providers)
      .set({
        type: input.type,
        name: input.name,
        taxCode: input.taxCode || null,
        address: input.address || null,
        telephone: input.telephone,
        accountNo: input.accountNo || null,
        updatedAt: new Date(),
      })
      .where(eq(providers.id, input.id))
      .returning();

    if (!updatedProvider) {
      return {
        success: false,
        error: 'Không tìm thấy nhà cung cấp',
      };
    }

    return {
      success: true,
      message: 'Cập nhật nhà cung cấp thành công',
      data: updatedProvider,
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, providerId: input.id }, 'Không có quyền cập nhật nhà cung cấp');
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error({ error }, 'Error updating provider:');
    return {
      success: false,
      error: 'Không thể cập nhật nhà cung cấp',
    };
  }
}

export async function deleteProviderAction(providerId: string): Promise<ActionResult<void>> {
  try {
    // Require admin role to delete providers
    const session = await requireAuth({ roles: ['admin'] });
    logger.info({ providerId, userId: session.user.id, userEmail: session.user.email }, 'Deleting provider...');

    // Check if provider is used in any shipments
    const shipmentsWithProvider = await db.query.shipments.findFirst({
      where: (shipments, { eq }) => eq(shipments.providerId, providerId),
    });

    if (shipmentsWithProvider) {
      return {
        success: false,
        error: 'Không thể xóa nhà cung cấp đã có phiếu nhập',
      };
    }

    await db
      .delete(providers)
      .where(eq(providers.id, providerId));

    return {
      success: true,
      message: 'Xóa nhà cung cấp thành công',
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, providerId }, 'Không có quyền xóa nhà cung cấp');
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error({ error }, 'Error deleting provider:');
    return {
      success: false,
      error: 'Không thể xóa nhà cung cấp',
    };
  }
}

export async function getProviderByIdAction(providerId: string): Promise<ActionResult<Provider>> {
  try {
    const [provider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId))
      .limit(1);

    if (!provider) {
      return {
        success: false,
        error: 'Không tìm thấy nhà cung cấp',
      };
    }

    return {
      success: true,
      message: 'Lấy thông tin nhà cung cấp thành công',
      data: provider,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching provider:');
    return {
      success: false,
      error: 'Không thể lấy thông tin nhà cung cấp',
    };
  }
}