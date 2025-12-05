'use server';

import { db } from '~/server/db';
import { providers, shipments } from '~/server/db/schema';
import { eq, desc, like, or, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './types';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';

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
    const { organizationId } = await requireOrgContext();

    const allProviders = await db
      .select()
      .from(providers)
      .where(eq(providers.organizationId, organizationId))
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
      error: error instanceof Error ? error.message : 'Không thể lấy danh sách nhà cung cấp',
    };
  }
}

export async function searchProvidersAction(query: string): Promise<ActionResult<Provider[]>> {
  try {
    const { organizationId } = await requireOrgContext();

    const searchQuery = `%${query}%`;
    const results = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.organizationId, organizationId),
          or(
            like(providers.name, searchQuery),
            like(providers.telephone, searchQuery),
            like(providers.taxCode, searchQuery)
          )
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
      error: error instanceof Error ? error.message : 'Không thể tìm kiếm nhà cung cấp',
    };
  }
}

export async function createProviderAction(input: CreateProviderInput): Promise<ActionResult<Provider>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['create:providers'] });
    logger.info({ providerName: input.name, providerType: input.type, userId, organizationId }, 'Creating provider...');

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
        organizationId,
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

    logger.info({ providerId, providerName: input.name, providerType: input.type, organizationId }, 'Successfully created provider');

    return {
      success: true,
      message: 'Tạo nhà cung cấp thành công',
      data: newProvider,
    };
  } catch (error) {
    logger.error({ error, providerName: input.name, providerType: input.type }, 'Error creating provider');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo nhà cung cấp',
    };
  }
}

export async function updateProviderAction(input: UpdateProviderInput): Promise<ActionResult<Provider>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['update:providers'] });
    logger.info({ providerId: input.id, providerName: input.name, userId, organizationId }, 'Updating provider...');

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
      .where(and(
        eq(providers.id, input.id),
        eq(providers.organizationId, organizationId)
      ))
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
    logger.error({ error }, 'Error updating provider:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật nhà cung cấp',
    };
  }
}

export async function deleteProviderAction(providerId: string): Promise<ActionResult<void>> {
  try {
    const { organizationId, userId } = await requireOrgContext({ permissions: ['delete:providers'] });
    logger.info({ providerId, userId, organizationId }, 'Deleting provider...');

    // Check if provider is used in any shipments in this org
    const shipmentsWithProvider = await db
      .select()
      .from(shipments)
      .where(and(
        eq(shipments.providerId, providerId),
        eq(shipments.organizationId, organizationId)
      ))
      .limit(1);

    if (shipmentsWithProvider.length > 0) {
      return {
        success: false,
        error: 'Không thể xóa nhà cung cấp đã có phiếu nhập',
      };
    }

    await db
      .delete(providers)
      .where(and(
        eq(providers.id, providerId),
        eq(providers.organizationId, organizationId)
      ));

    return {
      success: true,
      message: 'Xóa nhà cung cấp thành công',
    };
  } catch (error) {
    logger.error({ error }, 'Error deleting provider:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa nhà cung cấp',
    };
  }
}

export async function getProviderByIdAction(providerId: string): Promise<ActionResult<Provider>> {
  try {
    const { organizationId } = await requireOrgContext();

    const [provider] = await db
      .select()
      .from(providers)
      .where(and(
        eq(providers.id, providerId),
        eq(providers.organizationId, organizationId)
      ))
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
      error: error instanceof Error ? error.message : 'Không thể lấy thông tin nhà cung cấp',
    };
  }
}
