"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CustomerAddress } from "@/lib/shopify/customer-account-api";

interface SavedAddressSelectorProps {
  addresses: CustomerAddress[];
  onSelectAddress: (address: CustomerAddress) => void;
  onAddNewAddress: () => void;
  selectedAddressId?: string | null;
}

export function SavedAddressSelector({
  addresses,
  onSelectAddress,
  onAddNewAddress,
  selectedAddressId,
}: SavedAddressSelectorProps) {
  if (addresses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          Bạn chưa có địa chỉ đã lưu
        </p>
        <Button type="button" onClick={onAddNewAddress} variant="outline">
          Thêm địa chỉ mới
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Địa chỉ đã lưu</h3>
        <Button
          type="button"
          onClick={onAddNewAddress}
          variant="ghost"
          size="sm"
        >
          + Thêm địa chỉ mới
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {addresses.map((address) => {
          const isSelected = selectedAddressId === address.id;

          return (
            <button
              key={address.id}
              type="button"
              onClick={() => onSelectAddress(address)}
              className={`group relative rounded-lg border p-6 text-left transition-all hover:border-primary hover:shadow-sm ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute right-4 top-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5 text-white"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Address Content */}
              <div className="space-y-1 pr-8">
                {/* Name */}
                {(address.firstName || address.lastName) && (
                  <p
                    className={`font-semibold text-base ${isSelected ? "text-white" : "text-zinc-900"}`}
                  >
                    {[address.firstName, address.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}

                {/* Company */}
                {address.company && (
                  <p
                    className={`text-sm ${isSelected ? "text-white/90" : "text-zinc-600"}`}
                  >
                    {address.company}
                  </p>
                )}

                {/* Address Lines */}
                <div
                  className={`text-sm ${isSelected ? "text-white/90" : "text-zinc-600"}`}
                >
                  {address.address1 && <p>{address.address1}</p>}
                  {address.address2 && <p>{address.address2}</p>}

                  {/* City, Province, Zip */}
                  <p>
                    {[address.city, address.province, address.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>

                  {/* Country */}
                  {address.country && <p>{address.country}</p>}
                </div>

                {/* Phone */}
                {address.phoneNumber && (
                  <p
                    className={`text-sm ${isSelected ? "text-white/90" : "text-zinc-600"}`}
                  >
                    {address.phoneNumber}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        Chọn địa chỉ giao hàng từ danh sách đã lưu hoặc thêm địa chỉ mới
      </p>
    </div>
  );
}
