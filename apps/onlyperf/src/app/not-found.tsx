import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 - Không Tìm Thấy Trang",
  description: "Trang bạn đang tìm kiếm không tồn tại.",
};

export default function NotFound() {
  return (
    <div className="container-page min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-2xl mx-auto">
        {/* Large 404 Number */}
        <div className="space-y-4">
          <h1 className="text-8xl md:text-9xl font-bold text-zinc-900 dark:text-white tracking-tight">
            404
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 mx-auto rounded-full"></div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white">
            Không Tìm Thấy Trang
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển. Đừng
            lo lắng, hãy để chúng tôi giúp bạn quay trở lại.
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-black px-8 py-4 text-base font-medium text-white shadow-xl transition-all duration-200 hover:bg-zinc-800 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-zinc-300 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:focus:ring-zinc-700"
          >
            Trở về trang chủ
            <svg
              className="ml-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        {/* Optional: Helpful Links */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Có thể bạn đang tìm kiếm:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/collections"
              className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            >
              Sản phẩm
            </Link>
            <Link
              href="/cart"
              className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            >
              Giỏ hàng
            </Link>
            <Link
              href="/account"
              className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            >
              Tài khoản
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
