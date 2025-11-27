import { redirect } from "next/navigation";
import { getSetupState } from "~/actions/setupActions";
import SetupForm from "~/components/setup/SetupForm";

export const dynamic = 'force-dynamic';

export default async function SetupAdminPage() {
  const state = await getSetupState();
  if (!state.needsSetup) {
    redirect("/signin");
  }
  return <SetupForm />;
}
