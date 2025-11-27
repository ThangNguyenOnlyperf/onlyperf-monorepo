"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to logout API endpoint
    router.push("/api/customer-auth/logout");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Loading Spinner */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

        {/* Loading Text */}
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Đang đăng xuất...</p>
          <p className="text-sm text-gray-500">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    </div>
  );
}
