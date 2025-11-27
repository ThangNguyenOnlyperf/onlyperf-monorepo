"use client";

import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
  type UseFormSetValue,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDistricts, useProvinces, useWards } from "@/hooks/useProvinceApi";

interface ProvinceSelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  nameField: Path<TFieldValues>;
  codeField: Path<TFieldValues>;
  label?: string;
}

/**
 * Province Select Component
 * Uses React Hook Form Controller with native HTML select
 */
export function ProvinceSelect<TFieldValues extends FieldValues>({
  control,
  setValue,
  nameField,
  codeField,
  label = "Tỉnh/Thành phố",
}: ProvinceSelectProps<TFieldValues>) {
  const { data: provinces = [], isLoading, error } = useProvinces();

  return (
    <Controller
      control={control}
      name={codeField}
      render={({ field, fieldState: { error: fieldError } }) => (
        <div className="space-y-2">
          <Label htmlFor={String(codeField)}>{label} *</Label>
          <Select
            value={field.value ? String(field.value) : ""}
            onValueChange={(value) => {
              const code = parseInt(value, 10);
              const province = provinces.find((p) => p.code === code);
              field.onChange(code);
              if (province && nameField) {
                setValue(nameField, province.name as any);
              }
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full h-12" id={String(codeField)}>
              <SelectValue
                placeholder={
                  isLoading
                    ? "Đang tải..."
                    : error
                      ? "Lỗi tải dữ liệu"
                      : "Chọn tỉnh/thành phố"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province.code} value={String(province.code)}>
                  {province.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError && (
            <p className="text-sm text-red-500 mt-1">{fieldError.message}</p>
          )}
        </div>
      )}
    />
  );
}

interface DistrictSelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  nameField: Path<TFieldValues>;
  codeField: Path<TFieldValues>;
  provinceCode: number | null | undefined;
  label?: string;
}

/**
 * District Select Component
 * Depends on province selection, auto-disabled until province is selected
 */
export function DistrictSelect<TFieldValues extends FieldValues>({
  control,
  setValue,
  nameField,
  codeField,
  provinceCode,
  label = "Quận/Huyện",
}: DistrictSelectProps<TFieldValues>) {
  const { data: districts = [], isLoading } = useDistricts(provinceCode);

  return (
    <Controller
      control={control}
      name={codeField}
      render={({ field, fieldState: { error: fieldError } }) => (
        <div className="space-y-2">
          <Label htmlFor={String(codeField)}>{label} *</Label>
          <Select
            value={field.value ? String(field.value) : ""}
            onValueChange={(value) => {
              const code = parseInt(value, 10);
              const district = districts.find((d) => d.code === code);
              field.onChange(code);
              if (district && nameField) {
                setValue(nameField, district.name as any);
              }
            }}
            disabled={!provinceCode || isLoading}
          >
            <SelectTrigger className="w-full h-12" id={String(codeField)}>
              <SelectValue
                placeholder={
                  !provinceCode
                    ? "Chọn tỉnh trước"
                    : isLoading
                      ? "Đang tải..."
                      : "Chọn quận/huyện"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {districts.map((district) => (
                <SelectItem key={district.code} value={String(district.code)}>
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError && (
            <p className="text-sm text-red-500 mt-1">{fieldError.message}</p>
          )}
        </div>
      )}
    />
  );
}

interface WardSelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  nameField: Path<TFieldValues>;
  codeField: Path<TFieldValues>;
  districtCode: number | null | undefined;
  label?: string;
}

/**
 * Ward Select Component
 * Depends on district selection, auto-disabled until district is selected
 */
export function WardSelect<TFieldValues extends FieldValues>({
  control,
  setValue,
  nameField,
  codeField,
  districtCode,
  label = "Phường/Xã",
}: WardSelectProps<TFieldValues>) {
  const { data: wards = [], isLoading } = useWards(districtCode);

  return (
    <Controller
      control={control}
      name={codeField}
      render={({ field, fieldState: { error: fieldError } }) => (
        <div className="space-y-2">
          <Label htmlFor={String(codeField)}>{label} *</Label>
          <Select
            value={field.value ? String(field.value) : ""}
            onValueChange={(value) => {
              const code = parseInt(value, 10);
              const ward = wards.find((w) => w.code === code);
              field.onChange(code);
              if (ward && nameField) {
                setValue(nameField, ward.name as any);
              }
            }}
            disabled={!districtCode || isLoading}
          >
            <SelectTrigger className="w-full h-12" id={String(codeField)}>
              <SelectValue
                placeholder={
                  !districtCode
                    ? "Chọn quận trước"
                    : isLoading
                      ? "Đang tải..."
                      : "Chọn phường/xã"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {wards.map((ward) => (
                <SelectItem key={ward.code} value={String(ward.code)}>
                  {ward.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError && (
            <p className="text-sm text-red-500 mt-1">{fieldError.message}</p>
          )}
        </div>
      )}
    />
  );
}
