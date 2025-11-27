"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { CART_FOR_SEPAY_CHECKOUT_QUERY } from "@/lib/checkout/session-query";
import {
  type CheckoutLineSnapshot,
  type CreateCheckoutSessionInput,
  checkoutSessionShippingAddressSchema,
  createCheckoutSessionInputSchema,
} from "@/lib/checkout/session-schema";
import {
  buildCheckoutExpiration,
  getCartEmail,
  mapCartLinesSnapshot,
  parseCartTotals,
  type StoredAddress,
  type StorefrontCart,
} from "@/lib/checkout/session-utils";
import { generatePaymentCode } from "@/lib/payments/payment-code";
import { buildDiscountCodeInput, createAdminOrder } from "@/lib/shopify/admin";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import {
  buildCustomerInput,
  buildFullNameFromAddress,
} from "@/lib/shopify/customer-utils";
import { PRIMARY_LOCALE } from "@/lib/shopify/locale";
import { storefrontQuery } from "@/lib/shopify/storefront";
import { db } from "@/server/db";
import { checkoutSessions } from "@perf/db/schema";
import { notifyWarehouseOrderPaid } from "../warehouseActions";

export interface CreateCODOrderResult {
  success: boolean;
  orderId: string;
  message: string;
}

function buildOrderInput(
  linesSnapshot: CheckoutLineSnapshot[],
  shippingAddress: StoredAddress,
  email: string | null,
  customerId: string | undefined,
  paymentCode: string,
  currency: string,
  discountCode?: string,
  discountAmount?: number,
) {
  const lineItems = linesSnapshot
    .filter((line) => line.variantId && line.quantity > 0)
    .map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
      sku: line.sku ?? undefined,
      title: line.title,
      variantTitle: line.variantTitle ?? undefined,
      vendor: line.vendor ?? undefined,
    }));

  const customerInput = buildCustomerInput(customerId);

  return {
    currency: currency ?? "VND",
    email: email ?? undefined,
    customer: customerInput,
    tags: ["cod", paymentCode],
    note: `COD payment ${paymentCode}`,
    shippingAddress: shippingAddress
      ? {
          address1: shippingAddress.address1 ?? undefined,
          address2: shippingAddress.address2 ?? undefined,
          city: shippingAddress.city ?? undefined,
          province: shippingAddress.province ?? undefined,
          country: shippingAddress.country ?? undefined,
          zip: shippingAddress.zip ?? undefined,
          firstName: shippingAddress.firstName ?? undefined,
          lastName: shippingAddress.lastName ?? undefined,
          phone: shippingAddress.phoneNumber ?? undefined,
        }
      : undefined,
    lineItems,
    sourceName: "cod",
    financialStatus: "PENDING",
    discountCode: buildDiscountCodeInput(
      discountCode,
      discountAmount,
      currency,
    ),
  };
}

/**
 * Create a COD (Cash On Delivery) order
 *
 * COD flow:
 * 1. Create a checkout session in DB (for order tracking)
 * 2. Create Shopify order immediately
 * 3. Mark order as "pending" (awaiting payment on delivery)
 * 4. Notify warehouse to prepare shipment
 * 5. Return Shopify order ID and redirect to success page
 */
