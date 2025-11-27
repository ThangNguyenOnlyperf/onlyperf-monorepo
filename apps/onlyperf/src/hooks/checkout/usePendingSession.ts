import { useEffect, useState } from "react";

interface PendingSession {
  sessionId: string;
  cartId: string;
  createdAt: string;
  expiresAt?: string;
}

const STORAGE_KEY = "onlyperf_pending_session";

/**
 * Hook to manage pending checkout session from localStorage
 * Returns null if no session, expired, or localStorage unavailable
 */
export function usePendingSession(currentCartId?: string) {
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(
    null,
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setPendingSession(null);
        return;
      }

      const session: PendingSession = JSON.parse(stored);

      // Check if expired
      if (session.expiresAt) {
        const expiryTime = new Date(session.expiresAt).getTime();
        const now = Date.now();
        if (now >= expiryTime) {
          // Session expired, clear it
          localStorage.removeItem(STORAGE_KEY);
          setPendingSession(null);
          return;
        }
      }

      // Check if it matches current cart (if provided)
      if (currentCartId && session.cartId !== currentCartId) {
        // Different cart, don't show
        setPendingSession(null);
        return;
      }

      setPendingSession(session);
    } catch (error) {
      console.error("Failed to read pending session from localStorage:", error);
      setPendingSession(null);
    }
  }, [currentCartId]);

  const clearPendingSession = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setPendingSession(null);
    } catch (error) {
      console.error("Failed to clear pending session:", error);
    }
  };

  return {
    pendingSession,
    clearPendingSession,
  };
}
