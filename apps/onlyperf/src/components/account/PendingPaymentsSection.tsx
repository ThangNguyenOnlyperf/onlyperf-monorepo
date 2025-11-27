"use client";

import { AlertCircle, Clock, CreditCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PendingCheckoutSession } from "@/actions/checkout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PendingPaymentsSectionProps {
  sessions: PendingCheckoutSession[];
}

function formatPrice(amount: number, currencyCode: string): string {
  if (currencyCode === "VND") {
    return `${amount.toLocaleString("vi-VN")}₫`;
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes <= 0) return "Đã hết hạn";
  if (minutes < 60) return `Còn ${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  return `Còn ${hours} giờ`;
}

function formatCreatedAt(date: Date): string {
  return new Date(date).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PendingPaymentsSection({
  sessions,
}: PendingPaymentsSectionProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          Thanh toán chờ xử lý
        </h2>
        <p className="text-base text-zinc-600 mt-1">
          Hoàn tất các đơn hàng chưa thanh toán của bạn
        </p>
      </div>

      {/* Info Notice */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Bạn có <strong>{sessions.length}</strong> thanh toán đang chờ xử lý.
            Vui lòng hoàn tất thanh toán trước khi hết thời gian.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => {
          const timeRemaining = formatTimeRemaining(session.expiresAt);
          const isExpiringSoon =
            session.expiresAt.getTime() - Date.now() < 5 * 60 * 1000; // < 5 minutes

          return (
            <div
              key={session.sessionId}
              className="rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: QR Code Preview */}
                <div className="flex items-center gap-4">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                    <Image
                      src={session.qrImageUrl}
                      alt="QR Code thanh toán"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-contain"
                    />
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-zinc-600">Mã thanh toán</p>
                      <p className="text-base font-mono font-semibold text-emerald-600">
                        {session.paymentCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-zinc-900">
                        {formatPrice(session.amount, session.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Clock className="w-4 h-4" />
                      <span>Tạo lúc: {formatCreatedAt(session.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <Badge
                    variant="outline"
                    className={
                      isExpiringSoon
                        ? "bg-red-100 text-red-800 border-red-200 text-sm"
                        : "bg-yellow-100 text-yellow-800 border-yellow-200 text-sm"
                    }
                  >
                    {timeRemaining}
                  </Badge>
                  <Button
                    asChild
                    className="h-10 bg-primary hover:bg-primary/90"
                  >
                    <Link href={`/checkout/${session.sessionId}`}>
                      Tiếp tục thanh toán
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
