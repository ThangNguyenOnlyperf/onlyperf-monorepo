"use client";

import { Check, Loader2, Mail, Pencil, Phone, User, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerProfile } from "@/lib/shopify/customer-account-api";

interface ProfileSectionProps {
  profile: CustomerProfile;
  updateProfile: (input: {
    firstName: string;
    lastName: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
): string {
  const first = firstName?.trim().charAt(0).toUpperCase() || "";
  const last = lastName?.trim().charAt(0).toUpperCase() || "";
  return first + last || "U";
}

function getDefaultFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "";
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

export function ProfileSection({
  profile,
  updateProfile,
}: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local state for optimistic UI updates
  const [localProfile, setLocalProfile] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
  });

  // Form input state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const initials = getInitials(localProfile.firstName, localProfile.lastName);
  const displayName =
    localProfile.firstName && localProfile.lastName
      ? `${localProfile.firstName} ${localProfile.lastName}`
      : localProfile.firstName || localProfile.lastName || getDefaultFromEmail(profile.email);

  const handleEditClick = () => {
    if (!localProfile.firstName && !localProfile.lastName) {
      const defaultName = getDefaultFromEmail(profile.email);
      setFirstName(defaultName);
      setLastName("");
    } else {
      setFirstName(localProfile.firstName ?? "");
      setLastName(localProfile.lastName ?? "");
    }
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setFirstName("");
    setLastName("");
  };

  const handleSave = () => {
    if (!firstName.trim()) {
      setError("Vui lòng nhập tên");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (!result.success) {
        setError(result.error || "Đã xảy ra lỗi");
        return;
      }

      // Update local state for immediate UI feedback
      setLocalProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setIsEditing(false);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Hồ sơ cá nhân</h2>
        <p className="text-base text-zinc-600 mt-1">
          Thông tin tài khoản của bạn
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-8">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700 text-2xl font-semibold text-white">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-zinc-900">{displayName}</h3>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditClick}
                  className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                  aria-label="Chỉnh sửa tên"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-base text-zinc-600 mt-1">Khách hàng</p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-zinc-700" />
              <p className="text-base font-medium text-zinc-900">Họ và tên</p>
            </div>
            {isEditing ? (
              <div className="pl-7 space-y-3">
                <div className="flex gap-3">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tên"
                    className="h-10 max-w-[180px]"
                    disabled={isPending}
                  />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Họ"
                    className="h-10 max-w-[180px]"
                    disabled={isPending}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isPending}
                    className="h-8"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    {isPending ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="h-8"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-base text-zinc-600 pl-7">{displayName}</p>
            )}
          </div>

          <div className="border-t border-zinc-200 pt-6 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-zinc-700" />
              <p className="text-base font-medium text-zinc-900">Email</p>
            </div>
            <p className="text-base text-zinc-600 pl-7">{profile.email}</p>
          </div>

          {profile.phone && (
            <div className="border-t border-zinc-200 pt-6 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-zinc-700" />
                <p className="text-base font-medium text-zinc-900">
                  Số điện thoại
                </p>
              </div>
              <p className="text-base text-zinc-600 pl-7">{profile.phone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
