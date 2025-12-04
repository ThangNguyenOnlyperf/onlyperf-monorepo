"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CartLine } from "@shopify/hydrogen-react/storefront-api-types";
import { CreditCard, Banknote } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  convertToShopifyAddress,
  type OrderSummaryFormData,
  orderSummaryFormSchema,
  type SavedAddressData,
} from "@/lib/checkout/order-summary-schema";
import { DistrictSelect, ProvinceSelect, WardSelect } from "./ProvinceSelects";
import { SavedAddressSelector } from "./SavedAddressSelector";

interface DiscountCode {
  code: string;
  applicable: boolean;
}

interface OrderSummaryFormProps {
  cartLines: CartLine[];
  cartTotal: {
    amount: string;
    currencyCode: string;
  };
  savedAddresses?: SavedAddressData[];
  onSubmit: (data: OrderSummaryFormData) => Promise<void>;
  isGuest?: boolean;
  discountCodes?: DiscountCode[];
  totalDiscountAmount?: number;
}

/**
 * Order Summary Form Component
 * Displays:
 * 1. Cart items and totals (read-only)
 * 2. Saved addresses (if customer has any)
 * 3. New address form with Vietnamese address structure
 * 4. Payment method selection (Bank Transfer vs COD)
 * 5. Discount code input (placeholder)
 */
