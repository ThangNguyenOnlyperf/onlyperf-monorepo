'use server';

import { db } from '~/server/db';
import { scanningSessions } from '~/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { auth } from '~/lib/auth';
import { headers } from 'next/headers';
import type { CartItem, CustomerInfo } from '~/components/outbound/types';
import { logger } from '~/lib/logger';

interface SessionData {
  id: string;
  userId: string;
  cartItems: CartItem[];
  customerInfo: CustomerInfo;
  deviceCount: number;
  lastUpdated: Date;
  lastPing: Date;
}

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// Get or create a scanning session for the current user
export async function getOrCreateUserSession(): Promise<ActionResult<SessionData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Không tìm thấy phiên đăng nhập',
      };
    }

    const userId = session.user.id;

    // Try to get existing session
    const existing = await db
      .select()
      .from(scanningSessions)
      .where(eq(scanningSessions.userId, userId))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      const sessionData = existing[0];
      return {
        success: true,
        message: 'Đã tải phiên quét',
        data: {
          id: sessionData.id,
          userId: sessionData.userId,
          cartItems: JSON.parse(sessionData.cartItems) as CartItem[],
          customerInfo: JSON.parse(sessionData.customerInfo) as CustomerInfo,
          deviceCount: sessionData.deviceCount,
          lastUpdated: sessionData.lastUpdated,
          lastPing: sessionData.lastPing,
        },
      };
    }

    // Create new session
    const defaultCustomerInfo: CustomerInfo = {
      name: '',
      phone: '',
      address: '',
      paymentMethod: 'cash',
      voucherCode: '',
      customerType: 'b2c',
      providerId: undefined,
    };

    const newSession = await db
      .insert(scanningSessions)
      .values({
        userId,
        cartItems: JSON.stringify([]),
        customerInfo: JSON.stringify(defaultCustomerInfo),
        deviceCount: 1,
        lastUpdated: new Date(),
        lastPing: new Date(),
      })
      .returning();

    if (!newSession[0]) {
      return {
        success: false,
        message: 'Không thể tạo phiên quét',
      };
    }

    return {
      success: true,
      message: 'Đã tạo phiên quét mới',
      data: {
        id: newSession[0].id,
        userId: newSession[0].userId,
        cartItems: [],
        customerInfo: defaultCustomerInfo,
        deviceCount: 1,
        lastUpdated: newSession[0].lastUpdated,
        lastPing: newSession[0].lastPing,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error getting/creating session:');
    return {
      success: false,
      message: 'Lỗi khi tạo/tải phiên quét',
    };
  }
}

