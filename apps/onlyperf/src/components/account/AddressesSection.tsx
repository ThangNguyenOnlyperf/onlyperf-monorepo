"use client";

import { MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CustomerAddress } from "@/lib/shopify/customer-account-api";
import { AddressForm } from "./AddressForm";

interface AddressesSectionProps {
  addresses: CustomerAddress[];
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

export function AddressesSection({
  addresses,
  saveAddress,
}: AddressesSectionProps) {
  const [showForm, setShowForm] = useState(false);

  const handleSuccess = () => {
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Địa chỉ của bạn
          </h2>
          <p className="text-base text-zinc-600 mt-1">
            Quản lý địa chỉ giao hàng
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-12 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Thêm địa chỉ mới
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8">
          <h3 className="text-lg font-semibold text-zinc-900 mb-6">
            Thêm địa chỉ mới
          </h3>
          <AddressForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            saveAddress={saveAddress}
          />
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white py-16 text-center">
          <MapPin className="mb-4 w-12 h-12 text-zinc-500" />
          <h3 className="mb-2 text-lg font-semibold text-zinc-900">
            Chưa có địa chỉ
          </h3>
          <p className="mb-6 text-base text-zinc-600">
            Thêm địa chỉ để tiện cho việc đặt hàng
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="h-12 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Thêm địa chỉ đầu tiên
          </Button>
        </div>
      ) : (
        !showForm && (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-lg border border-zinc-200 bg-white p-6"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-zinc-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {(address.firstName || address.lastName) && (
                      <p className="text-base font-semibold text-zinc-900 mb-1">
                        {[address.firstName, address.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    )}
                    {address.company && (
                      <p className="text-base text-zinc-600 mb-1">
                        {address.company}
                      </p>
                    )}
                    {address.address1 && (
                      <p className="text-base text-zinc-600">
                        {address.address1}
                      </p>
                    )}
                    {address.address2 && (
                      <p className="text-base text-zinc-600">
                        {address.address2}
                      </p>
                    )}
                    {(address.city || address.province || address.zip) && (
                      <p className="text-base text-zinc-600">
                        {[address.city, address.province, address.zip]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {address.country && (
                      <p className="text-base text-zinc-600">
                        {address.country}
                      </p>
                    )}
                    {address.phoneNumber && (
                      <p className="text-base text-zinc-600 mt-2">
                        {address.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
