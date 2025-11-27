"use client";

import { CartCost, Money, useCart } from "@shopify/hydrogen-react";
import type { CartLine } from "@shopify/hydrogen-react/storefront-api-types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { DiscountCodeInput } from "@/components/cart/DiscountCodeInput";
import { PendingPaymentBanner } from "@/components/cart/PendingPaymentBanner";
import { useLocale } from "@/contexts/LocaleContext";
import { getCheckoutCopy } from "@/lib/i18n/checkout";

interface CartSummaryProps {
  className?: string;
  customerAccessToken?: string | null;
}

interface SelectedOption {
  name?: string | null;
  value?: string | null;
}

function buildSelectedOptions(options: SelectedOption[] | undefined): string {
  if (!options?.length) {
    return "Biến thể mặc định";
  }

  return options
    .filter((option) => option?.value)
    .map((option) => `${option?.name}: ${option?.value}`)
    .join(" · ");
}

export function CartSummary({
  className,
  customerAccessToken,
}: CartSummaryProps) {
  const cart = useCart();
  const buyerIdentityUpdate = cart.buyerIdentityUpdate;
  const lines = useMemo(
    () => (cart.lines ?? []).filter((line): line is CartLine => Boolean(line)),
    [cart.lines],
  );
  const [removingLineId, setRemovingLineId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const router = useRouter();
  const { redirectToLogin } = useAuthRedirect();
  const { locale } = useLocale();
  const copy = useMemo(() => getCheckoutCopy(locale), [locale]);
  const busy = cart.status !== "idle" && cart.status !== "uninitialized";

  // useEffect(() => {
  //   if (!customerAccessToken) return;
  //   if (typeof buyerIdentityUpdate !== "function") return;
  //   buyerIdentityUpdate({ customerAccessToken }).catch((error) => {
  //     console.error("Failed to sync cart buyer identity", error);
  //   });
  // }, [buyerIdentityUpdate, customerAccessToken]);

  const handleAdjustQuantity = useCallback(
    async (
      lineId: string | null | undefined,
      currentQuantity: number,
      delta: number,
    ) => {
      if (!lineId || delta === 0 || busy) {
        return;
      }

      const nextQuantity = currentQuantity + delta;

      if (nextQuantity <= 0) {
        setRemovingLineId(lineId);
        await cart.linesRemove([lineId]);
        setRemovingLineId(null);
        return;
      }

      await cart.linesUpdate([
        {
          id: lineId,
          quantity: nextQuantity,
        },
      ]);
    },
    [busy, cart],
  );

  const handleRemoveLine = useCallback(
    async (lineId: string | null | undefined) => {
      if (!lineId || busy) {
        return;
      }

      setRemovingLineId(lineId);
      await cart.linesRemove([lineId]);
      setRemovingLineId(null);
    },
    [busy, cart],
  );

  const handleCheckout = useCallback(async () => {
    const cartId = cart?.id;
    if (!cartId) {
      setCheckoutError(copy.actions.checkoutErrorNoCart);
      return;
    }

    setCheckoutError(null);

    // Redirect to order summary page to collect shipping info and payment method
    router.push("/checkout/order-summary");
  }, [cart?.id, copy.actions.checkoutErrorNoCart, router]);

  const handleGuestCheckout = useCallback(() => {
    const cartId = cart?.id;
    if (!cartId) {
      setCheckoutError(copy.actions.checkoutErrorNoCart);
      return;
    }

    setCheckoutError(null);

    // Redirect to order summary page with guest flag
    router.push("/checkout/order-summary?guest=true");
  }, [cart?.id, copy.actions.checkoutErrorNoCart, router]);

  const handleLogin = useCallback(() => {
    redirectToLogin("/checkout/order-summary");
  }, [redirectToLogin]);

  const totalQuantity =
    cart.totalQuantity ??
    lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);

  const checkoutDisabled = lines.length === 0 || busy;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${className}`}>
      {/* Cart Items Section - Left side (2/3 width on desktop) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Pending Payment Banner */}
        <PendingPaymentBanner cartId={cart?.id} />

        {/* Cart Items */}
        <div className="space-y-4">
          {lines.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Giỏ hàng của bạn đang trống.
            </p>
          ) : (
            <ul className="space-y-4">
              {lines.map((line, index) => {
                if (!line) return null;
                const lineId = line.id ?? `line-${index}`;
                const merchandise = line.merchandise as
                  | (CartLine["merchandise"] & {
                      product?: {
                        title?: string | null;
                        handle?: string | null;
                      } | null;
                      image?: {
                        url?: string | null;
                        altText?: string | null;
                      } | null;
                      selectedOptions?: SelectedOption[];
                      availableForSale?: boolean | null;
                      quantityAvailable?: number | null;
                    })
                  | undefined;

                const title =
                  merchandise?.product?.title ??
                  merchandise?.title ??
                  "Sản phẩm trong giỏ";
                const variantDescription = buildSelectedOptions(
                  merchandise?.selectedOptions,
                );
                const lineImage = merchandise?.image;
                const availableForSale = merchandise?.availableForSale ?? true;
                const quantityAvailable =
                  merchandise?.quantityAvailable ?? null;
                const quantity = line.quantity ?? 0;

                const disableDecrease = busy || quantity <= 1;
                const disableIncrease =
                  busy ||
                  (typeof quantityAvailable === "number" &&
                    quantityAvailable > 0 &&
                    quantity >= quantityAvailable);
                const removing = removingLineId === lineId;

                return (
                  <li
                    key={lineId}
                    className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="relative h-20 w-20 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      {lineImage?.url ? (
                        <Image
                          src={lineImage.url}
                          alt={lineImage.altText ?? title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                          Không có ảnh
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 text-sm">
                      {/* Top row: Title and Price */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {variantDescription}
                          </p>
                          <p
                            className={`mt-1 text-xs font-medium ${availableForSale ? "text-emerald-600" : "text-rose-500"}`}
                          >
                            {availableForSale
                              ? quantityAvailable && quantityAvailable > 0
                                ? `Còn ${quantityAvailable} sản phẩm`
                                : "Còn hàng"
                              : "Hết hàng"}
                          </p>
                        </div>
                        <div className="text-right">
                          {line.cost?.totalAmount ? (
                            <Money
                              as="span"
                              data={line.cost.totalAmount}
                              className="text-base font-semibold text-zinc-900 dark:text-white"
                            />
                          ) : null}
                        </div>
                      </div>

                      {/* Bottom row: Quantity controls and Remove link */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center rounded-full border border-zinc-300 bg-white pr-2 dark:border-zinc-700 dark:bg-transparent">
                            <button
                              type="button"
                              onClick={() =>
                                handleAdjustQuantity(line.id, quantity, -1)
                              }
                              className="cursor-pointer h-8 w-8 text-xl leading-none text-zinc-600 transition hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400"
                              aria-label={`Giảm số lượng ${title}`}
                              disabled={disableDecrease || removing}
                            >
                              −
                            </button>
                            <span className="px-2 text-sm font-semibold text-zinc-900 dark:text-white">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleAdjustQuantity(line.id, quantity, 1)
                              }
                              className="cursor-pointer h-8 w-8 text-xl leading-none text-zinc-600 transition hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400"
                              aria-label={`Tăng số lượng ${title}`}
                              disabled={disableIncrease || removing}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-sm text-zinc-600 underline transition hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-400 dark:hover:text-white"
                          disabled={busy || removing}
                        >
                          {removing ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Shipping Info */}
        {lines.length > 0 && (
          <div className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <svg
              className="h-5 w-5 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            <p>Miễn phí vận chuyển cho đơn hàng trên 1.000.000₫</p>
          </div>
        )}
      </div>

      {/* Order Summary Sidebar - Right side (1/3 width on desktop) */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
            Tóm tắt đơn hàng
          </h3>

          {/* Discount Code Input */}
          <div className="mb-6">
            <DiscountCodeInput />
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">
                Tạm tính:
              </span>
              <CartCost
                as="span"
                amountType="subtotal"
                className="text-base font-semibold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex items-start justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">
                Phí vận chuyển:
              </span>
              <span className="text-xs text-zinc-500 text-right">
                Tính từ địa chỉ
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-zinc-300 pt-4 mt-4 dark:border-zinc-700">
            <span className="text-lg font-semibold text-zinc-900 dark:text-white">
              Tổng cộng:
            </span>
            <CartCost
              as="span"
              amountType="total"
              className="text-2xl font-bold text-zinc-900 dark:text-white"
            />
          </div>

          {/* Checkout Buttons */}
          {customerAccessToken ? (
            // Authenticated user - show single checkout button
            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[#4A1942] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3A1232] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A1942] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={checkoutDisabled}
              onClick={handleCheckout}
            >
              Tiếp tục thanh toán
            </button>
          ) : (
            // Guest user - show guest checkout and login options
            <div className="mt-6 space-y-3">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-md bg-[#4A1942] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3A1232] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A1942] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={checkoutDisabled}
                onClick={handleGuestCheckout}
              >
                Thanh toán không đăng nhập
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                disabled={checkoutDisabled}
                onClick={handleLogin}
              >
                Thanh toán
              </button>
            </div>
          )}

          {checkoutError && (
            <p className="text-xs text-rose-500 mt-2">{checkoutError}</p>
          )}

          {/* Payment Methods */}
          <div className="mt-6 pt-6 border-t border-zinc-300 dark:border-zinc-700">
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Bạn có thể thanh toán bằng
            </p>
            <div className="flex items-center justify-center gap-3">
              {/* Bank Transfer Icon */}
              <div className="flex items-center justify-center w-12 h-8 rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                <svg
                  className="w-6 h-6 text-zinc-700 dark:text-zinc-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              {/* COD Icon */}
              <div className="flex items-center justify-center w-12 h-8 rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                <svg
                  className="w-6 h-6 text-zinc-700 dark:text-zinc-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
