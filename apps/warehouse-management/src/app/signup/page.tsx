import { redirect } from "next/navigation";
import { getSetupState } from "~/actions/setupActions";
import SignUpForm from "~/components/auth/SignUpForm";

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const state = await getSetupState();
  if (!state.needsSetup) {
    redirect("/signin");
  }
  return <SignUpForm />;
}
