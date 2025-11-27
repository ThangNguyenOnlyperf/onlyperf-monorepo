"use client";

import { HelpCircle, ShoppingBag, ShoppingCart, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutFailedClient() {
  useEffect(() => {
    // Clear pending session from localStorage on failed page
    try {
      localStorage.removeItem("onlyperf_pending_session");
    } catch (error) {
      console.error("Failed to clear pending session:", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="text-center space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold mb-3 text-red-600">
                Thanh toán chưa hoàn tất
              </h1>
              <p className="text-base text-muted-foreground">
                Chúng tôi chưa nhận được khoản thanh toán của bạn. Vui lòng
                kiểm tra lại thông tin chuyển khoản hoặc thử lại.
              </p>
            </div>

            {/* Help Information */}
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-yellow-800 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                    Một số lý do phổ biến:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                    <li>Chưa hoàn tất chuyển khoản</li>
                    <li>Nội dung chuyển khoản không chính xác</li>
                    <li>Phiên thanh toán đã hết hạn</li>
                    <li>Số tiền chuyển khoản không khớp</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <Button asChild className="h-12">
                <Link href="/cart">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Quay lại giỏ hàng
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12">
                <Link href="/">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Tiếp tục mua sắm
                </Link>
              </Button>
            </div>

            {/* Contact Support */}
            <div className="border-t pt-6 mt-2">
              <p className="text-sm text-muted-foreground">
                Cần hỗ trợ? Liên hệ chúng tôi qua{" "}
                <a
                  href="mailto:support@onlyperf.com"
                  className="text-primary underline hover:no-underline"
                >
                  support@onlyperf.com
                </a>{" "}
                hoặc hotline{" "}
                <a
                  href="tel:0123456789"
                  className="text-primary underline hover:no-underline"
                >
                  0123 456 789
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
