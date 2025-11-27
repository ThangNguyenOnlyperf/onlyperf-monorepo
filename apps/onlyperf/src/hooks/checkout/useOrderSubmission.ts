import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { saveCustomerAddress } from "@/actions/addresses";
import { createCheckoutSession, createCODOrder } from "@/actions/checkout";
import type {
  OrderSummaryFormData,
  SavedAddressData,
  ShopifyAddressData,
} from "@/lib/checkout/order-summary-schema";
import { convertToShopifyAddress } from "@/lib/checkout/order-summary-schema";
import type { CustomerSession } from "@/lib/shopify/customer-account";
interface DiscountCode {
  code: string;
  applicable: boolean;
}

interface DiscountAllocation {
  discountedAmount: {
    amount: string;
    currencyCode: string;
  };
}

interface UseOrderSubmissionOptions {
  cart:
    | {
        id?: string;
        discountCodes?: (DiscountCode | undefined)[];
        discountAllocations?: unknown;
      }
    | null
    | undefined;
  customer: CustomerSession["customer"] | null;
  savedAddresses: SavedAddressData[];
  isGuest?: boolean;
}

/**
 * Custom hook for handling order submission logic
 * Manages both COD and Bank Transfer payment flows
 * Supports both authenticated and guest checkouts
 */
