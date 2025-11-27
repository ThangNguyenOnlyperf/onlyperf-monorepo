"use client";

import { Calendar, CreditCard, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerOrder } from "@/lib/shopify/customer-account-api";

interface OrdersSectionProps {
  orders: CustomerOrder[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPrice(amount: string, currencyCode: string): string {
  const value = parseFloat(amount);
  if (currencyCode === "VND") {
    return `${value.toLocaleString("vi-VN")}₫`;
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

/**
 * Get color classes for financial (payment) status badges
 */
function getFinancialStatusColor(status: string): string {
  if (!status || status === "") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  const statusUpper = status.toUpperCase();

  if (statusUpper === "PAID") {
    return "bg-green-100 text-green-800 border-green-200";
  }

  if (statusUpper === "PENDING") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  if (statusUpper === "AUTHORIZED") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  if (statusUpper === "PARTIALLY_PAID") {
    return "bg-cyan-100 text-cyan-800 border-cyan-200";
  }

  if (statusUpper === "REFUNDED" || statusUpper === "PARTIALLY_REFUNDED") {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }

  if (statusUpper === "VOIDED" || statusUpper === "CANCELLED") {
    return "bg-red-100 text-red-800 border-red-200";
  }

  return "bg-zinc-100 text-zinc-800 border-zinc-200";
}

/**
 * Get color classes for fulfillment (delivery) status badges
 */
function getFulfillmentStatusColor(status: string): string {
  if (!status || status === "") {
    return "bg-gray-100 text-gray-800 border-gray-200";
  }

  const statusUpper = status.toUpperCase();

  // Fulfilled - Green
  if (statusUpper === "FULFILLED") {
    return "bg-green-100 text-green-800 border-green-200";
  }

  // Unfulfilled - Gray
  if (statusUpper === "UNFULFILLED") {
    return "bg-gray-100 text-gray-800 border-gray-200";
  }

  // Partial fulfillment - Purple
  if (statusUpper === "PARTIAL" || statusUpper === "PARTIALLY_FULFILLED") {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }

  // In transit - Indigo
  if (statusUpper === "IN_TRANSIT") {
    return "bg-indigo-100 text-indigo-800 border-indigo-200";
  }

  // On hold - Yellow
  if (statusUpper === "ON_HOLD") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  // Default - Gray
  return "bg-zinc-100 text-zinc-800 border-zinc-200";
}

/**
 * Translate financial (payment) status to Vietnamese
 */
function translateFinancialStatus(status: string): string {
  // Handle empty/null/undefined for COD orders
  if (!status || status === "") {
    return "Chưa thanh toán (COD)";
  }

  const statusMap: Record<string, string> = {
    PAID: "Đã thanh toán",
    PENDING: "Chờ thanh toán",
    AUTHORIZED: "Đã xác nhận thanh toán",
    PARTIALLY_PAID: "Thanh toán một phần",
    REFUNDED: "Đã hoàn tiền",
    PARTIALLY_REFUNDED: "Hoàn tiền một phần",
    VOIDED: "Đã hủy thanh toán",
    CANCELLED: "Đã hủy",
  };

  return statusMap[status.toUpperCase()] || status.replace("_", " ");
}

/**
 * Translate fulfillment (delivery) status to Vietnamese
 */
function translateFulfillmentStatus(status: string): string {
  if (!status || status === "") {
    return "Chưa xử lý";
  }

  const statusMap: Record<string, string> = {
    FULFILLED: "Đã giao hàng",
    UNFULFILLED: "Chưa giao hàng",
    PARTIAL: "Giao một phần",
    PARTIALLY_FULFILLED: "Giao một phần",
    IN_TRANSIT: "Đang vận chuyển",
    ON_HOLD: "Tạm giữ",
    CANCELLED: "Đã hủy",
  };

  return statusMap[status.toUpperCase()] || status.replace("_", " ");
}

export function OrdersSection({ orders }: OrdersSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          Đơn hàng của bạn
        </h2>
        <p className="text-base text-zinc-600 mt-1">
          Xem lịch sử đơn hàng và trạng thái giao hàng
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white py-16 text-center">
          <Package className="mb-4 w-12 h-12 text-zinc-500" />
          <h3 className="mb-2 text-lg font-semibold text-zinc-900">
            Chưa có đơn hàng
          </h3>
          <p className="mb-6 text-base text-zinc-600">
            Bắt đầu mua sắm để xem đơn hàng của bạn tại đây
          </p>
          <Button asChild className="h-12 bg-primary hover:bg-primary/90">
            <Link href="/collections">Xem sản phẩm</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Đơn hàng #{order.number}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-base text-zinc-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(order.processedAt)}
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      {formatPrice(
                        order.totalPrice.amount,
                        order.totalPrice.currencyCode,
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={`${getFinancialStatusColor(order.financialStatus)} text-sm`}
                  >
                    {translateFinancialStatus(order.financialStatus)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${getFulfillmentStatusColor(order.fulfillmentStatus)} text-sm`}
                  >
                    {translateFulfillmentStatus(order.fulfillmentStatus)}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              {order.lineItems.nodes.length > 0 && (
                <>
                  <div className="border-t border-zinc-200 my-4" />
                  <div className="space-y-3">
                    {order.lineItems.nodes.map((item, idx) => (
                      <div
                        key={`${order.id}-${item.title}-${idx}`}
                        className="flex items-center gap-4"
                      >
                        {item.image && (
                          <Image
                            src={item.image.url}
                            alt={item.image.altText || item.title}
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-md border border-zinc-200 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-base font-medium text-zinc-900">
                            {item.title}
                          </p>
                          <p className="text-sm text-zinc-600">
                            Số lượng: {item.quantity}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-zinc-900">
                          {formatPrice(
                            item.price.amount,
                            item.price.currencyCode,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
