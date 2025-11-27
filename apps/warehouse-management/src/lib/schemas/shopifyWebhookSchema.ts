import { z } from "zod";

/**
 * Shopify Webhook Payload Schemas
 * Used for validating incoming order.paid events from Shopify via Sepay
 */

// Shipping Address Schema
export const ShippingAddressSchema = z.object({
  name: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().nullable().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

// Customer Schema
export const CustomerSchema = z.object({
  email: z.string().email("Email không hợp lệ").or(z.literal("")),
  name: z.string().nullable(),
  phone: z.string().nullable(),
});

export type Customer = z.infer<typeof CustomerSchema>;

// Line Item Schema
export const LineItemSchema = z.object({
  sku: z.string().min(1, "SKU là bắt buộc"),
  variantId: z.string().min(1, "Variant ID là bắt buộc"),
  quantity: z.number().int().positive("Số lượng phải là số nguyên dương"),
  price: z.number().nonnegative("Giá phải >= 0"),
  title: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  variantTitle: z.string().optional(),
});

export type LineItem = z.infer<typeof LineItemSchema>;

// Main Order Paid Event Schema
export const OrderPaidEventSchema = z.object({
  event: z.literal("order.paid", {
    errorMap: () => ({ message: "Event type phải là 'order.paid'" }),
  }),
  provider: z.enum(["sepay", "cod"], {
    errorMap: () => ({ message: "Provider phải là 'sepay' hoặc 'cod'" }),
  }),
  shopifyOrderId: z.string().min(1, "Shopify Order ID là bắt buộc"),
  shopifyOrderNumber: z.string().min(1, "Shopify Order Number là bắt buộc"),
  paymentCode: z.string().min(1, "Payment code là bắt buộc"),
  amount: z.number().positive("Số tiền phải > 0"),
  currency: z.literal("VND", {
    errorMap: () => ({ message: "Tiền tệ phải là VND" }),
  }),
  paidAt: z.string().min(1, "Paid at timestamp là bắt buộc"),
  referenceCode: z.string().min(1, "Reference code là bắt buộc"),
  gateway: z.string().min(1, "Payment gateway là bắt buộc"),
  lineItems: z
    .array(LineItemSchema)
    .min(1, "Đơn hàng phải có ít nhất 1 sản phẩm"),
  customer: CustomerSchema,
  shippingAddress: ShippingAddressSchema,
});

export type OrderPaidEvent = z.infer<typeof OrderPaidEventSchema>;

// Webhook Error Schema (for structured error responses)
export const WebhookErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type WebhookError = z.infer<typeof WebhookErrorSchema>;
