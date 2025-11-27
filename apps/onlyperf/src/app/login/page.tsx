import { LoginForm } from "./LoginForm";
import { readCustomerSessionFromCookies } from "@/lib/shopify/storefront";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    redirect?: string;
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

/**
 * Login page
 *
 * Post-OAuth redirects are handled entirely by /api/customer-auth/callback
 * using the oauth_redirect_{state} cookie. No server-side session check
 * needed here due to Next.js cookie timing issues with redirects.
 */
export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirectParam = params?.redirect ?? "";
  const errorParam = params?.error ?? "";

  const session = await readCustomerSessionFromCookies();

  if (session) {
    redirect(redirectParam || "/");
  }

  return <LoginForm redirectParam={redirectParam} errorParam={errorParam} />;
}
