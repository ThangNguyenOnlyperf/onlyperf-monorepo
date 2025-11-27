import { CartSummary } from "@/components/CartSummary";
import { readCustomerSessionFromCookies } from "@/lib/shopify/storefront";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await readCustomerSessionFromCookies();

  return (
    <main className="container-max mx-auto px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">
        Giỏ hàng của bạn
      </h1>
      <CartSummary customerAccessToken={session?.accessToken ?? null} />
    </main>
  );
}
