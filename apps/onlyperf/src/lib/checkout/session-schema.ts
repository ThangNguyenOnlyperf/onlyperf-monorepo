import { z } from "zod";
import { guestEmailSchema } from "@/lib/validation/email";
import { vietnamesePhoneSchema } from "@/lib/validation/phone";

export const checkoutSessionShippingAddressSchema = z.object({
  address1: z.string().min(1, "Address is required"),
  address2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  province: z.string().optional().nullable(),
  country: z.string().min(1, "Country is required"),
  zip: z.string().min(1, "Postal code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export const checkoutLineSnapshotSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(0),
  title: z.string(),
  variantTitle: z.string().nullable(),
  sku: z.string().nullable(),
  vendor: z.string().nullable(),
  price: z.object({
    amount: z.string(),
    currencyCode: z.string(),
  }),
});

export const checkoutLineSnapshotsArraySchema = z.array(
  checkoutLineSnapshotSchema,
);

export type CheckoutLineSnapshot = z.infer<typeof checkoutLineSnapshotSchema>;

/**
 * Guest customer information schema
 */
export const guestCustomerSchema = z.object({
  email: guestEmailSchema,
  phone: vietnamesePhoneSchema,
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name is too long"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name is too long"),
});

export type GuestCustomer = z.infer<typeof guestCustomerSchema>;

/**
 * Discount code schema (single code only)
 */
export const discountCodeSchema = z
  .string()
  .min(1, "Discount code cannot be empty")
  .max(50, "Discount code is too long");

export const discountCodesArraySchema = z
  .array(discountCodeSchema)
  .max(1, "Only one discount code is allowed");

/**
 * Base schema for checkout session creation
 * Either authenticated (with customerId) or guest (with guestCustomer)
 */
export const createCheckoutSessionInputSchema = z
  .object({
    cartId: z.string().min(1),
    email: z.string().email().optional(),
    customerId: z.string().optional(),
    paymentMethod: z.enum(["bank_transfer", "cod"]).default("bank_transfer"),
    shippingAddress: checkoutSessionShippingAddressSchema,
    // Guest checkout fields
    isGuest: z.boolean().default(false),
    guestCustomer: guestCustomerSchema.optional(),
    // Discount fields
    discountCodes: discountCodesArraySchema.optional(),
    discountAmount: z.number().int().min(0).optional(), // Amount in cents (VND)
  })
  .refine(
    (data) => {
      // Either must have customerId (authenticated) or guestCustomer (guest)
      return Boolean(data.customerId) || Boolean(data.guestCustomer);
    },
    {
      message: "Either customerId or guest customer information is required",
      path: ["customerId"],
    },
  );

export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionInputSchema
>;

export interface CheckoutSessionBankDetails {
  bin: string;
  accountNumber: string;
  accountName: string;
}

export interface CheckoutSessionSummary {
  sessionId: string;
  paymentCode: string;
  amount: number;
  currency: string;
  expiresAt: Date | null;
  cartId: string;
  qrImageUrl: string;
  bank: CheckoutSessionBankDetails;
  discountCodes?: string[] | null;
  discountAmount?: number | null;
}

export interface CheckoutSessionState extends CheckoutSessionSummary {
  status: "pending" | "paid" | "failed" | "expired";
  shopifyOrderId: string | null;
  sepayTransactionId: string | null;
  lastError: string | null;
  isGuest: boolean;
}
