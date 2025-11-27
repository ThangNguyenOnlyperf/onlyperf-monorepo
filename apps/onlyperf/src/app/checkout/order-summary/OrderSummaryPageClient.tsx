"use client";

import { useCart } from "@shopify/hydrogen-react";
import type { CartLine } from "@shopify/hydrogen-react/storefront-api-types";
import { useMemo } from "react";
import { OrderSummaryForm } from "@/components/checkout/OrderSummaryForm";
import { useOrderSubmission } from "@/hooks/checkout/useOrderSubmission";
import { formatCustomerAddressForDisplay } from "@/lib/address";
import type { SavedAddressData } from "@/lib/checkout/order-summary-schema";
import type { CustomerSession } from "@/lib/shopify/customer-account";
import type { CustomerAddress } from "@/lib/shopify/customer-account-api";

interface OrderSummaryPageClientProps {
  customer: CustomerSession["customer"] | null;
  savedAddresses: CustomerAddress[] | null;
  isGuest: boolean;
}

/**
 * Order Summary Page Client Component
 *
 * Handles:
 * 1. Cart data from Hydrogen React useCart hook
 * 2. Form submission for both Bank Transfer and COD flows
 * 3. Saved addresses from Shopify customer account (authenticated only)
 * 4. Guest checkout with email/phone collection
 */
export function OrderSummaryPageClient({
  customer,
  savedAddresses,
  isGuest,
}: OrderSummaryPageClientProps) {
  const cart = useCart();

  // Format saved addresses for display (only for authenticated users)
  const formattedAddresses: SavedAddressData[] = useMemo(() => {
    if (isGuest || !savedAddresses || savedAddresses.length === 0) return [];

    return savedAddresses
      .map(formatCustomerAddressForDisplay)
      .filter((addr) => addr.id); // Only include addresses with valid IDs
  }, [isGuest, savedAddresses]);

  const { handleSubmit } = useOrderSubmission({
    // @ts-expect-error - Cart type from Hydrogen React has slightly different shape
    cart,
    customer,
    savedAddresses: formattedAddresses,
    isGuest,
  });

  if (!cart || !cart.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  // Map cart lines to OrderSummaryForm format
  const cartLines = (cart.lines ?? []).filter((line) =>
    Boolean(line),
  ) as CartLine[];
  const cartTotal = {
    amount: cart.cost?.totalAmount?.amount || "0",
    currencyCode: cart.cost?.totalAmount?.currencyCode || "VND",
  };

  // Extract discount information
  const discountCodes = (cart.discountCodes || [])
    .filter((code): code is NonNullable<typeof code> => Boolean(code?.code))
    .map((code) => ({
      code: code.code!,
      applicable: code.applicable ?? true,
    }));
  // @ts-expect-error - discountAllocations exists but not in current type definitions
  const discountAllocations = cart.discountAllocations || [];

  // Calculate total discount amount (sum all allocations)
  const totalDiscountAmount = discountAllocations.reduce(
    (sum: number, allocation: any) => {
      return sum + Number.parseFloat(allocation.discountedAmount.amount);
    },
    0,
  );

  return (
    <OrderSummaryForm
      cartLines={cartLines}
      cartTotal={cartTotal}
      savedAddresses={formattedAddresses}
      onSubmit={handleSubmit}
      isGuest={isGuest}
      discountCodes={discountCodes}
      totalDiscountAmount={totalDiscountAmount}
    />
  );
}
