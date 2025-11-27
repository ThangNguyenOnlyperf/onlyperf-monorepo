"use client";

import { Mail, Phone, User } from "lucide-react";
import type { CustomerProfile } from "@/lib/shopify/customer-account-api";

interface ProfileSectionProps {
  profile: CustomerProfile;
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
): string {
  const first = firstName?.trim().charAt(0).toUpperCase() || "";
  const last = lastName?.trim().charAt(0).toUpperCase() || "";
  return first + last || "U";
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  const initials = getInitials(profile.firstName, profile.lastName);
  const displayName =
    profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName || profile.lastName || "Người dùng";

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
          <div>
            <h3 className="text-2xl font-bold text-zinc-900">{displayName}</h3>
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
            <p className="text-base text-zinc-600 pl-7">{displayName}</p>
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
