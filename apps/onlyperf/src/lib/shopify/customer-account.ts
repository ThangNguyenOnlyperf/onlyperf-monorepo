import crypto from "node:crypto";
import { cookies } from "next/headers";

export interface CustomerSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface SessionCookieValue {
  session: CustomerSession;
}

export const CUSTOMER_SESSION_COOKIE = "onlyperf_customer_session";
export const OAUTH_STATE_COOKIE = "onlyperf_customer_oauth_state";
export const OAUTH_PKCE_COOKIE = "onlyperf_customer_pkce";

// Split-cookie names to avoid 4KB limits on a single cookie
export const CUSTOMER_SESSION_ACCESS_COOKIE = "onlyperf_customer_access";
export const CUSTOMER_SESSION_REFRESH_COOKIE = "onlyperf_customer_refresh";
export const CUSTOMER_SESSION_META_COOKIE = "onlyperf_customer_meta";
export const CUSTOMER_ID_TOKEN_COOKIE = "onlyperf_customer_id_token";

const SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID;
const SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET;
const SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI;
const SHOPIFY_STORE_DOMAIN =
  process.env.NEXT_PUBLIC_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;

// Fallback URLs - will be replaced by discovery in production
const SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL;
const SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL;
const SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL;

let discoveredEndpoints: {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  issuer: string;
} | null = null;

/**
 * Discovers OAuth endpoints from Shopify's OpenID Configuration.
 * Uses in-memory caching to avoid repeated network requests.
 *
 * @see https://shopify.dev/docs/api/customer#authentication
 */
async function discoverOAuthEndpoints(): Promise<{
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  issuer: string;
}> {
  // Return cached endpoints if available
  if (discoveredEndpoints) {
    return discoveredEndpoints;
  }

  if (!SHOPIFY_STORE_DOMAIN) {
    throw new Error(
      "SHOPIFY_STORE_DOMAIN not configured. Cannot discover OAuth endpoints.",
    );
  }

  const discoveryUrl = `https://${SHOPIFY_STORE_DOMAIN}/.well-known/openid-configuration`;

  try {
    const response = await fetch(discoveryUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Discovery endpoint returned ${response.status}: ${response.statusText}`,
      );
    }

    const config = (await response.json()) as {
      authorization_endpoint: string;
      token_endpoint: string;
      end_session_endpoint: string;
      issuer: string;
    };

    // Validate that we got the expected endpoints
    if (
      !config.authorization_endpoint ||
      !config.token_endpoint ||
      !config.end_session_endpoint
    ) {
      throw new Error("Discovery response missing required endpoints");
    }

    // Cache the discovered endpoints
    discoveredEndpoints = config;

    return config;
  } catch (error) {
    console.error(
      "[OAuth Discovery] Failed to discover OAuth endpoints:",
      error,
    );

    // Fallback to environment variables if discovery fails
    if (
      SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL &&
      SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL &&
      SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL
    ) {
      console.warn("[OAuth Discovery] Falling back to environment variables");
      return {
        authorization_endpoint: SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL,
        token_endpoint: SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL,
        end_session_endpoint: SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL,
        issuer: `https://shopify.com`,
      };
    }

    throw new Error(
      "Failed to discover OAuth endpoints and no fallback URLs configured in environment variables",
    );
  }
}

export function createState(): string {
  return crypto.randomBytes(16).toString("hex");
}

// PKCE is only for Public clients. Confidential clients use client_secret instead.
// Keeping this function for backward compatibility but it should not be used.
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest()
    .toString("base64url");

  return { verifier, challenge };
}

