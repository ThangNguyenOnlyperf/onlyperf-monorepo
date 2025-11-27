import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Đang bảo trì",
  description: "Hệ thống đang tạm thời gián đoạn",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenancePage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-yellow-100 p-6">
            <AlertTriangle className="w-16 h-16 text-yellow-600" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Hệ thống đang bảo trì
          </h1>
        </div>

        {/* Description */}
        <div className="space-y-3 text-muted-foreground">
          <p className="text-lg">
            Chúng tôi đang gặp sự cố kỹ thuật với hệ thống Shopify.
          </p>
          <p className="text-sm">
            Thời gian dự kiến khắc phục: <strong>5-15 phút</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Home className="w-5 h-5" />
            Về trang chủ
          </Link>
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

        {/* Error Code (for debugging) */}
        <div className="text-xs text-muted-foreground/60">
          <p>Mã lỗi: SHOPIFY_API_UNAVAILABLE</p>
          <p>Thời gian: {new Date().toISOString()}</p>
        </div>
      </div>
    </div>
  );
}
