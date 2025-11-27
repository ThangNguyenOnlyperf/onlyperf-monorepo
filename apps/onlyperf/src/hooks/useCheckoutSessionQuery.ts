"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

interface CheckoutSessionPayload {
  success: boolean;
  session?: {
    status: "pending" | "paid" | "failed" | "expired";
    expiresAt?: string | null;
    shopifyOrderId?: string | null;
    lastError?: string | null;
  };
  message?: string;
}

export interface UseCheckoutSessionQueryOptions {
  sessionId: string;
  initialStatus: "pending" | "paid" | "failed" | "expired";
  initialExpiresAt?: string | null;
  initialLastError?: string | null;
  initialOrderId?: string | null;
  pollIntervalMs?: number;
  onPaid?: (orderId?: string | null) => void;
  onFailed?: () => void;
}

export function useCheckoutSessionQuery({
  sessionId,
  initialStatus,
  initialExpiresAt,
  initialLastError,
  initialOrderId,
  pollIntervalMs = 5000,
  onPaid,
  onFailed,
}: UseCheckoutSessionQueryOptions) {
  const [status, setStatus] = useState(initialStatus);
  const [lastError, setLastError] = useState(initialLastError ?? null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    initialExpiresAt ? new Date(initialExpiresAt) : null,
  );
  const [orderId, setOrderId] = useState<string | null>(initialOrderId ?? null);

  // Track if callbacks have been called to prevent duplicate calls
  const callbacksCalledRef = useRef(false);

  // Fetch checkout session status
  const { data, isError } = useQuery<CheckoutSessionPayload>({
    queryKey: ["checkout-session", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/checkout/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }
      return response.json();
    },
    // Only poll when status is "pending"
    refetchInterval: status === "pending" ? pollIntervalMs : false,
    // Disable automatic refetching on window focus
    refetchOnWindowFocus: false,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
    // Retry once on failure
    retry: 1,
  });

  // Update local state when data changes
  useEffect(() => {
    if (isError) {
      // Only update if status hasn't already changed to failed
      if (status !== "failed") {
        setStatus("failed");
        if (!callbacksCalledRef.current) {
          callbacksCalledRef.current = true;
          onFailed?.();
        }
      }
      return;
    }

    if (!data?.success || !data.session) {
      return;
    }

    const nextStatus = data.session.status;
    const nextError = data.session.lastError ?? null;
    const nextExpiresAt = data.session.expiresAt
      ? new Date(data.session.expiresAt)
      : null;
    const nextOrderId = data.session.shopifyOrderId ?? null;

    // Only update state if values have actually changed
    if (nextStatus !== status) {
      setStatus(nextStatus);

      // Call callbacks when status changes to final state
      if (!callbacksCalledRef.current) {
        if (nextStatus === "paid") {
          callbacksCalledRef.current = true;
          onPaid?.(nextOrderId);
        } else if (nextStatus === "failed" || nextStatus === "expired") {
          callbacksCalledRef.current = true;
          onFailed?.();
        }
      }
    }

    if (nextError !== lastError) {
      setLastError(nextError);
    }

    if (nextExpiresAt?.getTime() !== expiresAt?.getTime()) {
      setExpiresAt(nextExpiresAt);
    }

    if (nextOrderId !== orderId) {
      setOrderId(nextOrderId);
    }
  }, [data, isError, status, lastError, expiresAt, orderId, onPaid, onFailed]);

  const resetError = useCallback(() => setLastError(null), []);

  return {
    status,
    lastError,
    expiresAt,
    orderId,
    resetError,
  };
}
