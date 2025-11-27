import { CheckoutFailedClient } from "./CheckoutFailedClient";

// Force dynamic rendering for failed page
export const dynamic = "force-dynamic";

export default function CheckoutFailedPage() {
  return <CheckoutFailedClient />;
}
