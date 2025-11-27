import { NextResponse } from "next/server";

import {
  buildAuthorizationUrl,
  createState,
  OAUTH_STATE_COOKIE,
} from "../../../../lib/shopify/customer-account";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect");
  const email = url.searchParams.get("email");

  const state = createState();

  // Confidential client: use client_secret, not PKCE
  const redirectUrl = await buildAuthorizationUrl({
    state,
    loginHint: email,
    prompt: "login",
    uiLocales: "vi", // Display Shopify login page in Vietnamese
  });

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });

  if (redirectTo) {
    response.cookies.set(`oauth_redirect_${state}`, redirectTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });
  }

  // PKCE cookie removed - not needed for Confidential clients

  return response;
}