// Update cart items in the session
export async function updateSessionCart(cartItems: CartItem[]): Promise<ActionResult<SessionData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Không tìm thấy phiên đăng nhập',
      };
    }

    const userId = session.user.id;

    const updated = await db
      .update(scanningSessions)
      .set({
        cartItems: JSON.stringify(cartItems),
        lastUpdated: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(scanningSessions.userId, userId))
      .returning();

    if (updated.length === 0 || !updated[0]) {
      return {
        success: false,
        message: 'Không tìm thấy phiên quét',
      };
    }

    return {
      success: true,
      message: 'Đã cập nhật giỏ hàng',
      data: {
        id: updated[0].id,
        userId: updated[0].userId,
        cartItems: JSON.parse(updated[0].cartItems) as CartItem[],
        customerInfo: JSON.parse(updated[0].customerInfo) as CustomerInfo,
        deviceCount: updated[0].deviceCount,
        lastUpdated: updated[0].lastUpdated,
        lastPing: updated[0].lastPing,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error updating cart:');
    return {
      success: false,
      message: 'Lỗi khi cập nhật giỏ hàng',
    };
  }
}

// Update customer info in the session
export async function updateSessionCustomer(customerInfo: CustomerInfo): Promise<ActionResult<SessionData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Không tìm thấy phiên đăng nhập',
      };
    }

    const userId = session.user.id;

    const updated = await db
      .update(scanningSessions)
      .set({
        customerInfo: JSON.stringify(customerInfo),
        lastUpdated: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(scanningSessions.userId, userId))
      .returning();

    if (updated.length === 0 || !updated[0]) {
      return {
        success: false,
        message: 'Không tìm thấy phiên quét',
      };
    }

    return {
      success: true,
      message: 'Đã cập nhật thông tin khách hàng',
      data: {
        id: updated[0].id,
        userId: updated[0].userId,
        cartItems: JSON.parse(updated[0].cartItems) as CartItem[],
        customerInfo: JSON.parse(updated[0].customerInfo) as CustomerInfo,
        deviceCount: updated[0].deviceCount,
        lastUpdated: updated[0].lastUpdated,
        lastPing: updated[0].lastPing,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error updating customer:');
    return {
      success: false,
      message: 'Lỗi khi cập nhật thông tin khách hàng',
    };
  }
}

// Sync and get latest session data
export async function syncSessionData(lastKnownUpdate?: Date): Promise<ActionResult<SessionData | null>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Không tìm thấy phiên đăng nhập',
      };
    }

    const userId = session.user.id;

    // Get current session
    const sessionData = await db
      .select()
      .from(scanningSessions)
      .where(eq(scanningSessions.userId, userId))
      .limit(1);

    if (sessionData.length === 0 || !sessionData[0]) {
      return {
        success: true,
        message: 'Không có phiên quét',
        data: null,
      };
    }

    const current = sessionData[0];

    // Check if there are updates since last known time
    if (lastKnownUpdate && current.lastUpdated <= lastKnownUpdate) {
      return {
        success: true,
        message: 'Không có cập nhật mới',
        data: null,
      };
    }

    // Update last ping to track active devices
    await db
      .update(scanningSessions)
      .set({
        lastPing: new Date(),
      })
      .where(eq(scanningSessions.userId, userId));

    return {
      success: true,
      message: 'Đã đồng bộ dữ liệu',
      data: {
        id: current.id,
        userId: current.userId,
        cartItems: JSON.parse(current.cartItems) as CartItem[],
        customerInfo: JSON.parse(current.customerInfo) as CustomerInfo,
        deviceCount: current.deviceCount,
        lastUpdated: current.lastUpdated,
        lastPing: current.lastPing,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error syncing session:');
    return {
      success: false,
      message: 'Lỗi khi đồng bộ phiên',
    };
  }
}

// Clear session after order completion
export async function clearUserSession(): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Không tìm thấy phiên đăng nhập',
      };
    }

    const userId = session.user.id;

    const defaultCustomerInfo: CustomerInfo = {
      name: '',
      phone: '',
      address: '',
      paymentMethod: 'cash',
      voucherCode: '',
      customerType: 'b2c',
      providerId: undefined,
    };

    await db
      .update(scanningSessions)
      .set({
        cartItems: JSON.stringify([]),
        customerInfo: JSON.stringify(defaultCustomerInfo),
        lastUpdated: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(scanningSessions.userId, userId));

    return {
      success: true,
      message: 'Đã xóa phiên quét',
    };
  } catch (error) {
    logger.error({ error }, 'Error clearing session:');
    return {
      success: false,
      message: 'Lỗi khi xóa phiên quét',
    };
  }
}

// Ping session to track active devices
export async function pingSession(deviceId: string): Promise<ActionResult<{ deviceCount: number }>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Không tìm thấy phiên đăng nhập',
      };
    }

    const userId = session.user.id;

    // Update last ping
    await db
      .update(scanningSessions)
      .set({
        lastPing: new Date(),
      })
      .where(eq(scanningSessions.userId, userId));

    // Count active devices (pinged in last 10 seconds)
    const activeCutoff = new Date(Date.now() - 10000);
    const activeDevices = await db
      .select()
      .from(scanningSessions)
      .where(
        and(
          eq(scanningSessions.userId, userId),
          gt(scanningSessions.lastPing, activeCutoff)
        )
      );

    // For now, we'll return 1 as we track at user level
    // In a more complex implementation, you'd track individual devices
    return {
      success: true,
      message: 'Ping thành công',
      data: {
        deviceCount: activeDevices.length > 0 ? 2 : 1, // Simplified: assume 2 devices if recently pinged
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error pinging session:');
    return {
      success: false,
      message: 'Lỗi khi ping phiên',
    };
  }
}