export function OrderSummaryForm({
  cartLines,
  cartTotal,
  savedAddresses = [],
  onSubmit,
  isGuest = false,
  discountCodes = [],
  totalDiscountAmount = 0,
}: OrderSummaryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useExistingAddress, setUseExistingAddress] = useState(
    savedAddresses.length > 0 && !isGuest,
  );

  // Multi-step form state for guests
  const [guestStep, setGuestStep] = useState<1 | 2>(1);
  const [emailValidated, setEmailValidated] = useState(false);

  const form = useForm<OrderSummaryFormData>({
    resolver: zodResolver(orderSummaryFormSchema),
    mode: "onBlur",
    defaultValues: {
      paymentMethod: "bank_transfer",
      isGuest,
      guestEmail: undefined,
      guestPhone: undefined,
      guestFirstName: undefined,
      guestLastName: undefined,
      useExistingAddress: savedAddresses.length > 0 && !isGuest,
      selectedAddressId:
        savedAddresses.length > 0 && !isGuest
          ? savedAddresses[0]?.id || null
          : null,
      firstName: undefined,
      lastName: undefined,
      phone: undefined,
      provinceCode: undefined,
      provinceName: undefined,
      districtCode: undefined,
      districtName: undefined,
      wardCode: undefined,
      wardName: undefined,
      address1: undefined,
      address2: null,
      company: null,
    },
  });

  const provinceCode = form.watch("provinceCode");
  const districtCode = form.watch("districtCode");
  const selectedPaymentMethod = form.watch("paymentMethod");
  const guestEmail = form.watch("guestEmail");
  const errors = form.formState.errors;

  // Handle email validation for guest step 1
  const handleEmailContinue = () => {
    const email = form.getValues("guestEmail");

    // Trigger validation for email field only
    form.trigger("guestEmail").then((isValid) => {
      if (isValid && email) {
        setEmailValidated(true);
        setGuestStep(2);
        setError(null);
      } else {
        setError("Vui lòng nhập địa chỉ email hợp lệ");
      }
    });
  };

  const handleSubmit = async (data: OrderSummaryFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container-max mx-auto px-4">
        <h1 className="mb-8 text-3xl font-bold">Tóm tắt đơn hàng</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left side: Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8"
            >
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-900">
                  {error}
                </div>
              )}
              {Object.keys(errors).length > 0 && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                    ⚠️ Vui lòng hoàn thành các trường bắt buộc:
                  </h3>
                  <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                    {Object.entries(errors)
                      .filter(([_, error]) => error?.message) // Only show errors with messages
                      .map(([field, error]) => (
                        <li key={field}>{error?.message as string}</li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Guest Customer Information - Step 1: Email Only */}
              {isGuest && guestStep === 1 && (
                <div className="rounded-lg border bg-white p-8">
                  <h2 className="mb-4 text-lg font-semibold">
                    Bước 1: Xác nhận email
                  </h2>
                  <p className="mb-8 text-base text-zinc-600">
                    Nhập email của bạn để tiếp tục thanh toán
                  </p>

                  <div className="space-y-6">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="guestEmail"
                        className="text-base font-medium"
                      >
                        Email *
                      </Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        {...form.register("guestEmail")}
                        className="text-base"
                        placeholder="example@email.com"
                        aria-invalid={!!errors.guestEmail}
                        autoFocus
                      />
                      {errors.guestEmail && (
                        <p className="text-sm text-red-600">
                          {errors.guestEmail.message}
                        </p>
                      )}
                    </div>

                    {/* Continue Button */}
                    <Button
                      type="button"
                      onClick={handleEmailContinue}
                      className="w-full"
                      disabled={!guestEmail || guestEmail.trim().length === 0}
                    >
                      Tiếp tục
                    </Button>
                  </div>
                </div>
              )}

              {/* Guest Step 2: Email confirmed, show rest of form */}
              {isGuest && guestStep === 2 && (
                <div className="rounded-lg border bg-zinc-50 p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-600">
                        Email đã xác nhận:
                      </p>
                      <p className="font-medium">{guestEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGuestStep(1);
                        setEmailValidated(false);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Thay đổi
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && !isGuest && (
                <div className="rounded-lg border bg-white p-8">
                  <SavedAddressSelector
                    addresses={savedAddresses.map((addr) => ({
                      id: addr.id,
                      firstName: addr.firstName,
                      lastName: addr.lastName,
                      address1: addr.address1,
                      address2: addr.address2 || undefined,
                      city: addr.city,
                      province: addr.province || undefined,
                      zip: addr.zip || undefined,
                      country: addr.country,
                      phoneNumber: addr.phoneNumber || undefined,
                      company: addr.company || undefined,
                    }))}
                    selectedAddressId={
                      useExistingAddress
                        ? form.watch("selectedAddressId")
                        : null
                    }
                    onSelectAddress={(address) => {
                      setUseExistingAddress(true);
                      form.setValue("useExistingAddress", true, {
                        shouldValidate: false,
                      });
                      form.setValue("selectedAddressId", address.id, {
                        shouldValidate: false,
                      });
                    }}
                    onAddNewAddress={() => {
                      setUseExistingAddress(false);
                      form.setValue("useExistingAddress", false, {
                        shouldValidate: false,
                      });
                    }}
                  />
                </div>
              )}

              {/* New Address Form */}
              {!useExistingAddress && (!isGuest || guestStep === 2) && (
                <div className="rounded-lg border bg-white p-8">
                  <h2 className="mb-4 text-lg font-semibold">
                    {isGuest
                      ? "Bước 2: Thông tin nhận hàng"
                      : "Thông tin nhận hàng"}
                  </h2>
                  <p className="mb-8 text-base text-zinc-600">
                    Nhập địa chỉ nhận hàng của bạn
                  </p>

                  <div className="space-y-6">
                    {/* Personal Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="firstName"
                          className="text-base font-medium"
                        >
                          Tên *
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="Tên"
                          {...form.register("firstName")}
                          className={`h-12 ${errors.firstName ? "border-red-500" : ""}`}
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="lastName"
                          className="text-base font-medium"
                        >
                          Họ *
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Họ"
                          {...form.register("lastName")}
                          className={`h-12 ${errors.lastName ? "border-red-500" : ""}`}
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-base font-medium">
                        Số điện thoại *
                      </Label>
                      <Input
                        id="phone"
                        placeholder="0901234567"
                        {...form.register("phone")}
                        className={`h-12 ${errors.phone ? "border-red-500" : ""}`}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    {/* Province/District/Ward Cascade */}
                    <div className="space-y-4">
                      <ProvinceSelect
                        control={form.control}
                        setValue={form.setValue}
                        codeField="provinceCode"
                        nameField="provinceName"
                      />
                      <DistrictSelect
                        control={form.control}
                        setValue={form.setValue}
                        codeField="districtCode"
                        nameField="districtName"
                        provinceCode={provinceCode}
                      />
                      <WardSelect
                        control={form.control}
                        setValue={form.setValue}
                        codeField="wardCode"
                        nameField="wardName"
                        districtCode={districtCode}
                      />
                    </div>

                    {/* Street Address */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="address1"
                        className="text-base font-medium"
                      >
                        Số nhà, tên đường *
                      </Label>
                      <Input
                        id="address1"
                        placeholder="Số 123 Đường ABC"
                        {...form.register("address1")}
                        className={`h-12 ${errors.address1 ? "border-red-500" : ""}`}
                      />
                      {errors.address1 && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.address1.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="address2"
                        className="text-base font-medium"
                      >
                        Thông tin thêm (tùy chọn)
                      </Label>
                      <Input
                        id="address2"
                        placeholder="Căn hộ, tòa nhà, v.v..."
                        {...form.register("address2")}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="rounded-lg border bg-white p-8">
                <h2 className="mb-6 text-lg font-semibold">
                  Hình thức thanh toán
                </h2>

                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={(value) =>
                    form.setValue(
                      "paymentMethod",
                      value as "bank_transfer" | "cod",
                    )
                  }
                  className="space-y-4"
                >
                  <div
                    className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                      selectedPaymentMethod === "bank_transfer"
                        ? "border-primary bg-primary/5"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem
                        value="bank_transfer"
                        id="bank_transfer"
                        className="mt-1"
                      />
                      <Label
                        htmlFor="bank_transfer"
                        className="flex-1 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-zinc-700" />
                          <span className="text-base font-semibold">
                            Chuyển khoản ngân hàng
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600">
                          Quét mã QR hoặc chuyển khoản thủ công
                        </p>
                      </Label>
                    </div>
                  </div>

                  <div
                    className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                      selectedPaymentMethod === "cod"
                        ? "border-primary bg-primary/5"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value="cod" id="cod" className="mt-1" />
                      <Label
                        htmlFor="cod"
                        className="flex-1 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <Banknote className="w-5 h-5 text-zinc-700" />
                          <span className="text-base font-semibold">
                            Thanh toán khi nhận hàng (COD)
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600">
                          Thanh toán tiền mặt khi nhận hàng
                        </p>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {errors.paymentMethod && (
                  <p className="text-sm text-red-500 mt-3">
                    {errors.paymentMethod.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90"
              >
                {isSubmitting
                  ? "Đang xử lý..."
                  : selectedPaymentMethod === "cod"
                    ? "Đặt hàng"
                    : "Tiếp tục đến thanh toán"}
              </Button>
            </form>
          </div>

          {/* Right side: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-semibold">Giỏ hàng</h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-4">
                {cartLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm border-b border-zinc-200 pb-3"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">
                        {line.merchandise?.product?.title}
                      </p>
                      <p className="text-zinc-600">x{line.quantity}</p>
                    </div>
                    <p className="font-semibold text-zinc-900">
                      {line.cost?.totalAmount?.amount && (
                        <>
                          {parseFloat(
                            line.cost.totalAmount.amount,
                          ).toLocaleString("vi-VN")}
                          ₫
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              {/* Cost Breakdown */}
              <div className="pt-4 mb-4 space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-zinc-900">
                    {parseFloat(cartTotal.amount).toLocaleString("vi-VN")}₫
                  </span>
                </div>

                {/* Discount Display (if applied) */}
                {discountCodes.length > 0 && totalDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-zinc-600">
                    <div>
                      <span className="">Giảm giá:</span>
                      <span className="ml-2 text-sm">
                        {discountCodes[0].code}
                      </span>
                    </div>
                    <span className="">
                      -{totalDiscountAmount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                )}

                {/* Shipping */}
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>Phí vận chuyển:</span>
                  <span className="text-xs text-zinc-500">Tính từ địa chỉ</span>
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-zinc-300 pt-4 mb-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-zinc-900">
                    Tổng cộng:
                  </span>
                  <span className="text-xl font-bold text-zinc-900">
                    {parseFloat(cartTotal.amount).toLocaleString("vi-VN")}₫
                  </span>
                </div>
              </div>

              {/* Discount Code Note */}
              {discountCodes.length === 0 && (
                <div className="border-t border-zinc-200 pt-4">
                  <p className="text-xs text-zinc-500">
                    💡 Bạn có thể áp dụng mã giảm giá từ trang giỏ hàng
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
