"use client";

import { AlertTriangle, Home, RefreshCw, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Error boundary for product catalog pages.
 * Catches errors during product fetching and provides recovery options.
 */
export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error for debugging
    console.error("[Products Error Boundary]", error);
  }, [error]);

  // Check if it's a Shopify-related error
  const isShopifyError =
    error.name === "ShopifyTimeoutError" ||
    error.name === "ShopifyAPIError" ||
    error.name === "ShopifyNetworkError" ||
    error.message.includes("Shopify") ||
    error.message.includes("fetch failed") ||
    error.message.includes("Connect Timeout");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-orange-100 p-6">
            <AlertTriangle className="w-16 h-16 text-orange-600" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            {isShopifyError ? "Không thể tải sản phẩm" : "Có lỗi xảy ra"}
          </h1>
        </div>

        {/* Description */}
        <div className="space-y-3 text-muted-foreground">
          {isShopifyError ? (
            <p>
              Chúng tôi đang gặp sự cố kết nối đến cửa hàng. Vui lòng thử lại
              sau vài giây.
            </p>
          ) : (
            <p>Đã xảy ra lỗi khi tải danh sách sản phẩm. Vui lòng thử lại.</p>
          )}
        </div>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-muted-foreground/60 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Thử lại
          </button>

          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Home className="w-5 h-5" />
            Trang chủ
          </button>
        </div>

        {/* Alternative Actions */}
        {isShopifyError && (
          <div className="pt-4">
            <button
              onClick={() => router.push("/maintenance")}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Xem trang bảo trì
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
