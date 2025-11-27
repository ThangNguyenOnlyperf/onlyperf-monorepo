import type { z } from "zod";
import { env } from "@/env";
import type {
  CheckoutLineSnapshot,
  checkoutSessionShippingAddressSchema,
} from "./session-schema";

export interface StorefrontCartMoney {
  amount?: string | null;
  currencyCode?: string | null;
}

export interface StorefrontCartLineMerchandise {
  __typename?: string | null;
  id?: string | null;
  title?: string | null;
  sku?: string | null;
  price?: StorefrontCartMoney | null;
  product?: {
    title?: string | null;
    vendor?: string | null;
  } | null;
}

export interface StorefrontCartLine {
  quantity?: number | null;
  merchandise?: StorefrontCartLineMerchandise | null;
}

export interface StorefrontCart {
  id: string;
  cost?: {
    subtotalAmount?: StorefrontCartMoney | null;
    totalAmount?: StorefrontCartMoney | null;
  } | null;
  buyerIdentity?: { email?: string | null } | null;
  lines?: {
    edges?: Array<{ node?: StorefrontCartLine | null } | null> | null;
  } | null;
}

export type StoredAddress = z.infer<
  typeof checkoutSessionShippingAddressSchema
>;

export interface CartTotals {
  amount: number;
  currency: string;
}

export function parseCartTotals(cart: StorefrontCart): CartTotals {
  const amount = cart.cost?.totalAmount?.amount;
  const currency = cart.cost?.totalAmount?.currencyCode ?? "VND";

  if (!amount) {
    return { amount: 0, currency };
  }

  const parsed = Number.parseFloat(amount);
  if (Number.isFinite(parsed)) {
    return { amount: Math.round(parsed), currency };
  }

  return { amount: 0, currency };
}

export function mapCartLinesSnapshot(
  cart: StorefrontCart,
  fallbackCurrency: string,
): CheckoutLineSnapshot[] {
  const edges = cart.lines?.edges ?? [];

  return edges
    .map((edge) => edge?.node)
    .filter((node): node is StorefrontCartLine => Boolean(node))
    .map((node) => {
      const merchandise = node.merchandise;
      if (!merchandise || merchandise.__typename !== "ProductVariant") {
        return null;
      }

      const variantId = merchandise.id;
      if (!variantId) {
        return null;
      }

      return {
        variantId,
        quantity: Math.max(0, node.quantity ?? 0),
        title: merchandise.product?.title ?? merchandise.title ?? "",
        variantTitle: merchandise.title ?? null,
        sku: merchandise.sku ?? null,
        vendor: merchandise.product?.vendor ?? null,
        price: {
          amount: merchandise.price?.amount ?? "0",
          currencyCode: merchandise.price?.currencyCode ?? fallbackCurrency,
        },
      } satisfies CheckoutLineSnapshot;
    })
    .filter(
      (line): line is CheckoutLineSnapshot =>
        Boolean(line) && (line?.quantity ?? 0) > 0,
    );
}

export function getCartEmail(
  cart: StorefrontCart,
  overrideEmail?: string | null,
) {
  return overrideEmail ?? cart.buyerIdentity?.email ?? null;
}

export function buildCheckoutExpiration(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

const paymentData = {
  bankAccount: env.SEPAY_BANK_ACCOUNT,
  bankName: env.SEPAY_BANK_NAME,
  bankBin: env.SEPAY_BANK_BIN,
  template: "compact",
  download: false,
};

export function buildVietQrImageUrl(amount: number, paymentCode: string) {
  const qrUrl = `https://qr.sepay.vn/img?acc=${paymentData.bankAccount}&bank=${paymentData.bankName}&amount=${String(amount)}&des=${paymentCode}&template=${paymentData.template}&download=${paymentData.download}`;
  return qrUrl;
}

export function buildBankDetails() {
  return {
    bin: paymentData.bankBin ?? "",
    accountNumber: paymentData.bankAccount,
    accountName: paymentData.bankName,
  };
}
