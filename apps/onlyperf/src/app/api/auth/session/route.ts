import { NextResponse } from "next/server";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";

/**
 * GET /api/auth/session
 * Returns the current user's session from cookies
 * Used for client-side hydration of authentication state
 */
export async function GET() {
  try {
    const session = await readCustomerSessionFromCookies();

    if (!session) {
      return NextResponse.json(
        { authenticated: false, session: null },
        {
          status: 200,
          headers: {
            // Cache for 5 seconds to reduce repeated calls
            "Cache-Control": "private, max-age=5, stale-while-revalidate=10",
          },
        },
      );
    }

    // Return session data (customer info only, never expose access token to client)
    return NextResponse.json(
      {
        authenticated: true,
        session: {
          expiresAt: session.expiresAt,
          customer: session.customer,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=10",
        },
      },
    );
  } catch (error) {
    console.error("[Auth Session API] Error reading session:", error);
    return NextResponse.json(
      { authenticated: false, session: null, error: "Failed to read session" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
