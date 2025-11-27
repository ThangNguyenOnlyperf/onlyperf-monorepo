"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook for handling redirects to login page from client components
 * @returns Function to redirect to login with destination URL
 */
export function useAuthRedirect() {
  const router = useRouter();

  const redirectToLogin = useCallback(
    (destination: string) => {
      const encodedDestination = encodeURIComponent(destination);
      router.push(`/login?redirect=${encodedDestination}`);
    },
    [router],
  );

  return { redirectToLogin };
}
