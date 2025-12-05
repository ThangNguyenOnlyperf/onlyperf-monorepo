'use server';

import { db } from '~/server/db';
import { orders, customers, sepayTransactions } from '~/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { ActionResult } from './types';
import { logger } from '~/lib/logger';
import { requireOrgContext } from '~/lib/authorization';
import { getDbErrorMessage } from '~/lib/error-handling';

// Enhanced payment interfaces for static approach
export interface CreateOrderRequest {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  totalAmount: number;
  notes?: string;
  paymentMethod: 'cash' | 'bank_transfer';
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  paymentUrl?: string;
  message?: string;
}

export interface PaymentStatusResponse {
  paymentStatus: 'Unpaid' | 'Paid' | 'Cancelled' | 'Refunded' | 'order_not_found';
  message?: string;
}

// Enhanced Sepay webhook interface matching PHP guide
export interface SepayWebhookDataEnhanced {
  id: number; // SePay transaction ID for deduplication
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
  description: string;
}

/**
 * Generate order-specific payment code
 */
export async function generatePaymentCode(orderId: string): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `PERF${timestamp}${random}`;
}

/**
 * Create order with payment code (like PHP order.php)
 */
export async function createOrderWithPayment(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  try {
    const { organizationId } = await requireOrgContext();

    // Generate unique order ID and number
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orderNumber = `ORD${Date.now().toString().substr(-8)}`;
    const paymentCode = request.paymentMethod === 'bank_transfer' ? await generatePaymentCode(orderId) : null;

    // Create customer first (simplified - in real app, check if customer exists)
    const customerId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(customers).values({
      id: customerId,
      organizationId,
      name: request.customerName,
      phone: request.customerPhone,
      address: request.customerAddress || null,
    });

    // Create order with payment code
    await db.insert(orders).values({
      id: orderId,
      organizationId,
      orderNumber,
      customerId,
      totalAmount: request.totalAmount,
      paymentMethod: request.paymentMethod,
      paymentStatus: 'Unpaid',
      paymentCode,
      notes: request.notes || null,
      customerType: 'b2c',
    });

    if (request.paymentMethod === 'bank_transfer' && paymentCode) {
      return {
        success: true,
        orderId,
        orderNumber,
        paymentUrl: `/payment/${orderId}`,
      };
    } else {
      return {
        success: true,
        orderId,
        orderNumber,
        message: 'Đơn hàng tiền mặt đã được tạo thành công',
      };
    }
  } catch (error) {
    logger.error({ error }, 'Error creating order');
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể tạo đơn hàng.'),
    };
  }
}

/**
 * Generate Sepay QR URL (static QR from Sepay API)
 */
export async function generateSepayQRUrl(order: {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentCode: string;
}): Promise<string> {
  // Bank account configuration from environment
  const bankAccount = '04462119201';
  const bankName = 'TPBank';
  const template = 'compact';

  // Build QR URL like PHP example
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankAccount}&bank=${bankName}&amount=${order.totalAmount}&des=${order.paymentCode}&template=${template}&download=false`;

  return qrUrl;
}

/**
 * Check payment status for AJAX polling (like PHP check_payment_status.php)
 */
export async function checkPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
  try {
    const { organizationId } = await requireOrgContext();

    const orderData = await db
      .select({ paymentStatus: orders.paymentStatus })
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId)
      ))
      .limit(1);

    if (orderData.length === 0 || !orderData[0]) {
      return { paymentStatus: 'order_not_found', message: 'Order not found' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    return { paymentStatus: orderData[0].paymentStatus as any };
  } catch (error) {
    logger.error({ error }, 'Error checking payment status');
    return { paymentStatus: 'order_not_found', message: 'Error checking status' };
  }
}

/**
 * Enhanced webhook processing with order matching (like PHP sepay_webhook.php)
 */
export async function processSepayWebhookEnhanced(data: SepayWebhookDataEnhanced): Promise<ActionResult> {
  try {
    // Check for duplicate transactions using SePay transaction ID
    const existingTransaction = await db
      .select()
      .from(sepayTransactions)
      .where(eq(sepayTransactions.sepayTransactionId, data.id.toString()))
      .limit(1);

    if (existingTransaction.length > 0) {
      return {
        success: false,
        message: 'Transaction already processed',
      };
    }

    // Only process incoming payments
    if (data.transferType !== 'in') {
      return {
        success: false,
        message: 'Only incoming payments are processed',
      };
    }


    const regex = /PERF([A-Z0-9]+)/;
    const matches = data.content.match(regex);
    
    if (!matches || !matches[1]) {
      return {
        success: false,
        message: `No PERF payment code found in transaction content: ${data.content}`,
      };
    }

    const paymentCode = `PERF${matches[1]}`;

    // Find order matching payment code, amount, and status FIRST (to get organizationId)
    const matchingOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.paymentCode, paymentCode),
          eq(orders.totalAmount, data.transferAmount),
          eq(orders.paymentStatus, 'Unpaid')
        )
      )
      .limit(1);

    if (matchingOrders.length === 0 || !matchingOrders[0]) {
      return {
        success: false,
        message: `Order not found. Payment code: ${paymentCode}, Amount: ${data.transferAmount}`,
      };
    }

    const order = matchingOrders[0];

    // Store the transaction with organizationId from the matching order
    const transactionId = `sepay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(sepayTransactions).values({
      id: transactionId,
      organizationId: order.organizationId,
      sepayTransactionId: data.id.toString(),
      gateway: data.gateway,
      transactionDate: new Date(data.transactionDate),
      accountNumber: data.accountNumber,
      subAccount: data.subAccount ?? '',
      amountIn: data.transferAmount.toString(),
      amountOut: '0',
      accumulated: data.accumulated.toString(),
      code: data.code ?? '',
      transactionContent: data.content,
      referenceNumber: data.referenceCode,
      body: JSON.stringify(data),
      transferType: data.transferType,
      transferAmount: data.transferAmount.toString(),
      orderId: order.id,
      processed: true,
    });

    // Update order payment status
    await db
      .update(orders)
      .set({
        paymentStatus: 'Paid',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return {
      success: true,
      message: 'Payment processed successfully',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        transactionId,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Error processing Sepay webhook');
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể xử lý thanh toán.'),
    };
  }
}

/**
 * Get order details for payment page
 */
export async function getOrderForPayment(orderId: string): Promise<ActionResult> {
  try {
    const { organizationId } = await requireOrgContext();

    const orderData = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        totalAmount: orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        paymentCode: orders.paymentCode,
        notes: orders.notes,
        createdAt: orders.createdAt,
        customer: {
          name: customers.name,
          phone: customers.phone,
          address: customers.address,
        },
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId)
      ))
      .limit(1);

    if (orderData.length === 0) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    return {
      success: true,
      data: orderData[0],
    };
  } catch (error) {
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể lấy thông tin đơn hàng.'),
    };
  }
}
