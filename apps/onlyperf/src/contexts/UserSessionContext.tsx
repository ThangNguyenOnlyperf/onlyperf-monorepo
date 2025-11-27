"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/**
 * Client-side session type
 * Contains only customer info - access tokens are never exposed to client
 */
interface CustomerSession {
  expiresAt: string;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface UserSessionContextValue {
  isAuthenticated: boolean;
  session: CustomerSession | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UserSessionContext = createContext<UserSessionContextValue | undefined>(
  undefined,
);

interface UserSessionProviderProps {
  children: ReactNode;
}

/**
 * Client-side provider for user authentication state
 * Fetches session from /api/auth/session after hydration
 * Enables static page generation while still supporting auth
 */
export function UserSessionProvider({ children }: UserSessionProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch session");
      }

      const data = await response.json();

      setIsAuthenticated(data.authenticated);
      setSession(data.session);
    } catch (err) {
      console.error("[UserSessionProvider] Error fetching session:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsAuthenticated(false);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch session on mount
  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <UserSessionContext.Provider
      value={{
        isAuthenticated,
        session,
        isLoading,
        error,
        refetch: fetchSession,
      }}
    >
      {children}
    </UserSessionContext.Provider>
  );
}

/**
 * Hook to access user session state
 * Must be used within UserSessionProvider
 */
export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (context === undefined) {
    throw new Error("useUserSession must be used within UserSessionProvider");
  }
  return context;
}
