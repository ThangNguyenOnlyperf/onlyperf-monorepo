import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  CUSTOMER_ID_TOKEN_COOKIE,
  CUSTOMER_SESSION_ACCESS_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_META_COOKIE,
  CUSTOMER_SESSION_REFRESH_COOKIE,
} from "@/lib/shopify/customer-account";

/**
 * Logout callback route - called by Shopify after logout completes.
 * Clears all session cookies and redirects to homepage.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const hdrs = await headers();

  const forwardedProto = hdrs.get("x-forwarded-proto");
  const forwardedHost = hdrs.get("x-forwarded-host");
  const protocol = forwardedProto ?? url.protocol.replace(/:$/, "");
  const host = forwardedHost ?? url.host;
  const baseUrl = `${protocol}://${host}`;

  // Redirect to homepage
  const response = NextResponse.redirect(`${baseUrl}/`);

  // Clear all session cookies with proper attributes
  // IMPORTANT: Don't set domain attribute to allow browser default behavior
  const cookieBase = {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", cookieBase);
  response.cookies.set(CUSTOMER_SESSION_ACCESS_COOKIE, "", cookieBase);
  response.cookies.set(CUSTOMER_SESSION_REFRESH_COOKIE, "", cookieBase);
  response.cookies.set(CUSTOMER_SESSION_META_COOKIE, "", cookieBase);
  response.cookies.set(CUSTOMER_ID_TOKEN_COOKIE, "", cookieBase);

  return response;
}