export async function buildAuthorizationUrl(options: {
  state: string;
  codeChallenge?: string; // Optional: only for Public clients
  loginHint?: string | null;
  prompt?: "login" | "consent" | "select_account" | "none"; // Optional: control authentication behavior
  uiLocales?: string; 
}): Promise<string> {
  const endpoints = await discoverOAuthEndpoints();

  const params = new URLSearchParams({
    client_id: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!,
    scope: "openid email customer-account-api:full",
    redirect_uri: SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI!,
    response_type: "code",
    state: options.state,
  });

  // Only add PKCE params for Public clients
  if (options.codeChallenge) {
    params.set("code_challenge_method", "S256");
    params.set("code_challenge", options.codeChallenge);
  }

  if (options.loginHint) {
    params.set("login_hint", options.loginHint);
  }

  if (options.prompt) {
    params.set("prompt", options.prompt);
  }

  if (options.uiLocales) {
    params.set("ui_locales", options.uiLocales);
  }

  return `${endpoints.authorization_endpoint}?${params}`;
}

export async function exchangeCodeForSession(options: {
  code: string;
  codeVerifier?: string; // Optional: only for Public clients
}): Promise<{ session: CustomerSession; idToken?: string }> {
  const endpoints = await discoverOAuthEndpoints();

  // Build request body - only include code_verifier for Public clients
  const bodyParams: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!,
    client_secret: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET!,
    redirect_uri: SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI!,
    code: options.code,
  };

  if (options.codeVerifier) {
    bodyParams.code_verifier = options.codeVerifier;
  }

  const response = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(bodyParams).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Token Exchange] Failed:", {
      status: response.status,
      statusText: response.statusText,
      body: text,
      endpoint: endpoints.token_endpoint,
    });
    throw new Error(
      `Failed to exchange customer token (${response.status}): ${text}`,
    );
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    token_type?: string;
    expires_in: number;
    id_token?: string;
  };

  const expiresAt = new Date(
    Date.now() + payload.expires_in * 1000,
  ).toISOString();

  // Populate customer fields from ID token (JWT) if available
  let customerId = "unknown";
  let customerEmail = "";
  let firstName: string | null = null;
  let lastName: string | null = null;

  if (payload.id_token) {
    try {
      const parts = payload.id_token.split(".");
      if (parts.length >= 2) {
        const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = Buffer.from(raw, "base64").toString("utf8");
        const claims = JSON.parse(json) as Record<string, unknown>;
        if (
          typeof claims["sub"] === "string" ||
          typeof claims["sub"] === "number"
        ) {
          customerId = String(claims["sub"]);
        }
        if (typeof claims["email"] === "string") {
          customerEmail = claims["email"] as string;
        }
        if (typeof claims["given_name"] === "string") {
          firstName = claims["given_name"] as string;
        }
        if (typeof claims["family_name"] === "string") {
          lastName = claims["family_name"] as string;
        }
      }
    } catch (error) {
      console.warn("Unable to decode id_token claims", error);
    }
  }

  const session: CustomerSession = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt,
    customer: {
      id: customerId,
      email: customerEmail,
      firstName,
      lastName,
    },
  };

  return {
    session,
    idToken: payload.id_token,
  };
}

/**
 * Refreshes an expired access token using the refresh token.
 * Returns a new CustomerSession with updated tokens and expiration.
 *
 * @see https://shopify.dev/docs/api/customer#refresh-token
 */
export async function refreshAccessToken(options: {
  refreshToken: string;
  customer: CustomerSession["customer"];
}): Promise<CustomerSession> {
  const endpoints = await discoverOAuthEndpoints();

  const response = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!,
      client_secret: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET!,
      refresh_token: options.refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Token Refresh] Failed:", {
      status: response.status,
      statusText: response.statusText,
      body: text,
      endpoint: endpoints.token_endpoint,
    });
    throw new Error(
      `Failed to refresh customer token (${response.status}): ${text}`,
    );
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    token_type?: string;
    expires_in: number;
  };

  const expiresAt = new Date(
    Date.now() + payload.expires_in * 1000,
  ).toISOString();

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt,
    customer: options.customer, // Preserve customer info from old session
  } satisfies CustomerSession;
}

