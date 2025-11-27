"use server";

import { and, desc, eq, gt } from "drizzle-orm";

import { generatePaymentCode } from "@/lib/payments/payment-code";
import { storefrontQuery } from "@/lib/shopify/storefront";
import { db } from "@/server/db";
import { checkoutSessions } from "@perf/db/schema";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import { PRIMARY_LOCALE } from "@/lib/shopify/locale";

import {
  buildBankDetails,
  buildCheckoutExpiration,
  buildVietQrImageUrl,
  getCartEmail,
  mapCartLinesSnapshot,
  parseCartTotals,
  type StorefrontCart,
} from "@/lib/checkout/session-utils";
import {
  type CheckoutSessionState,
  type CheckoutSessionSummary,
  createCheckoutSessionInputSchema,
  type CreateCheckoutSessionInput,
  discountCodesArraySchema,
} from "@/lib/checkout/session-schema";
import { CART_FOR_SEPAY_CHECKOUT_QUERY } from "@/lib/checkout/session-query";

export interface CreateCheckoutSessionResult {
  summary: CheckoutSessionSummary;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  const parsed = createCheckoutSessionInputSchema.parse(input);

  // Check for customer session only if not guest checkout
  const session = parsed.isGuest
    ? null
    : await readCustomerSessionFromCookies();

  if (!parsed.isGuest && !session) {
    throw new Error("Customer session required for authenticated checkout");
  }

  const cartData = await storefrontQuery<{ cart: StorefrontCart | null }>(
    CART_FOR_SEPAY_CHECKOUT_QUERY,
    {
      variables: { id: parsed.cartId },
      locale: PRIMARY_LOCALE,
    },
  );

  const cart = cartData.cart;
  if (!cart) {
    throw new Error("Cart not found");
  }

  const totals = parseCartTotals(cart);
  if (totals.amount <= 0) {
    throw new Error("Cart total amount must be greater than zero");
  }

  const linesSnapshot = mapCartLinesSnapshot(cart, totals.currency);
  if (linesSnapshot.length === 0) {
    throw new Error("Cart is empty");
  }

  const paymentCode = generatePaymentCode(cart.id);
  const expiresAt = buildCheckoutExpiration(15);

  // Use guest email if provided, otherwise use session customer email
  const email =
    parsed.isGuest && parsed.guestCustomer
      ? parsed.guestCustomer.email
      : getCartEmail(cart, session?.customer.email ?? null);

  const customerId = parsed.isGuest ? null : (session?.customer.id ?? null);

  const [inserted] = await db
    .insert(checkoutSessions)
    .values({
      paymentCode,
      cartId: parsed.cartId,
      linesSnapshot,
      amount: totals.amount,
      currency: totals.currency,
      email,
      customerId,
      isGuest: parsed.isGuest ?? false,
      guestEmail: parsed.guestCustomer?.email ?? null,
      guestPhone: parsed.guestCustomer?.phone ?? null,
      guestFirstName: parsed.guestCustomer?.firstName ?? null,
      guestLastName: parsed.guestCustomer?.lastName ?? null,
      paymentMethod: parsed.paymentMethod,
      shippingAddress: parsed.shippingAddress,
      discountCodes: parsed.discountCodes ?? null,
      discountAmount: parsed.discountAmount ?? null,
      expiresAt,
    })
    .returning({ id: checkoutSessions.id });

  if (!inserted) {
    throw new Error("Failed to create checkout session");
  }

  const bank = buildBankDetails();
  const qrImageUrl = buildVietQrImageUrl(totals.amount, paymentCode);

  return {
    summary: {
      sessionId: inserted.id,
      paymentCode,
      amount: totals.amount,
      currency: totals.currency,
      expiresAt,
      cartId: parsed.cartId,
      qrImageUrl,
      bank,
      discountCodes: parsed.discountCodes ?? null,
      discountAmount: parsed.discountAmount ?? null,
    },
  };
}

export async function getCheckoutSession(
  id: string,
): Promise<CheckoutSessionState> {
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, id))
    .limit(1);

  if (!session) {
    throw new Error("Session not found");
  }

  let status = session.status;

  if (
    status === "pending" &&
    session.expiresAt &&
    session.expiresAt.getTime() < Date.now()
  ) {
    status = "expired";
    await db
      .update(checkoutSessions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(checkoutSessions.id, id));
  }

  const bank = buildBankDetails();
  const qrImageUrl = buildVietQrImageUrl(session.amount, session.paymentCode);

  const discountCodes = session.discountCodes
    ? discountCodesArraySchema.parse(session.discountCodes)
    : null;

  return {
    sessionId: session.id,
    paymentCode: session.paymentCode,
    amount: session.amount,
    currency: session.currency,
    expiresAt: session.expiresAt ?? null,
    cartId: session.cartId,
    qrImageUrl,
    bank,
    status,
    shopifyOrderId: session.shopifyOrderId,
    sepayTransactionId: session.sepayTransactionId,
    lastError: session.lastError,
    isGuest: session.isGuest ?? false,
    discountCodes,
    discountAmount: session.discountAmount,
  };
}

export interface PendingCheckoutSession {
  sessionId: string;
  paymentCode: string;
  amount: number;
  currency: string;
  expiresAt: Date;
  createdAt: Date;
  qrImageUrl: string;
}

/**
 * Get all pending checkout sessions for the current customer
 * Filters out expired sessions automatically
 */
export async function getPendingCheckoutSessions(): Promise<
  PendingCheckoutSession[]
> {
  const session = await readCustomerSessionFromCookies();
  if (!session) {
    return [];
  }

  const now = new Date();
  const sessions = await db
    .select({
      id: checkoutSessions.id,
      paymentCode: checkoutSessions.paymentCode,
      amount: checkoutSessions.amount,
      currency: checkoutSessions.currency,
      expiresAt: checkoutSessions.expiresAt,
      createdAt: checkoutSessions.createdAt,
    })
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.customerId, session.customer.id),
        eq(checkoutSessions.status, "pending"),
        gt(checkoutSessions.expiresAt, now),
      ),
    )
    .orderBy(desc(checkoutSessions.createdAt));

  return sessions
    .filter((s): s is typeof s & { expiresAt: Date } => s.expiresAt !== null)
    .map((s) => ({
      sessionId: s.id,
      paymentCode: s.paymentCode,
      amount: s.amount,
      currency: s.currency,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      qrImageUrl: buildVietQrImageUrl(s.amount, s.paymentCode),
    }));
}

// Export alias for backward compatibility
export { createCheckoutSession as createSession };
