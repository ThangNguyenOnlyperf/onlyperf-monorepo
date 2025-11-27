"use client";

import { addMonths } from "date-fns";
import { Package, Shield, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";

// ShipmentItem with joined product data
interface ShipmentItemWithProduct {
  id: string;
  qrCode: string;
  productId: string;
  deliveredAt: Date | null;
  warrantyMonths: number;
  warrantyStatus: string; // "pending" | "active" | "expired" | "void"
  isAuthentic: boolean;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string;
    color?: { name: string; hex: string } | null;
    brand_relation?: { name: string } | null;
  } | null;
}

interface ProductsSectionProps {
  products: ShipmentItemWithProduct[];
}

function getWarrantyStatusDisplay(
  status: string,
  deliveredAt: Date | null,
  warrantyMonths: number,
): { label: string; color: string; isActive: boolean } {
  if (status === "pending") {
    return { label: "Chờ kích hoạt", color: "text-yellow-600 bg-yellow-50", isActive: false };
  }

  if (status === "void") {
    return { label: "Đã hủy", color: "text-gray-600 bg-gray-50", isActive: false };
  }

  if (deliveredAt) {
    const warrantyEndDate = addMonths(deliveredAt, warrantyMonths);
    if (new Date() > warrantyEndDate) {
      return { label: "Đã hết hạn", color: "text-red-600 bg-red-50", isActive: false };
    }
  }

  return { label: "Còn hiệu lực", color: "text-green-600 bg-green-50", isActive: true };
}

function calculateDaysRemaining(deliveredAt: Date | null, warrantyMonths: number): number | null {
  if (!deliveredAt) return null;
  const warrantyEndDate = addMonths(deliveredAt, warrantyMonths);
  const days = Math.floor((warrantyEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export function ProductsSection({ products }: ProductsSectionProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-zinc-400" />
        <h3 className="mt-4 text-lg font-medium text-zinc-900">
          Chưa có sản phẩm nào
        </h3>
        <p className="mt-2 text-zinc-600">
          Sản phẩm của bạn sẽ xuất hiện ở đây sau khi được giao hàng thành công.
        </p>
        <Link
          href="/collections"
          className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Khám phá sản phẩm
          <ExternalLink className="ml-1 h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Sản phẩm của tôi</h2>
        <span className="text-sm text-zinc-500">{products.length} sản phẩm</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((item) => {
          const warrantyStatus = getWarrantyStatusDisplay(
            item.warrantyStatus,
            item.deliveredAt,
            item.warrantyMonths,
          );
          const daysRemaining = calculateDaysRemaining(
            item.deliveredAt,
            item.warrantyMonths,
          );

          const productName = item.product?.name ?? "Sản phẩm";
          const colorName = item.product?.color?.name;

          return (
            <Link
              key={item.id}
              href={`/p/${item.qrCode}`}
              className="group rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm"
            >
              {/* Product Name & QR Code */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-900 line-clamp-1">
                    {productName}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                      {item.qrCode}
                    </span>
                    {colorName && (
                      <span className="text-xs text-zinc-500">{colorName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.isAuthentic ? (
                    <Shield className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <ExternalLink className="h-4 w-4 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>

              {/* Warranty Status */}
              <div className="mt-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${warrantyStatus.color}`}
                >
                  {warrantyStatus.label}
                </span>
              </div>

              {/* Warranty Details */}
              <div className="mt-3 space-y-1 text-sm text-zinc-600">
                {item.deliveredAt && (
                  <p>
                    Kích hoạt:{" "}
                    <span className="font-medium text-zinc-900">
                      {new Date(item.deliveredAt).toLocaleDateString("vi-VN")}
                    </span>
                  </p>
                )}
                {warrantyStatus.isActive && daysRemaining !== null && (
                  <p>
                    Còn lại:{" "}
                    <span className="font-medium text-zinc-900">
                      {daysRemaining} ngày
                    </span>
                  </p>
                )}
                <p>
                  Thời hạn:{" "}
                  <span className="font-medium text-zinc-900">
                    {item.warrantyMonths} tháng
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