export function useOrderSubmission({
  cart,
  customer,
  savedAddresses,
  isGuest = false,
}: UseOrderSubmissionOptions) {
  const router = useRouter();

  /**
   * Get shipping address from form data
   * Either from selected saved address or new address
   */
  const getShippingAddress = useCallback(
    (data: OrderSummaryFormData): ShopifyAddressData => {
      if (data.useExistingAddress && data.selectedAddressId) {
        // Use existing saved address
        const selected = savedAddresses.find(
          (addr) => addr.id === data.selectedAddressId,
        );
        if (!selected) {
          throw new Error("Selected address not found");
        }

        return {
          firstName: selected.firstName,
          lastName: selected.lastName,
          phoneNumber: selected.phoneNumber,
          address1: selected.address1,
          address2: selected.address2,
          city: selected.city,
          province: null,
          country: selected.country || "VN",
          zip: selected.zip || "700000",
          company: selected.company,
        };
      }

      // Convert new Vietnamese address to Shopify format
      const vietnameseAddress = {
        firstName: data.firstName!,
        lastName: data.lastName!,
        phone: data.phone!,
        provinceCode: data.provinceCode!,
        provinceName: data.provinceName!,
        districtCode: data.districtCode!,
        districtName: data.districtName!,
        wardCode: data.wardCode!,
        wardName: data.wardName!,
        address1: data.address1!,
        address2: data.address2,
        city: data.provinceName!,
        province: null,
        country: "VN",
        zip: "700000",
        company: data.company,
      };

      return convertToShopifyAddress(vietnameseAddress);
    },
    [savedAddresses],
  );

  /**
   * Save new address to customer account
   */
  const saveNewAddress = useCallback(
    async (shippingAddress: ShopifyAddressData): Promise<boolean> => {
      try {
        const addressResult = await saveCustomerAddress(
          shippingAddress,
          savedAddresses.length === 0, // Make default if first address
        );

        if (addressResult.success) {
          return true;
        }

        console.error("❌ Address save failed:", addressResult.error);
        return false;
      } catch (error) {
        console.error("❌ Failed to save address (exception):", error);
        return false;
      }
    },
    [savedAddresses.length],
  );

  /**
   * Handle COD (Cash On Delivery) order creation
   */
  const handleCODOrder = useCallback(
    async (shippingAddress: ShopifyAddressData, data: OrderSummaryFormData) => {
      if (!cart?.id) {
        throw new Error("Cart ID not found");
      }

      // Extract discount codes and amounts
      const discountCodes = (cart.discountCodes || [])
        .filter((dc): dc is DiscountCode => Boolean(dc && dc.applicable))
        .map((dc) => dc.code);

      const discountAmount =
        Array.isArray(cart.discountAllocations) && cart.discountAllocations[0]
          ? Math.round(
              parseFloat(
                (cart.discountAllocations[0] as DiscountAllocation)
                  .discountedAmount.amount,
              ) * 100,
            )
          : undefined;

      const result = await createCODOrder({
        cartId: cart.id,
        email: isGuest ? data.guestEmail : customer?.email,
        customerId: isGuest ? undefined : customer?.id,
        paymentMethod: "cod",
        shippingAddress,
        isGuest,
        guestCustomer: isGuest
          ? {
              email: data.guestEmail!,
              phone: data.phone!,
              firstName: data.firstName!,
              lastName: data.lastName!,
            }
          : undefined,
        discountCodes: discountCodes.length > 0 ? discountCodes : undefined,
        discountAmount,
      });

      if (result.success) {
        // Clear cart and redirect to success
        const params = new URLSearchParams();
        params.set("method", "cod");
        if (result.orderId) {
          params.set("orderId", result.orderId);
        }
        if (isGuest) {
          params.set("guest", "true");
        }
        router.push(`/checkout/success?${params.toString()}`);
      }
    },
    [cart, customer, isGuest, router],
  );

  /**
   * Handle Bank Transfer order creation
   */
  const handleBankTransferOrder = useCallback(
    async (shippingAddress: ShopifyAddressData, data: OrderSummaryFormData) => {
      if (!cart?.id) {
        throw new Error("Cart ID not found");
      }

      // Extract discount codes and amounts
      const discountCodes = (cart.discountCodes || [])
        .filter((dc): dc is DiscountCode => Boolean(dc && dc.applicable))
        .map((dc) => dc.code);

      const discountAmount =
        Array.isArray(cart.discountAllocations) && cart.discountAllocations[0]
          ? Math.round(
              parseFloat(
                (cart.discountAllocations[0] as DiscountAllocation)
                  .discountedAmount.amount,
              ) * 100,
            )
          : undefined;

      const result = await createCheckoutSession({
        cartId: cart.id,
        email: isGuest ? data.guestEmail : customer?.email,
        customerId: isGuest ? undefined : customer?.id,
        paymentMethod: "bank_transfer",
        shippingAddress,
        isGuest,
        guestCustomer: isGuest
          ? {
              email: data.guestEmail!,
              phone: data.phone!,
              firstName: data.firstName!,
              lastName: data.lastName!,
            }
          : undefined,
        discountCodes: discountCodes.length > 0 ? discountCodes : undefined,
        discountAmount,
      });

      if (result.summary.sessionId) {
        // Save session ID to localStorage for recovery
        try {
          localStorage.setItem(
            "onlyperf_pending_session",
            JSON.stringify({
              sessionId: result.summary.sessionId,
              cartId: cart.id,
              createdAt: new Date().toISOString(),
              expiresAt: result.summary.expiresAt?.toISOString(),
            }),
          );
        } catch (error) {
          console.error("Failed to save session to localStorage:", error);
        }

        router.push(`/checkout/${result.summary.sessionId}`);
      }
    },
    [cart, customer, isGuest, router],
  );

  /**
   * Main submission handler
   */
  const handleSubmit = useCallback(
    async (data: OrderSummaryFormData) => {
      if (!cart) {
        throw new Error("Cart not found");
      }

      // Get shipping address from form data
      const shippingAddress = getShippingAddress(data);

      // Save new address if authenticated user and not using existing one
      if (!isGuest && !data.useExistingAddress) {
        await saveNewAddress(shippingAddress);
      }

      // Route based on payment method
      if (data.paymentMethod === "cod") {
        await handleCODOrder(shippingAddress, data);
      } else {
        await handleBankTransferOrder(shippingAddress, data);
      }
    },
    [
      cart,
      isGuest,
      getShippingAddress,
      saveNewAddress,
      handleCODOrder,
      handleBankTransferOrder,
    ],
  );

  return {
    handleSubmit,
  };
}
