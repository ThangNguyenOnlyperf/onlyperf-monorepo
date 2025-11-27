"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Root error boundary for the application.
 * Catches all unhandled errors and provides user-friendly recovery options.
 *
 * For Shopify API errors (timeout, network), redirects to maintenance page.
 * For other errors, shows inline error with retry functionality.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error for debugging
    console.error("[Root Error Boundary]", error);

    // Check if it's a Shopify-related error that should redirect to maintenance
    const isShopifyError =
      error.name === "ShopifyTimeoutError" ||
      error.name === "ShopifyAPIError" ||
      error.name === "ShopifyNetworkError" ||
      error.message.includes("Shopify") ||
      error.message.includes("fetch failed") ||
      error.message.includes("Connect Timeout");

    // Redirect to maintenance page for Shopify errors
    if (isShopifyError) {
      // Small delay to ensure error is logged
      setTimeout(() => {
        router.push("/maintenance");
      }, 100);
    }
  }, [error, router]);

  // Check if it's a Shopify error
  const isShopifyError =
    error.name === "ShopifyTimeoutError" ||
    error.name === "ShopifyAPIError" ||
    error.name === "ShopifyNetworkError" ||
    error.message.includes("Shopify") ||
    error.message.includes("fetch failed") ||
    error.message.includes("Connect Timeout");

  // For Shopify errors, show a loading state while redirecting
  if (isShopifyError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  // For other errors, show inline error with retry
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-6">
            <AlertTriangle className="w-16 h-16 text-red-600" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Có lỗi xảy ra</h1>
        </div>

        {/* Error Message (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-muted p-4 rounded-lg text-left">
            <p className="text-sm font-mono text-muted-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-muted-foreground/60 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Description */}
        <div className="space-y-3 text-muted-foreground">
          <p className="text-lg">
            Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
          </p>
        </div>

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
            Về trang chủ
          </button>
        </div>

        {/* Additional Info */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ hỗ trợ:
            <br />
            <a
              href="mailto:support@onlyperf.com"
              className="text-primary hover:underline font-medium"
            >
              support@onlyperf.com
            </a>
          </p>
        </div>

        {/* Error Code */}
        {error.digest && (
          <div className="text-xs text-muted-foreground/60">
            <p>Error ID: {error.digest}</p>
            <p>Time: {new Date().toISOString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
