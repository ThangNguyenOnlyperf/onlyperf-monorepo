"use client";

import { AlertCircle, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePendingSession } from "@/hooks/checkout/usePendingSession";

interface PendingPaymentBannerProps {
  cartId?: string;
}

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes <= 0) return "đã hết hạn";
  if (minutes < 60) return `còn ${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  return `còn ${hours} giờ`;
}

export function PendingPaymentBanner({ cartId }: PendingPaymentBannerProps) {
  const { pendingSession, clearPendingSession } = usePendingSession(cartId);

  if (!pendingSession) {
    return null;
  }

  const timeRemaining = pendingSession.expiresAt
    ? formatTimeRemaining(pendingSession.expiresAt)
    : null;

  return (
    <div className="relative mb-6 rounded-lg bg-amber-50 border-2 border-amber-300 p-4 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-base font-semibold text-amber-900">
              Bạn có thanh toán đang chờ xử lý
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              Bạn đã tạo đơn hàng cho giỏ hàng này nhưng chưa hoàn tất thanh
              toán
              {timeRemaining && ` (${timeRemaining})`}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Link href={`/checkout/${pendingSession.sessionId}`}>
                Tiếp tục thanh toán
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearPendingSession}
              className="h-9 border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              Tạo đơn mới
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={clearPendingSession}
          className="flex-shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
