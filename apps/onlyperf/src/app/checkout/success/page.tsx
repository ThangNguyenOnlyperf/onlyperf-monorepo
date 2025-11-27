import { CheckoutSuccessClient } from "./CheckoutSuccessClient";

type PageProps = {
  searchParams: Promise<{
    orderId?: string;
    method?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = params.orderId ?? null;
  const method = params.method ?? "bank_transfer";

  return <CheckoutSuccessClient orderId={orderId} method={method} />;
}
