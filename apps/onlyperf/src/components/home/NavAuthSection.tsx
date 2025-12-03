"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { useUserSession } from "@/contexts/UserSessionContext";

interface NavAuthSectionProps {
  /**
   * Display mode for the auth section
   * - "desktop": Inline layout with user icon and name
   * - "mobile": Full-width mobile menu item layout
   */
  variant: "desktop" | "mobile";
  /**
   * Callback to close mobile menu when navigation occurs
   */
  onNavigate?: () => void;
}

/**
 * Deferred authentication section for navbar.
 *
 * This component is dynamically imported with `ssr: false` to enable
 * progressive enhancement. The navbar renders immediately with static
 * content, and this auth section hydrates separately after initial paint.
 *
 * Shows one of three states:
 * 1. Loading skeleton while fetching session
 * 2. User profile link if authenticated
 * 3. Login link if not authenticated
 */
export function NavAuthSection({ variant, onNavigate }: NavAuthSectionProps) {
  const { isAuthenticated, isLoading, session } = useUserSession();

  // Get user display name
  const displayName =
    isAuthenticated && session
      ? session.customer.firstName || session.customer.email.split("@")[0]
      : null;

  if (variant === "desktop") {
    return (
      <div className="hidden md:inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium">
        <User className="mr-2 size-4" aria-hidden="true" />
        {isLoading ? (
          <span className="text-muted-foreground">Đang tải...</span>
        ) : isAuthenticated && displayName ? (
          <Link href="/account" className="hover:!text-primary hover:underline hover:decoration-primary">
            {displayName}
          </Link>
        ) : (
          <Link href="/login" className="hover:!text-primary hover:underline hover:decoration-primary">
            Đăng nhập
          </Link>
        )}
      </div>
    );
  }

  // Mobile variant
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-between rounded-md px-3 pl-0 py-2 text-sm font-medium">
          <div className="flex items-center gap-2">
            <User className="size-4" />
            <span className="text-muted-foreground">Đang tải...</span>
          </div>
        </div>
      ) : isAuthenticated && displayName ? (
        <Link
          href="/account"
          className="flex items-center justify-between rounded-md px-3 pl-0 py-2 text-sm font-medium hover:!text-primary hover:underline hover:decoration-primary"
          onClick={onNavigate}
        >
          <div className="flex items-center gap-2">
            <User className="size-4" />
            <span>{displayName}</span>
          </div>
        </Link>
      ) : (
        <Link
          href="/login"
          className="flex items-center justify-between rounded-md px-3 pl-0 py-2 text-sm font-medium hover:!text-primary hover:underline hover:decoration-primary"
          onClick={onNavigate}
        >
          <div className="flex items-center gap-2">
            <User className="size-4" />
            <span>Đăng nhập</span>
          </div>
        </Link>
      )}
    </>
  );
}
