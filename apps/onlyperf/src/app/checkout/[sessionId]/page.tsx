import { notFound, redirect } from "next/navigation";

import { getCheckoutSession } from "@/actions/checkout";
import { buildLoginRedirectUrl } from "@/lib/auth/redirect-helpers";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";

import CheckoutSessionContent from "./CheckoutSessionContent";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export const dynamic = "force-dynamic";

export default async function CheckoutSessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  try {
    const session = await getCheckoutSession(sessionId);

    if (!session.isGuest) {
      const customerSession = await readCustomerSessionFromCookies();
      if (!customerSession) {
        redirect(buildLoginRedirectUrl(`/checkout/${sessionId}`));
      }
    }

    return <CheckoutSessionContent session={session} />;
  } catch (error) {
    if (error instanceof Error && error.message === "Session not found") {
      notFound();
    }
    throw error;
  }
}
