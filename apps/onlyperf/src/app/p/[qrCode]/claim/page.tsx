"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";

interface ClaimPageProps {
  params: Promise<{
    qrCode: string;
  }>;
}

const CLAIM_TYPES = [
  { value: "defect", label: "Lỗi sản xuất", description: "Sản phẩm có lỗi từ nhà sản xuất" },
  { value: "damage", label: "Hư hỏng khi vận chuyển", description: "Sản phẩm bị hư hỏng trong quá trình giao hàng" },
  { value: "repair", label: "Yêu cầu sửa chữa", description: "Sản phẩm cần được sửa chữa" },
  { value: "replacement", label: "Yêu cầu đổi mới", description: "Yêu cầu đổi sản phẩm mới" },
] as const;

export default function WarrantyClaimPage({ params }: ClaimPageProps) {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [claimType, setClaimType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Load qrCode from params
  useState(() => {
    params.then((p) => setQrCode(p.qrCode.toUpperCase()));
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 5 - images.length); // Max 5 images
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setImages((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Upload images to storage and get URLs
      // For now, we'll just submit the claim without images
      const imageUrls: string[] = [];

      const response = await fetch("/api/warranty/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode,
          claimType,
          title,
          description,
          images: imageUrls,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Không thể gửi yêu cầu bảo hành");
      }

      // Redirect to success or back to product page
      router.push(`/p/${qrCode}?claim=submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Yêu cầu bảo hành
        </h1>
        <p className="mb-6 text-gray-600">
          Mã sản phẩm: <span className="font-mono font-semibold">{qrCode}</span>
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Claim Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Loại yêu cầu <span className="text-red-500">*</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {CLAIM_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                    claimType === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="claimType"
                    value={type.value}
                    checked={claimType === type.value}
                    onChange={(e) => setClaimType(e.target.value)}
                    className="sr-only"
                  />
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{type.description}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mô tả ngắn gọn vấn đề"
              required
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Mô tả chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết vấn đề bạn gặp phải với sản phẩm"
              required
              maxLength={2000}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              {description.length}/2000 ký tự
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Hình ảnh minh họa (tối đa 5 ảnh)
            </label>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {images.length < 5 && (
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 transition-colors hover:border-gray-400">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Nhấn để tải ảnh lên
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG tối đa 5MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="sr-only"
                />
              </label>
            )}
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
              disabled={isLoading || !claimType || !title || !description}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                "Gửi yêu cầu"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
