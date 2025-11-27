"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface LoginFormProps {
  redirectParam: string | null;
  errorParam: string | null;
}

/**
 * Login form component
 *
 * Redirects are handled entirely by OAuth callback server-side.
 * This component only handles form submission and UI.
 */
export function LoginForm({ redirectParam, errorParam }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("email", email);
      if (redirectParam) params.set("redirect", redirectParam);
      window.location.href = `/api/customer-auth/start?${params.toString()}`;
    } catch (err) {
      setError("Không thể bắt đầu đăng nhập bằng email");
      setLoading(false);
    }
  };

  const startGoogleLogin = () => {
    const params = new URLSearchParams();
    if (redirectParam) params.set("redirect", redirectParam);
    window.location.href = `/api/customer-auth/start?${params.toString()}`;
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">
          Đăng nhập hoặc tạo tài khoản
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Nhập email của bạn để bắt đầu
        </p>

        {errorParam && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Xác thực thất bại. Vui lòng thử lại.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={startEmailLogin} className="mb-6">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@vidu.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A1942] text-white py-2 px-4 rounded-md hover:bg-[#3A1232] disabled:opacity-50 font-medium"
          >
            {loading ? "Đang chuyển hướng..." : "Tiếp tục"}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              hoặc đăng nhập bằng
            </span>
          </div>
        </div>

        <div className="flex justify-center items-center">
          {/* Google Login */}
          <button
            onClick={startGoogleLogin}
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
            aria-label="Đăng nhập bằng Google"
          >
            <Image
              src="/google.svg"
              alt="Google"
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </button>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Bằng việc tạo tài khoản, bạn chấp nhận{" "}
          <Link href="/terms" className="underline">
            Điều khoản dịch vụ
          </Link>{" "}
          của chúng tôi và đồng ý nhận bản tin cũng như thông tin khuyến mãi.
          Bạn cũng xác nhận đã đọc{" "}
          <Link href="/privacy" className="underline">
            Chính sách bảo mật
          </Link>
          . Bạn có quyền hủy đăng ký nhận bản tin và thông tin khuyến mãi bất cứ
          lúc nào.
        </p>
      </div>
    </div>
  );
}
