import { redirect } from "next/navigation";
import { getSetupState } from "~/actions/setupActions";
import SignUpForm from "~/components/auth/SignUpForm";

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const {needsSetup} = await getSetupState();
  if (needsSetup) {
    redirect("/setup");
  }
  return <SignUpForm />;
}
