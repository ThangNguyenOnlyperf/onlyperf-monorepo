"use client";

import { CartCost, Money, useCart } from "@shopify/hydrogen-react";
import type { CartLine } from "@shopify/hydrogen-react/storefront-api-types";
import { ShoppingCartIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useCartDrawer } from "@/hooks/useCartDrawer";
import { useLocale } from "@/contexts/LocaleContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { getCheckoutCopy } from "@/lib/i18n/checkout";

interface SelectedOption {
  name?: string | null;
  value?: string | null;
}

interface CartDrawerProps {
  // No props needed - auth state comes from context
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

function CartItemSkeleton() {
  return (
    <li className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Skeleton className="h-20 w-20 flex-shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </li>
  );
}

export function CartDrawer({}: CartDrawerProps) {
  const { isOpen, closeCartDrawer } = useCartDrawer();
  const cart = useCart();
  const router = useRouter();
  const { redirectToLogin } = useAuthRedirect();
  const { locale } = useLocale();
  const { isAuthenticated, session } = useUserSession();
  const copy = useMemo(() => getCheckoutCopy(locale), [locale]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const lines = useMemo(
    () => (cart.lines ?? []).filter((line): line is CartLine => Boolean(line)),
    [cart.lines],
  );

  const totalQuantity =
    cart.totalQuantity ??
    lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);

  // Detect if cart is currently updating
  const isCartUpdating =
    cart.status !== "idle" && cart.status !== "uninitialized";

  const handleViewCart = useCallback(() => {
    closeCartDrawer();
    router.push("/cart");
  }, [closeCartDrawer, router]);

  const handleCheckout = useCallback(() => {
    const cartId = cart?.id;
    if (!cartId) {
      setCheckoutError(copy.actions.checkoutErrorNoCart);
      return;
    }

    // Redirect to order summary page to collect shipping info before creating session
    closeCartDrawer();
    router.push("/checkout/order-summary");
  }, [closeCartDrawer, router, cart?.id, copy.actions.checkoutErrorNoCart]);

  const handleGuestCheckout = useCallback(() => {
    const cartId = cart?.id;
    if (!cartId) {
      setCheckoutError(copy.actions.checkoutErrorNoCart);
      return;
    }

    // Redirect to order summary page with guest flag
    closeCartDrawer();
    router.push("/checkout/order-summary?guest=true");
  }, [closeCartDrawer, router, cart?.id, copy.actions.checkoutErrorNoCart]);

  const handleLogin = useCallback(() => {
    closeCartDrawer();
    redirectToLogin("/checkout/order-summary");
  }, [closeCartDrawer, redirectToLogin]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCartDrawer()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 duration-200 data-[state=closed]:duration-200 data-[state=open]:duration-200 sm:max-w-md dark:bg-zinc-900"
      >
        <SheetHeader className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <ShoppingCartIcon className="h-5 w-5" />
            Giỏ hàng
          </SheetTitle>
          {lines.length > 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {totalQuantity} sản phẩm
            </p>
          )}
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {isCartUpdating ? (
            <ul className="space-y-4">
              <CartItemSkeleton />
              <CartItemSkeleton />
            </ul>
          ) : lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-800">
                <ShoppingCartIcon className="h-12 w-12 text-zinc-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-zinc-900 dark:text-white">
                  Giỏ hàng trống
                </p>
                <p className="text-sm text-zinc-500">
                  Thêm sản phẩm để bắt đầu mua sắm
                </p>
              </div>
              <SheetClose asChild>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-md bg-[#4A1942] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3A1232] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A1942]"
                >
                  Tiếp tục mua sắm
                </Link>
              </SheetClose>
            </div>
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
                const quantity = line.quantity ?? 0;

                return (
                  <li
                    key={lineId}
                    className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      {lineImage?.url ? (
                        <Image
                          src={lineImage.url}
                          alt={lineImage.altText ?? title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                          Không có
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                      <div>
                        <p className="truncate text-base font-medium text-zinc-900 dark:text-white">
                          {title}
                        </p>
                        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {variantDescription}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">
                          Số lượng: {quantity}
                        </span>
                        {line.cost?.totalAmount && (
                          <Money
                            as="span"
                            data={line.cost.totalAmount}
                            className="text-sm font-semibold text-zinc-900 dark:text-white"
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer with actions */}
        {lines.length > 0 && (
          <SheetFooter className="border-t border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="w-full space-y-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-base">
                <span className="font-medium text-zinc-900 dark:text-white">
                  Tạm tính
                </span>
                <CartCost
                  as="span"
                  amountType="subtotal"
                  className="text-lg font-semibold text-zinc-900 dark:text-white"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Phí vận chuyển và thuế sẽ được tính khi thanh toán
              </p>

              {/* Action Buttons */}
              <div className="space-y-2">
                {isAuthenticated ? (
                  // Authenticated user - show single checkout button
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="inline-flex w-full items-center justify-center rounded-md bg-[#4A1942] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3A1232] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A1942]"
                  >
                    Thanh toán
                  </button>
                ) : (
                  // Guest user - show guest checkout and login options
                  <>
                    <button
                      type="button"
                      onClick={handleGuestCheckout}
                      className="inline-flex w-full items-center justify-center rounded-md bg-[#4A1942] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3A1232] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A1942]"
                    >
                      Thanh toán không đăng nhập
                    </button>
                    <button
                      type="button"
                      onClick={handleLogin}
                      className="inline-flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                    >
                      Thanh toán
                    </button>
                  </>
                )}
                {checkoutError && (
                  <p className="text-xs text-rose-500">{checkoutError}</p>
                )}
                <button
                  type="button"
                  onClick={handleViewCart}
                  className="inline-flex w-full items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                >
                  Xem giỏ hàng
                </button>
              </div>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
