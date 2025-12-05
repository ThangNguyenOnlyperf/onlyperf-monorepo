import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Redirect to /setup page
 * The setup page handles first-user creation for organizations
 */
export default function SignUpPage() {
  redirect("/setup");
}
