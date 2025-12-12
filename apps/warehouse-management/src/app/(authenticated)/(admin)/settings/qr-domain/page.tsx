import { getQRDomainSettingsAction } from "~/actions/qrDomainSettingsActions";
import QRDomainSettingsClientUI from "~/components/settings/QRDomainSettingsClientUI";
import { redirect } from "next/navigation";

export default async function QRDomainSettingsPage() {
  const result = await getQRDomainSettingsAction();

  // Handle error (including unauthorized)
  if (!result.success) {
    // If not authorized, redirect to dashboard
    if (result.message?.includes("chủ sở hữu")) {
      redirect("/dashboard?error=owner-only");
    }
    // Other errors will be shown on the page
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Cài đặt Domain QR Code
        </h1>
        <p className="text-muted-foreground">
          Cấu hình domain cho mã QR của tổ chức
        </p>
      </div>

      <QRDomainSettingsClientUI initialSettings={result.success ? result.data ?? null : null} />
    </div>
  );
}
