"use client";

import { useCart } from "@shopify/hydrogen-react";
import { CheckCircle2, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type CheckoutSuccessClientProps = {
  orderId: string | null;
  method: string;
};

export function CheckoutSuccessClient({
  orderId,
  method,
}: CheckoutSuccessClientProps) {
  const isCod = method === "cod";
  const cart = useCart();

  useEffect(() => {
    const clearCart = async () => {
      const lineIds = cart.lines
        ?.map((line) => line?.id)
        .filter(Boolean) as string[];
      if (lineIds.length > 0) {
        await cart.linesRemove(lineIds);
      }
    };

    // Clear pending session from localStorage
    try {
      localStorage.removeItem("onlyperf_pending_session");
    } catch (error) {
      console.error("Failed to clear pending session:", error);
    }

    clearCart();
  }, [cart]);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold mb-3">
                {isCod ? "Đặt hàng thành công!" : "Cảm ơn bạn đã thanh toán!"}
              </h1>
              <p className="text-base text-muted-foreground">
                {isCod
                  ? "Đơn hàng của bạn đã được ghi nhận. Vui lòng chuẩn bị thanh toán khi nhận hàng."
                  : "Chúng tôi đã xác nhận khoản thanh toán qua ngân hàng. Đơn hàng của bạn sẽ được xử lý và gửi tới bạn trong thời gian sớm nhất."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <Button asChild className="h-12">
                <Link href="/account">
                  <Package className="w-4 h-4 mr-2" />
                  Xem đơn hàng của tôi
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12">
                <Link href="/">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Tiếp tục mua sắm
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
