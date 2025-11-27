"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

export interface UseCheckoutSessionPollingOptions {
  sessionId: string;
  initialStatus: "pending" | "paid" | "failed" | "expired";
  initialExpiresAt?: string | null;
  initialLastError?: string | null;
  initialOrderId?: string | null;
  pollIntervalMs?: number;
  onPaid?: (orderId?: string | null) => void;
  onFailed?: () => void;
}

export function useCheckoutSessionPolling({
  sessionId,
  initialStatus,
  initialExpiresAt,
  initialLastError,
  initialOrderId,
  pollIntervalMs = 5000,
  onPaid,
  onFailed,
}: UseCheckoutSessionPollingOptions) {
  const [status, setStatus] = useState(initialStatus);
  const [lastError, setLastError] = useState(initialLastError ?? null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    initialExpiresAt ? new Date(initialExpiresAt) : null,
  );
  const [orderId, setOrderId] = useState<string | null>(initialOrderId ?? null);

  const shouldPoll = useMemo(() => status === "pending", [status]);

  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const response = await fetch(`/api/checkout/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        const payload = (await response.json()) as CheckoutSessionPayload;
        if (!payload.success || !payload.session) {
          if (!cancelled) {
            setStatus("failed");
            onFailed?.();
          }
          return;
        }

        if (cancelled) return;

        const nextStatus = payload.session.status;
        setStatus(nextStatus);
        setLastError(payload.session.lastError ?? null);
        setExpiresAt(
          payload.session.expiresAt
            ? new Date(payload.session.expiresAt)
            : null,
        );
        setOrderId(payload.session.shopifyOrderId ?? null);

        if (nextStatus === "paid") {
          onPaid?.(payload.session.shopifyOrderId ?? null);
        } else if (nextStatus === "failed" || nextStatus === "expired") {
          onFailed?.();
        }
      } catch (error) {
        console.error("Checkout polling error", error);
      }
    };

    const interval = setInterval(tick, pollIntervalMs);
    tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onFailed, onPaid, pollIntervalMs, sessionId, shouldPoll]);

  const resetError = useCallback(() => setLastError(null), []);

  return {
    status,
    lastError,
    expiresAt,
    orderId,
    resetError,
  };
}
