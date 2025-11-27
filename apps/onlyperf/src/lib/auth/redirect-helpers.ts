/**
 * Auth redirect utilities for consistent redirect-to-login behavior
 */

/**
 * Builds a login URL with redirect parameter
 * @param destination - The URL to redirect to after successful login
 * @returns Login URL with encoded redirect parameter
 */
export function buildLoginRedirectUrl(destination: string): string {
  const encodedDestination = encodeURIComponent(destination);
  return `/login?redirect=${encodedDestination}`;
}

/**
 * Extracts the redirect destination from login page URL
 * @param request - The request object containing URL search params
 * @returns The redirect URL if valid and same-origin, otherwise null
 */
export function getRedirectDestination(
  searchParams: URLSearchParams,
  baseUrl: URL,
): string | null {
  const redirectParam = searchParams.get("redirect");

  if (!redirectParam) {
    return null;
  }

  try {
    const candidate = new URL(redirectParam, baseUrl);
    // Only allow same-origin redirects for security
    if (candidate.origin === baseUrl.origin) {
      return candidate.pathname + candidate.search + candidate.hash;
    }
  } catch (error) {
    console.warn("Invalid redirect param", redirectParam, error);
  }

  return null;
}

/**
 * Builds a redirect URL preserving query parameters
 * @param basePath - The base path (e.g., "/account")
 * @param searchParams - Query parameters to preserve
 * @returns Complete URL with preserved query params
 */
export function buildUrlWithParams(
  basePath: string,
  searchParams?: Record<string, string | undefined>,
): string {
  if (!searchParams || Object.keys(searchParams).length === 0) {
    return basePath;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
