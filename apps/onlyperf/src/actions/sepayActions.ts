"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  type CheckoutLineSnapshot,
  checkoutLineSnapshotsArraySchema,
  checkoutSessionShippingAddressSchema,
  discountCodesArraySchema,
} from "@/lib/checkout/session-schema";
import { extractPaymentCode } from "@/lib/payments/payment-code";
import type { SepayWebhookData } from "@/lib/schemas/sepay";
import {
  buildDiscountCodeInput,
  createAdminOrder,
  markAdminOrderAsPaid,
} from "@/lib/shopify/admin";
import {
  buildCustomerInput,
  buildFullNameFromAddress,
} from "@/lib/shopify/customer-utils";
import { db } from "@/server/db";
import { checkoutSessions, sepayTransactions } from "@perf/db/schema";

import { notifyWarehouseOrderPaid } from "./warehouseActions";

type CheckoutSession = typeof checkoutSessions.$inferSelect;

function buildOrderInput(session: CheckoutSession, paymentCode: string) {
  const lines = checkoutLineSnapshotsArraySchema.parse(session.linesSnapshot);

  const lineItems = lines
    .filter((line) => line.variantId && line.quantity > 0)
    .map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
      sku: line.sku ?? undefined,
      title: line.title ?? undefined,
      variantTitle: line.variantTitle ?? undefined,
      vendor: line.vendor ?? undefined,
    }));

  const address = session.shippingAddress
    ? checkoutSessionShippingAddressSchema.parse(session.shippingAddress)
    : null;
  const customerInput = buildCustomerInput(session.customerId);

  // Get first discount code (Shopify only supports one per order)
  const discountCode = session.discountCodes
    ? discountCodesArraySchema.parse(session.discountCodes)[0]
    : undefined;

  return {
    currency: session.currency ?? "VND",
    email: session.email ?? undefined,
    customer: customerInput,
    tags: ["sepay", paymentCode],
    note: `Sepay payment ${paymentCode}`,
    shippingAddress: address
      ? {
          address1: address.address1 ?? undefined,
          address2: address.address2 ?? undefined,
          city: address.city ?? undefined,
          province: address.province ?? undefined,
          country: address.country ?? undefined,
          zip: address.zip ?? undefined,
          firstName: address.firstName ?? undefined,
          lastName: address.lastName ?? undefined,
          phone: address.phoneNumber ?? undefined,
        }
      : undefined,
    lineItems,
    sourceName: "sepay_qr",
    discountCode: buildDiscountCodeInput(
      discountCode,
      session.discountAmount ?? undefined,
      session.currency ?? "VND",
    ),
  };
}

function toIntegerAmount(amount: number) {
  return Math.round(amount);
}

async function markSessionError(sessionId: string, message: string) {
  await db
    .update(checkoutSessions)
    .set({ lastError: message, updatedAt: new Date() })
    .where(eq(checkoutSessions.id, sessionId));
}

