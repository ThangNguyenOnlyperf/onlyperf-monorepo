"use client";

import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhoneNumberDisplay } from "@/lib/address/utils";
import type { CustomerAddress } from "@/lib/shopify/customer-account-api";
import { AddressForm, type AddressFormInitialValues } from "./AddressForm";

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
  updateAddress: (
    addressId: string,
    address: {
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
    },
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (
    addressId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

async function lookupAddressCodes(
  address: CustomerAddress,
): Promise<AddressFormInitialValues> {
  const parts = address.province?.split(", ") ?? [];
  const wardName = parts[0] ?? "";
  const districtName = parts[1] ?? "";
  const provinceName = parts[2] ?? "";
  const wardCode = parseInt(address.zip ?? "0");

  let provinceCode: number | undefined;
  let districtCode: number | undefined;

  try {
    // 1. Fetch all provinces and find by name
    const provincesRes = await fetch("https://provinces.open-api.vn/api/p/");
    const provinces = await provincesRes.json();
    const province = provinces.find(
      (p: { name: string; code: number }) => p.name === provinceName,
    );
    provinceCode = province?.code;

    // 2. If province found, fetch districts and find by name
    if (provinceCode) {
      const districtsRes = await fetch(
        `https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`,
      );
      const provinceData = await districtsRes.json();
      const district = provinceData.districts?.find(
        (d: { name: string; code: number }) => d.name === districtName,
      );
      districtCode = district?.code;
    }
  } catch (error) {
  }

  return {
    firstName: address.firstName ?? "",
    lastName: address.lastName ?? "",
    phone: formatPhoneNumberDisplay(address.phoneNumber ?? ""),
    address1: address.address1 ?? "",
    address2: address.address2,
    company: address.company,
    wardName,
    districtName,
    provinceName,
    wardCode,
    provinceCode,
    districtCode,
  };
}

export function AddressesSection({
  addresses,
  saveAddress,
  updateAddress,
  deleteAddress,
}: AddressesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(
    null,
  );
  const [editFormValues, setEditFormValues] =
    useState<AddressFormInitialValues | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleCreateSuccess = () => {
    setShowForm(false);
  };

  const handleEditSuccess = () => {
    setEditingAddress(null);
    setEditFormValues(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
    setEditFormValues(null);
  };

  const handleEditClick = async (address: CustomerAddress) => {
    setIsLoadingEdit(true);
    setShowForm(false);

    // Fetch province/district codes from API
    const formValues = await lookupAddressCodes(address);
    setEditFormValues(formValues);
    setEditingAddress(address);
    setIsLoadingEdit(false);
  };

  const handleDeleteClick = (addressId: string) => {
    setDeleteError(null);
    setDeletingAddressId(addressId);
  };

  const handleConfirmDelete = () => {
    if (!deletingAddressId) return;

    startDeleteTransition(async () => {
      const result = await deleteAddress(deletingAddressId);
      if (!result.success) {
        setDeleteError(result.error || "Đã xảy ra lỗi khi xóa địa chỉ");
        return;
      }
      setDeletingAddressId(null);
    });
  };

  const isShowingForm = showForm || editingAddress !== null || isLoadingEdit;

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
        {!isShowingForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-12 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Thêm địa chỉ mới
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && !editingAddress && !isLoadingEdit && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8">
          <h3 className="text-lg font-semibold text-zinc-900 mb-6">
            Thêm địa chỉ mới
          </h3>
          <AddressForm
            onSuccess={handleCreateSuccess}
            onCancel={handleCancel}
            saveAddress={saveAddress}
            mode="create"
          />
        </div>
      )}

      {/* Loading Edit Data */}
      {isLoadingEdit && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          <span className="ml-2 text-zinc-600">Đang tải...</span>
        </div>
      )}

      {/* Edit Form */}
      {editingAddress && editFormValues && !isLoadingEdit && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8">
          <h3 className="text-lg font-semibold text-zinc-900 mb-6">
            Chỉnh sửa địa chỉ
          </h3>
          <AddressForm
            key={editingAddress.id}
            onSuccess={handleEditSuccess}
            onCancel={handleCancel}
            saveAddress={(address) =>
              updateAddress(editingAddress.id, address)
            }
            initialValues={editFormValues}
            mode="edit"
          />
        </div>
      )}

      {/* Empty State */}
      {addresses.length === 0 && !isShowingForm ? (
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
        !isShowingForm && (
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
                        {formatPhoneNumberDisplay(address.phoneNumber)}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(address)}
                        className="h-9"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(address.id)}
                        className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingAddressId}
        onOpenChange={() => {
          if (!isDeleting) {
            setDeletingAddressId(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa địa chỉ</DialogTitle>
          </DialogHeader>
          <p className="text-base text-zinc-600">
            Bạn có chắc chắn muốn xóa địa chỉ này không? Hành động này không thể
            hoàn tác.
          </p>
          {deleteError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-900">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingAddressId(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
