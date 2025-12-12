import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { startAssemblySessionAction } from '~/actions/assemblyActions';
import { getBundleDetailAction } from '~/actions/bundleActions';
import AssemblyClientUI from '~/components/assembly/AssemblyClientUI';

interface AssemblyPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Detect mobile device from user-agent header
 */
function isMobileDevice(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

export default async function AssemblyPage({ params }: AssemblyPageProps) {
  const { id } = await params;

  // Server-side mobile detection - redirect to scanner page
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') ?? '';
  if (isMobileDevice(userAgent)) {
    redirect(`/bundles/${id}/scanner`);
  }

  // First get bundle detail to get the QR code
  const bundleResult = await getBundleDetailAction(id);

  if (!bundleResult.success || !bundleResult.data) {
    notFound();
  }

  // Start or continue assembly session
  const sessionResult = await startAssemblySessionAction(bundleResult.data.qrCode);

  if (!sessionResult.success || !sessionResult.data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-destructive mb-2">Lỗi</h1>
          <p className="text-muted-foreground">{sessionResult.message}</p>
        </div>
      </div>
    );
  }

  return <AssemblyClientUI initialSession={sessionResult.data} />;
}
