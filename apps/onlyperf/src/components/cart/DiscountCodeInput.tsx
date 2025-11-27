"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "@shopify/hydrogen-react";
import { useState, useEffect } from "react";
import { X, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Discount Code Input Component
 *
 * Allows customers to apply discount codes to their cart using Shopify Storefront API
 * - Validates codes via Shopify's cartDiscountCodesUpdate mutation
 * - Shows real-time price updates
 * - Displays applied discount with remove button
 * - Single discount code support only
 */
export function DiscountCodeInput() {
  const cart = useCart();
  const { discountCodes, status, discountCodesUpdate } = cart;
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const appliedDiscount = discountCodes?.[0];

  // @ts-expect-error - discountAllocations exists but not in current type definitions
  const discountAllocations = cart.discountAllocations || [];
  // Sum all discount allocations (can have multiple discounts applied)
  const totalDiscountAmount = discountAllocations.reduce(
    (sum: number, allocation: any) => {
      return sum + Number.parseFloat(allocation.discountedAmount.amount);
    },
    0,
  );

  const isLoading = status === "updating" || isApplying;

  useEffect(() => {
    if (!pendingCode || status !== "idle") return;

    const appliedCode = cart.discountCodes?.find(
      (dc) => dc?.code === pendingCode,
    );

    if (appliedCode?.applicable) {
      setInputValue("");
      setError(null);
    } else if (appliedCode) {
      setError("Mã giảm giá không hợp lệ hoặc đã hết hạn");
    }

    setPendingCode(null);
    setIsApplying(false);
  }, [cart.discountCodes, status, pendingCode]);

  const handleApply = async () => {
    if (!inputValue.trim()) {
      setError("Vui lòng nhập mã giảm giá");
      return;
    }

    // Prevent duplicate calls if already processing
    if (isApplying) {
      return;
    }

    // Input is already uppercased in onChange, just trim
    const code = inputValue.trim();
    setIsApplying(true);
    setError(null);
    setPendingCode(code);

    try {
      await discountCodesUpdate([code]);
    } catch (err) {
      console.error("Error applying discount code:", err);
      setError("Không thể áp dụng mã giảm giá. Vui lòng thử lại");
      setPendingCode(null);
      setIsApplying(false);
    }
  };

  const handleRemove = async () => {
    setIsApplying(true);
    setError(null);

    try {
      await discountCodesUpdate([]);
    } catch (err) {
      console.error("Error removing discount code:", err);
      setError("Không thể xóa mã giảm giá. Vui lòng thử lại");
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApply();
    }
  };

  return (
    <div className="space-y-2">
      {/* Applied discount display */}
      {appliedDiscount?.applicable && (
        <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-700">
              {appliedDiscount.code}
            </span>
            {totalDiscountAmount > 0 && (
              <span className="text-sm text-green-600">
                (-{totalDiscountAmount.toLocaleString("vi-VN")}₫)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isLoading}
            className="text-green-600 hover:text-green-800 disabled:opacity-50"
            aria-label="Xóa mã giảm giá"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input and apply button (only show if no discount applied) */}
      {!appliedDiscount?.applicable && (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nhập mã giảm giá"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
            aria-label="Mã giảm giá"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleApply}
            disabled={isLoading || !inputValue.trim()}
            className="whitespace-nowrap px-6"
          >
            {isLoading ? "Đang kiểm tra..." : "Áp dụng"}
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