export async function createCODOrder(
  input: CreateCheckoutSessionInput,
): Promise<CreateCODOrderResult> {
  const parsed = createCheckoutSessionInputSchema.parse(input);

  // Check for customer session only if not guest checkout
  const session = parsed.isGuest
    ? null
    : await readCustomerSessionFromCookies();

  if (!parsed.isGuest && !session) {
    throw new Error("Customer session required for authenticated checkout");
  }

  // Validate payment method is COD
  if (parsed.paymentMethod !== "cod") {
    throw new Error("Invalid payment method for COD order");
  }

  // Fetch cart data with Vietnamese locale
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

  const [recentPending] = await db
    .select({
      id: checkoutSessions.id,
      createdAt: checkoutSessions.createdAt,
    })
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.cartId, parsed.cartId),
        eq(checkoutSessions.paymentMethod, "cod"),
        eq(checkoutSessions.status, "pending"),
      ),
    )
    .orderBy(desc(checkoutSessions.createdAt))
    .limit(1);

  if (recentPending?.createdAt) {
    const ageMs = Date.now() - recentPending.createdAt.getTime();
    if (ageMs < 2 * 60 * 1000) {
      throw new Error(
        "Đơn COD trước đó đang được xử lý. Vui lòng thử lại sau ít phút.",
      );
    }
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
  const expiresAt = buildCheckoutExpiration(15); // COD orders expire after 15 mins

  // Use guest email if provided, otherwise use session customer email
  const email =
    parsed.isGuest && parsed.guestCustomer
      ? parsed.guestCustomer.email
      : getCartEmail(cart, session?.customer.email ?? null);

  const customerId = parsed.isGuest ? null : (session?.customer.id ?? null);

  // Create checkout session record (used for order tracking)
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
      paymentMethod: "cod",
      shippingAddress: parsed.shippingAddress,
      status: "pending", // Will be confirmed by admin after payment received
      expiresAt,
    })
    .returning({ id: checkoutSessions.id });

  if (!inserted) {
    throw new Error("Failed to create COD order");
  }

  try {
    // Validate shipping address from parsed input
    const validatedAddress = checkoutSessionShippingAddressSchema.parse(
      parsed.shippingAddress,
    );

    // Build order input for Shopify
    // For guest orders, pass undefined for customerId - Shopify will create order without customer association
    const orderInput = buildOrderInput(
      linesSnapshot,
      validatedAddress,
      email,
      customerId ?? undefined,
      paymentCode,
      totals.currency,
      parsed.discountCodes?.[0],
      parsed.discountAmount,
    );

    // Create Shopify order
    const shopifyOrder = await createAdminOrder(orderInput, {
      sendReceipt: true,
    });

    // Update DB with Shopify order ID
    await db
      .update(checkoutSessions)
      .set({
        shopifyOrderId: shopifyOrder.id,
        status: "pending", // COD orders stay pending until payment received
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, inserted.id));

    // Notify warehouse about COD order (non-blocking - don't fail if webhook fails)
    try {
      await notifyWarehouseOrderPaid({
        event: "order.paid",
        provider: "cod",
        shopifyOrderId: shopifyOrder.id,
        shopifyOrderNumber: shopifyOrder.name,
        paymentCode,
        amount: totals.amount,
        currency: "VND",
        paidAt: new Date().toISOString(),
        referenceCode: paymentCode,
        gateway: "COD",
        lineItems: linesSnapshot
          .filter((line): line is typeof line & { sku: string } =>
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
          email: email || "noemail@onlyperf.local",
          name: buildFullNameFromAddress(validatedAddress),
          phone: validatedAddress.phoneNumber ?? null,
        },
        shippingAddress: {
          ...validatedAddress,
          province: validatedAddress.province || validatedAddress.city || "",
          name: buildFullNameFromAddress(validatedAddress),
        },
      });
    } catch (warehouseError) {
      console.error(
        "Failed to notify warehouse about COD order:",
        warehouseError,
      );
    }

    return {
      success: true,
      orderId: shopifyOrder.name,
      message: "Đơn hàng COD đã được tạo thành công",
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error("Invalid address data in COD order:", {
        cartId: parsed.cartId,
        errors: error.issues,
      });

      await db
        .update(checkoutSessions)
        .set({
          status: "failed",
          lastError: "Địa chỉ giao hàng không hợp lệ",
          updatedAt: new Date(),
        })
        .where(eq(checkoutSessions.id, inserted.id));

      throw new Error("Địa chỉ giao hàng không hợp lệ");
    }

    // Handle other errors
    console.error("COD order creation failed:", error);

    // Mark session as failed in DB
    await db
      .update(checkoutSessions)
      .set({
        status: "failed",
        lastError:
          error instanceof Error ? error.message : "Failed to create COD order",
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, inserted.id));

    throw error;
  }
}
