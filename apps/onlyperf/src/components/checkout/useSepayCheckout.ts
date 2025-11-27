"use client";

import { useCallback, useState } from "react";

import type {
  CheckoutSessionSummary,
  CreateCheckoutSessionInput,
} from "@/lib/checkout/session-schema";

interface CreateSessionResponse extends CheckoutSessionSummary {
  success: boolean;
  message?: string;
}

export function useSepayCheckout(endpoint = "/api/checkout/sessions") {
  const [isCreating, setIsCreating] = useState(false);

  const createSession = useCallback(
    async (
      input: CreateCheckoutSessionInput,
    ): Promise<CheckoutSessionSummary> => {
      setIsCreating(true);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        const payload = (await response
          .json()
          .catch(() => ({}))) as Partial<CreateSessionResponse>;

        if (!response.ok || !payload.success || !payload.sessionId) {
          const message =
            payload.message || `Request failed with status ${response.status}`;
          throw new Error(message);
        }

        const { success: _success, message: _message, ...summary } = payload;
        return summary as CheckoutSessionSummary;
      } finally {
        setIsCreating(false);
      }
    },
    [endpoint],
  );

  return {
    isCreating,
    createSession,
  };
}
