"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Loader2, AlertTriangle } from "lucide-react";

interface TransferPageProps {
  params: Promise<{
    qrCode: string;
  }>;
}

export default function OwnershipTransferPage({ params }: TransferPageProps) {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  // Load qrCode from params
  useEffect(() => {
    params.then((p) => setQrCode(p.qrCode.toUpperCase()));
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmTransfer) {
      setError("Vui lòng xác nhận chuyển quyền sở hữu");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/warranty/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode,
          newOwnerEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể chuyển quyền sở hữu");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="container-max mx-auto px-4 py-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <ArrowRightLeft className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Đã gửi yêu cầu chuyển quyền
          </h1>
          <p className="mb-6 text-gray-600">
            Email xác nhận đã được gửi đến <strong>{newOwnerEmail}</strong>.
            Chủ sở hữu mới cần xác nhận để hoàn tất quá trình chuyển quyền.
          </p>
          <Link
            href={`/p/${qrCode}`}
            className="inline-flex items-center rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Quay lại thông tin sản phẩm
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-max mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        href={`/p/${qrCode}`}
        className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Quay lại thông tin sản phẩm
      </Link>

      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Chuyển quyền sở hữu
        </h1>
        <p className="mb-6 text-gray-600">
          Mã sản phẩm: <span className="font-mono font-semibold">{qrCode}</span>
        </p>

        {/* Warning */}
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">Lưu ý quan trọng</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-yellow-800">
                <li>Bảo hành sẽ được chuyển sang chủ sở hữu mới</li>
                <li>Bạn sẽ mất quyền truy cập vào thông tin sản phẩm này</li>
                <li>Hành động này không thể hoàn tác</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Owner Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Email chủ sở hữu mới <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={newOwnerEmail}
              onChange={(e) => setNewOwnerEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Chủ sở hữu mới cần có tài khoản OnlyPerf với email này
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={confirmTransfer}
                onChange={(e) => setConfirmTransfer(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Tôi xác nhận muốn chuyển quyền sở hữu sản phẩm này. Tôi hiểu rằng
                bảo hành sẽ được chuyển sang chủ sở hữu mới và tôi sẽ mất quyền
                truy cập vào sản phẩm.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Link
              href={`/p/${qrCode}`}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={isLoading || !newOwnerEmail || !confirmTransfer}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-5 w-5" />
                  Chuyển quyền
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
