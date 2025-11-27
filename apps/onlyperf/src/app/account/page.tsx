import { redirect } from "next/navigation";
import { saveCustomerAddress } from "@/actions/addresses";
import { getPendingCheckoutSessions } from "@/actions/checkout";
import { getCustomerProducts } from "@/actions/products";
import { AccountPageClient } from "@/components/account/AccountPageClient";
import {
  buildLoginRedirectUrl,
  buildUrlWithParams,
} from "@/lib/auth/redirect-helpers";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import {
  getCustomerAddresses,
  getCustomerOrders,
  getCustomerProfile,
} from "@/lib/shopify/customer-account-api";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const session = await readCustomerSessionFromCookies();

  if (!session) {
    const params = await searchParams;
    const accountUrl = buildUrlWithParams("/account", {
      section: params.section,
    });
    redirect(buildLoginRedirectUrl(accountUrl));
  }

  // Fetch all customer data in parallel
  const [profileData, orders, addresses, pendingSessions, customerProducts] =
    await Promise.all([
      getCustomerProfile(session).catch(() => null),
      getCustomerOrders(session).catch(() => []),
      getCustomerAddresses(session).catch(() => []),
      getPendingCheckoutSessions().catch(() => []),
      getCustomerProducts(session.customer.id),
    ]);

  // Ensure profile is always defined
  const profile = profileData ?? {
    id: session.customer.id,
    email: session.customer.email,
    firstName: session.customer.firstName,
    lastName: session.customer.lastName,
    phone: null,
  };

  const params = await searchParams;

  return (
    <AccountPageClient
      profile={profile}
      orders={orders}
      addresses={addresses}
      products={customerProducts}
      pendingSessions={pendingSessions}
      initialSection={params.section}
      saveAddress={saveCustomerAddress}
    />
  );
}