export async function processSepayWebhookAndNotifyWarehouse(
  data: SepayWebhookData,
) {
  if (data.transferType !== "in") {
    return { success: false, message: "Chỉ xử lý giao dịch tiền vào" };
  }

  const transactionExternalId = data.id.toString();
  const existing = await db
    .select()
    .from(sepayTransactions)
    .where(eq(sepayTransactions.sepayTransactionId, transactionExternalId))
    .limit(1);

  if (existing.length > 0) {
    const match = existing[0];
    return {
      success: match.processed,
      message: match.processed
        ? "Giao dịch đã được xử lý trước đó"
        : "Giao dịch đã được ghi nhận",
      data: { transactionId: match.id, orderId: match.orderId ?? null },
    };
  }

  const paymentCode = extractPaymentCode(data.content ?? "");

  const transactionId = `sepay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  await db.insert(sepayTransactions).values({
    id: transactionId,
    sepayTransactionId: transactionExternalId,
    gateway: data.gateway,
    transactionDate: new Date(data.transactionDate),
    accountNumber: data.accountNumber ?? "",
    subAccount: data.subAccount ?? "",
    amountIn: data.transferAmount.toString(),
    amountOut: "0",
    accumulated: data.accumulated.toString(),
    code: data.code ?? "",
    transactionContent: data.content,
    referenceNumber: data.referenceCode,
    body: JSON.stringify(data),
    transferType: data.transferType,
    transferAmount: data.transferAmount.toString(),
    processed: false,
  });

  if (!paymentCode) {
    return {
      success: false,
      message: `Không tìm thấy mã thanh toán trong nội dung: ${data.content}`,
    };
  }

  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.paymentCode, paymentCode))
    .limit(1);

  if (!session) {
    return {
      success: false,
      message: `Không tìm thấy phiên checkout với mã ${paymentCode}`,
    };
  }

  if (
    session.status === "paid" &&
    session.sepayTransactionId === transactionExternalId
  ) {
    await db
      .update(sepayTransactions)
      .set({
        processed: true,
        orderId: session.shopifyOrderId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(sepayTransactions.id, transactionId));

    return {
      success: true,
      message: "Phiên đã được đánh dấu thanh toán",
      data: { transactionId, orderId: session.shopifyOrderId ?? null },
    };
  }

  const expectedAmount = Number(session.amount ?? 0);
  const receivedAmount = toIntegerAmount(data.transferAmount);

  if (receivedAmount < expectedAmount) {
    const message = `Số tiền không đủ. Chờ: ${expectedAmount}, nhận: ${receivedAmount}`;
    await markSessionError(session.id, message);
    return { success: false, message };
  }

  if (session.status === "paid") {
    return {
      success: false,
      message: "Phiên đã được thanh toán với giao dịch khác",
    };
  }

  try {
    const orderInput = buildOrderInput(session, paymentCode);
    const order = await createAdminOrder(orderInput, {
      sendReceipt: true,
    });
    await markAdminOrderAsPaid(order.id);

    await db
      .update(checkoutSessions)
      .set({
        status: "paid",
        shopifyOrderId: order.id,
        sepayTransactionId: transactionExternalId,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, session.id));

    await db
      .update(sepayTransactions)
      .set({ processed: true, orderId: order.id, updatedAt: new Date() })
      .where(eq(sepayTransactions.id, transactionId));

    const lines = checkoutLineSnapshotsArraySchema.parse(session.linesSnapshot);
    const shippingAddress = session.shippingAddress
      ? checkoutSessionShippingAddressSchema.parse(session.shippingAddress)
      : null;

    // Notify warehouse about the paid order
    await notifyWarehouseOrderPaid({
      event: "order.paid",
      provider: "sepay",
      shopifyOrderId: order.id,
      shopifyOrderNumber: order.name,
      paymentCode,
      amount: receivedAmount,
      currency: "VND",
      paidAt: new Date(data.transactionDate).toISOString(),
      referenceCode: data.referenceCode,
      gateway: data.gateway,
      lineItems: lines
        .filter((line): line is CheckoutLineSnapshot & { sku: string } =>
          Boolean(line.sku && line.variantId),
        )
        .map((line) => ({
          sku: line.sku,
          variantId: line.variantId,
          quantity: line.quantity,
          price: Number.parseFloat(line.price.amount),
          title: line.title,
          variantTitle: line.variantTitle ?? undefined,
        })),
      customer: {
        email: session.email || "noemail@onlyperf.local",
        name: buildFullNameFromAddress(shippingAddress),
        phone: shippingAddress?.phoneNumber ?? null,
      },
      shippingAddress: {
        ...shippingAddress,
        province: shippingAddress?.province || shippingAddress?.city || "",
      },
    });

    return {
      success: true,
      message: "Đã ghi nhận thanh toán và tạo đơn Shopify",
      data: { transactionId, orderId: order.name },
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error("Invalid DB data in checkout session:", {
        sessionId: session.id,
        errors: error.issues,
      });
      const message = "Dữ liệu đơn hàng không hợp lệ";
      await markSessionError(session.id, message);
      await db
        .update(sepayTransactions)
        .set({ processed: false, updatedAt: new Date() })
        .where(eq(sepayTransactions.id, transactionId));
      return { success: false, message };
    }

    // Handle other errors
    const message =
      error instanceof Error ? error.message : "Không thể xử lý thanh toán";

    await markSessionError(session.id, message);
    await db
      .update(sepayTransactions)
      .set({ processed: false, updatedAt: new Date() })
      .where(eq(sepayTransactions.id, transactionId));

    throw error;
  }
}
