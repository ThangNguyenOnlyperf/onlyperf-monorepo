import { notFound } from 'next/navigation';
import { startAssemblySessionAction } from '~/actions/assemblyActions';
import { getBundleDetailAction } from '~/actions/bundleActions';
import AssemblyScannerUI from '~/components/assembly/AssemblyScannerUI';

interface ScannerPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { id } = await params;

  // Get bundle detail
  const bundleResult = await getBundleDetailAction(id);

  if (!bundleResult.success || !bundleResult.data) {
    notFound();
  }

  // Start or continue assembly session
  const sessionResult = await startAssemblySessionAction(bundleResult.data.qrCode);

  if (!sessionResult.success || !sessionResult.data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Lỗi</h1>
          <p className="text-white/70">{sessionResult.message}</p>
        </div>
      </div>
    );
  }

  return <AssemblyScannerUI initialSession={sessionResult.data} />;
}