export function serializeSessionCookie(session: CustomerSession) {
  return {
    name: CUSTOMER_SESSION_COOKIE,
    value: JSON.stringify({ session } satisfies SessionCookieValue),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export function serializeSessionCookies(
  session: CustomerSession,
  idToken?: string,
) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };

  const cookies = [
    {
      name: CUSTOMER_SESSION_ACCESS_COOKIE,
      value: session.accessToken,
      options: { ...base },
    },
    {
      name: CUSTOMER_SESSION_REFRESH_COOKIE,
      value: session.refreshToken,
      options: { ...base },
    },
    {
      name: CUSTOMER_SESSION_META_COOKIE,
      value: JSON.stringify({
        expiresAt: session.expiresAt,
        customer: session.customer,
      }),
      options: { ...base },
    },
  ];

  // Add id_token cookie if provided
  if (idToken) {
    cookies.push({
      name: CUSTOMER_ID_TOKEN_COOKIE,
      value: idToken,
      options: { ...base },
    });
  }

  return cookies;
}

export function parseSessionCookie(
  raw: string | undefined,
): CustomerSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionCookieValue;
    return parsed.session ?? null;
  } catch (error) {
    console.error("Unable to parse customer session cookie", error);
    return null;
  }
}

export function serializeEmptySessionCookie() {
  return {
    name: CUSTOMER_SESSION_COOKIE,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    },
  };
}

export function serializeEmptySessionCookies() {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  return [
    { name: CUSTOMER_SESSION_COOKIE, value: "", options: { ...base } },
    { name: CUSTOMER_SESSION_ACCESS_COOKIE, value: "", options: { ...base } },
    { name: CUSTOMER_SESSION_REFRESH_COOKIE, value: "", options: { ...base } },
    { name: CUSTOMER_SESSION_META_COOKIE, value: "", options: { ...base } },
    { name: CUSTOMER_ID_TOKEN_COOKIE, value: "", options: { ...base } },
  ];
}

export async function getLogoutUrl(
  redirectUri: string,
  idToken?: string,
): Promise<string> {
  const endpoints = await discoverOAuthEndpoints();

  const params = new URLSearchParams({
    post_logout_redirect_uri: redirectUri,
  });

  // Add id_token_hint if available (required by Shopify Customer Account API)
  if (idToken) {
    params.set("id_token_hint", idToken);
  }

  return `${endpoints.end_session_endpoint}?${params}`;
}

/**
 * Checks if a customer session is expired or expiring soon.
 * Returns true if the session has expired or will expire within 5 minutes.
 * The 5-minute buffer ensures we don't make API calls with tokens about to expire.
 */
function isSessionExpired(session: CustomerSession): boolean {
  const expiryTime = new Date(session.expiresAt).getTime();
  const now = Date.now();
  // Consider expired if less than 5 minutes remaining (buffer for API calls)
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return expiryTime - now < bufferMs;
}

export async function readCustomerSessionFromCookies(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  // First, try legacy single cookie
  const raw = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  const legacy = parseSessionCookie(raw);
  if (legacy) {
    // Check if legacy session is expired
    if (isSessionExpired(legacy)) {
      console.warn("[Auth] Legacy session expired, clearing cookies");
      return null;
    }
    return legacy;
  }

  // Then, try split cookies
  const access = cookieStore.get(CUSTOMER_SESSION_ACCESS_COOKIE)?.value;
  const refresh = cookieStore.get(CUSTOMER_SESSION_REFRESH_COOKIE)?.value;
  const metaRaw = cookieStore.get(CUSTOMER_SESSION_META_COOKIE)?.value;

  if (!access || !refresh || !metaRaw) return null;

  try {
    const meta = JSON.parse(metaRaw) as {
      expiresAt: string;
      customer: CustomerSession["customer"];
    };

    const session = {
      accessToken: access,
      refreshToken: refresh,
      expiresAt: meta.expiresAt,
      customer: meta.customer,
    } satisfies CustomerSession;

    // Check if session is expired or expiring soon
    if (isSessionExpired(session)) {
      console.warn(
        "[Auth] Session expired or expiring soon, forcing re-login",
        {
          expiresAt: session.expiresAt,
          customerEmail: session.customer.email,
        },
      );
      return null;
    }

    return session;
  } catch (error) {
    console.error("Unable to parse split customer session cookies", error);
    return null;
  }
}
