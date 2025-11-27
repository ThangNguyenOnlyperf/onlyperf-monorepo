import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeCodeForSession,
  OAUTH_STATE_COOKIE,
  serializeEmptySessionCookies,
  serializeSessionCookies,
} from "../../../../lib/shopify/customer-account";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const cookieStore = await cookies();

  // Derive the public origin (supports ngrok and other proxies)
  const hdrs = await headers();
  const forwardedProto = hdrs.get("x-forwarded-proto");
  const forwardedHost = hdrs.get("x-forwarded-host");
  const protocol = forwardedProto ?? url.protocol.replace(/:$/, "");
  const host = forwardedHost ?? url.host;
  const baseUrl = new URL("/", `${protocol}://${host}`);

  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  let redirectUrl = new URL("/account", baseUrl);
  if (state) {
    const redirectCookieName = `oauth_redirect_${state}`;
    const redirectParam = cookieStore.get(redirectCookieName)?.value;

    if (redirectParam) {
      try {
        const candidate = new URL(redirectParam, baseUrl);
        if (candidate.origin === baseUrl.origin) {
          redirectUrl = candidate;
        }
      } catch (error) {
        console.warn("Invalid redirect from cookie", redirectParam, error);
      }
    }
  }

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.delete(OAUTH_STATE_COOKIE);
  if (state) {
    response.cookies.delete(`oauth_redirect_${state}`);
  }

  // Validation failures - set empty cookies to clear session
  if (!code || !state || !expectedState) {
    const empties = serializeEmptySessionCookies();
    for (const empty of empties) {
      response.cookies.set(empty.name, empty.value, empty.options);
    }
    return response;
  }

  if (state !== expectedState) {
    const empties = serializeEmptySessionCookies();
    for (const empty of empties) {
      response.cookies.set(empty.name, empty.value, empty.options);
    }
    return response;
  }

  // Exchange authorization code for session
  try {
    const { session, idToken } = await exchangeCodeForSession({
      code,
    });

    // Set session cookies using default options (no explicit domain)
    // This ensures cookies work correctly with ngrok, proxies, and production
    const cookies = serializeSessionCookies(session, idToken);
    for (const c of cookies) {
      response.cookies.set(c.name, c.value, c.options);
    }
  } catch (error) {
    console.error("Customer account callback failed", error);
    const empties = serializeEmptySessionCookies();
    for (const empty of empties) {
      response.cookies.set(empty.name, empty.value, empty.options);
    }
  }

  return response;
}
