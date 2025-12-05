import { redirect } from "next/navigation";
import { getSetupState } from "~/actions/setupActions";
import SetupForm from "~/components/setup/SetupForm";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SetupAdminPage() {
  const state = await getSetupState();

  // Case 1: No organizations exist - show message to run script
  if (state.reason === "no_orgs") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Chua co to chuc</CardTitle>
            <CardDescription className="space-y-2">
              <p>Chua co to chuc nao duoc tao trong he thong.</p>
              <p>Vui long chay lenh sau de tao to chuc:</p>
              <code className="block bg-muted p-2 rounded text-sm mt-2">
                pnpm setup:org
              </code>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Case 2: All orgs have owners - redirect to signin
  if (state.reason === "all_orgs_claimed") {
    redirect("/signin");
  }

  // Case 3: Ready to claim an org
  if (state.reason === "ready_to_claim" && state.unclaimedOrg) {
    return (
      <SetupForm
        organizationId={state.unclaimedOrg.id}
        organizationName={state.unclaimedOrg.name}
      />
    );
  }

  // Fallback (should not reach here)
  redirect("/signin");
}
