"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useCheckoutSessionQuery } from "@/hooks/useCheckoutSessionQuery";
import { getCheckoutCopy } from "@/lib/i18n/checkout";

interface Props {
  sessionId: string;
  initialStatus: "pending" | "paid" | "failed" | "expired";
  expiresAt?: string | null;
  successUrl: string;
  failureUrl: string;
  pollIntervalMs?: number;
  initialLastError?: string | null;
  initialOrderId?: string | null;
}

function formatCountdown(expiry: Date | null) {
  if (!expiry) return null;
  const diff = expiry.getTime() - Date.now();
  if (diff <= 0) return "00:00";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function SepayPaymentStatus({
  sessionId,
  initialStatus,
  expiresAt,
  successUrl,
  failureUrl,
  pollIntervalMs = 5000,
  initialLastError,
  initialOrderId,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const statusCopy = useMemo(() => getCheckoutCopy(locale).status, [locale]);

  const handlePaid = useCallback(
    (orderId?: string | null) => {
      const params = new URLSearchParams();
      params.set("method", "bank_transfer");
      if (orderId) {
        params.set("orderId", orderId);
      }
      const query = params.toString();
      const destination = query ? `${successUrl}?${query}` : successUrl;
      router.replace(destination);
    },
    [router, successUrl],
  );

  const handleFailed = useCallback(() => {
    router.replace(failureUrl);
  }, [failureUrl, router]);

  const {
    status,
    lastError,
    expiresAt: expiry,
  } = useCheckoutSessionQuery({
    sessionId,
    initialStatus,
    initialExpiresAt: expiresAt,
    initialLastError,
    initialOrderId,
    pollIntervalMs,
    onPaid: handlePaid,
    onFailed: handleFailed,
  });

  // If the session is already finalized on mount, redirect immediately.
  useEffect(() => {
    if (initialStatus === "paid") {
      handlePaid(initialOrderId);
    } else if (initialStatus === "failed" || initialStatus === "expired") {
      handleFailed();
    }
  }, [handleFailed, handlePaid, initialOrderId, initialStatus]);

  const [countdown, setCountdown] = useState(() => formatCountdown(expiry));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(expiry));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiry]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "pending":
        return statusCopy.pending;
      case "paid":
        return statusCopy.paid;
      case "expired":
        return statusCopy.expired;
      case "failed":
      default:
        return statusCopy.failed;
    }
  }, [status, statusCopy]);

  const errorMessage = lastError ?? null;
  const effectiveCountdown = countdown;

  return (
    <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
      <p>
        {statusCopy.statusLabel}:{" "}
        <span className="font-semibold text-zinc-900 dark:text-white">
          {statusLabel}
        </span>
      </p>
      {effectiveCountdown ? (
        <p>
          {statusCopy.countdownLabel}: {effectiveCountdown}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-rose-500">
          {statusCopy.errorPrefix}: {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export default SepayPaymentStatus;
