import { redirect } from "next/navigation";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import { buildLoginRedirectUrl } from "./redirect-helpers";
import type { CustomerSession } from "@/lib/shopify/customer-account";

/**
 * Server-side authentication guard for protected pages.
 *
 * Checks if user has valid session cookies. If not, redirects to login page
 * with return URL. If session exists, returns it for use in the page.
 *
 * @param redirectPath - The path to redirect back to after login (e.g., "/account")
 * @returns CustomerSession object if authenticated
 * @throws Redirects to login page if not authenticated
 *
 * @example
 * ```typescript
 * // In a protected Server Component page:
 * export default async function AccountPage() {
 *   const session = await requireAuth("/account");
 *
 *   // Use session to fetch customer data
 *   const profile = await getCustomerProfile(session);
 *   return <AccountPageClient profile={profile} />;
 * }
 * ```
 */
export async function requireAuth(
  redirectPath: string,
): Promise<CustomerSession> {
  const session = await readCustomerSessionFromCookies();

  if (!session) {
    // User not authenticated, redirect to login with return URL
    redirect(buildLoginRedirectUrl(redirectPath));
  }

  return session;
}
