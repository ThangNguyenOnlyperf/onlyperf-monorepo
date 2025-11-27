import { redirect } from "next/navigation";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import { getCustomerAddresses } from "@/lib/shopify/customer-account-api";
import { buildLoginRedirectUrl } from "@/lib/auth/redirect-helpers";
import { OrderSummaryPageClient } from "./OrderSummaryPageClient";

type PageProps = {
  searchParams: Promise<{ guest?: string }>;
};

// Force dynamic rendering to check session and fetch user-specific data
export const dynamic = "force-dynamic";

/**
 * Order summary page - supports both authenticated and guest checkout
 *
 * Flow:
 * - Guest mode (?guest=true): Always allowed, no auth required
 * - Authenticated checkout: Session required, shows saved addresses
 * - No session & no guest flag: Redirect to login to choose checkout type
 */
export default async function OrderSummaryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isGuestMode = params?.guest === "true";

  const session = await readCustomerSessionFromCookies();

  // If not in guest mode and no session, redirect to login
  // User came from authenticated checkout flow but isn't logged in
  if (!isGuestMode && !session) {
    redirect(buildLoginRedirectUrl("/checkout/order-summary"));
  }

  // Fetch saved addresses for authenticated users
  const addresses = session ? await getCustomerAddresses(session) : [];

  return (
    <OrderSummaryPageClient
      customer={session?.customer ?? null}
      savedAddresses={addresses}
      isGuest={!session || isGuestMode}
    />
  );
}
