import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  CUSTOMER_ID_TOKEN_COOKIE,
  getLogoutUrl,
} from "../../../../lib/shopify/customer-account";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const hdrs = await headers();
  const cookieStore = await cookies();

  const forwardedProto = hdrs.get("x-forwarded-proto");
  const forwardedHost = hdrs.get("x-forwarded-host");
  const protocol = forwardedProto ?? url.protocol.replace(/:$/, "");
  const host = forwardedHost ?? url.host;
  const baseUrl = `${protocol}://${host}`;

  // Read id_token from cookies (required by Shopify for proper logout)
  const idToken = cookieStore.get(CUSTOMER_ID_TOKEN_COOKIE)?.value;

  if (!idToken) {
    console.warn(
      "[Logout] No id_token found in cookies. Logout may not work correctly.",
    );
  }

  // Shopify will redirect to this URI after logout completes
  // The callback route will then clear cookies and redirect to homepage
  const postLogoutRedirectUri = `${baseUrl}/api/customer-auth/logout/callback`;

  try {
    const logoutUrl = await getLogoutUrl(postLogoutRedirectUri, idToken);

    // Redirect to Shopify's logout endpoint
    // DO NOT clear cookies here - we need them for the redirect
    // The callback route will clear cookies after Shopify redirects back
    return NextResponse.redirect(logoutUrl);
  } catch (error) {
    console.error("[Logout] Failed to build logout URL:", error);
    // Fallback: redirect directly to callback which will clear cookies
    return NextResponse.redirect(
      `${baseUrl}/api/customer-auth/logout/callback`,
    );
  }
}
