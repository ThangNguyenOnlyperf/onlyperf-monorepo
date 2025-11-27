"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  DistrictSelect,
  ProvinceSelect,
  WardSelect,
} from "@/components/checkout/ProvinceSelects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const addressFormSchema = z
  .object({
    firstName: z.string().min(1, "Vui lòng nhập tên"),
    lastName: z.string().min(1, "Vui lòng nhập họ"),
    phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
    provinceCode: z.number(),
    provinceName: z.string(),
    districtCode: z.number(),
    districtName: z.string(),
    wardCode: z.number(),
    wardName: z.string(),
    address1: z.string().min(1, "Vui lòng nhập địa chỉ"),
    address2: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
  })
  .refine((data) => data.provinceCode !== undefined && data.provinceCode > 0, {
    message: "Vui lòng chọn tỉnh/thành phố",
    path: ["provinceCode"],
  })
  .refine((data) => data.districtCode !== undefined && data.districtCode > 0, {
    message: "Vui lòng chọn quận/huyện",
    path: ["districtCode"],
  })
  .refine((data) => data.wardCode !== undefined && data.wardCode > 0, {
    message: "Vui lòng chọn phường/xã",
    path: ["wardCode"],
  });

type AddressFormData = z.infer<typeof addressFormSchema>;

interface AddressFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  saveAddress: (address: {
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    address1: string | null;
    address2?: string | null;
    city: string | null;
    province?: string | null;
    country: string | null;
    zip: string | null;
    company?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function AddressForm({
  onSuccess,
  onCancel,
  saveAddress,
}: AddressFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      provinceCode: undefined,
      provinceName: "",
      districtCode: undefined,
      districtName: "",
      wardCode: undefined,
      wardName: "",
      address1: "",
      address2: null,
      company: null,
    },
  });

  const provinceCode = form.watch("provinceCode");
  const districtCode = form.watch("districtCode");
  const errors = form.formState.errors;

  const handleSubmit = async (data: AddressFormData) => {
    setError(null);

    startTransition(async () => {
      const result = await saveAddress({
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phone,
        address1: data.address1,
        address2: data.address2,
        company: data.company,
        city: data.wardName,
        province: `${data.wardName}, ${data.districtName}, ${data.provinceName}`,
        country: "VN",
        zip: String(data.wardCode),
      });

      if (!result.success) {
        setError(result.error || "Đã xảy ra lỗi");
        return;
      }

      form.reset();
      onSuccess();
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-900">
          {error}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            ⚠️ Vui lòng hoàn thành các trường bắt buộc
          </h3>
          <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
            {Object.entries(errors)
              .filter(([_, error]) => error?.message)
              .map(([field, error]) => (
                <li key={field}>{error?.message as string}</li>
              ))}
          </ul>
        </div>
      )}

      {/* Personal Info */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-base font-medium">
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
          <Label htmlFor="lastName" className="text-base font-medium">
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
          <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
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
        <Label htmlFor="address1" className="text-base font-medium">
          Số nhà, tên đường *
        </Label>
        <Input
          id="address1"
          placeholder="Số 123 Đường ABC"
          {...form.register("address1")}
          className={`h-12 ${errors.address1 ? "border-red-500" : ""}`}
        />
        {errors.address1 && (
          <p className="text-sm text-red-500 mt-1">{errors.address1.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address2" className="text-base font-medium">
          Thông tin thêm (tùy chọn)
        </Label>
        <Input
          id="address2"
          placeholder="Căn hộ, tòa nhà, v.v..."
          {...form.register("address2")}
          className="h-12"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t border-zinc-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 h-12"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1 h-12 bg-primary hover:bg-primary/90"
        >
          {isPending ? "Đang lưu..." : "Lưu địa chỉ"}
        </Button>
      </div>
    </form>
  );
}
