import { notFound } from 'next/navigation';
import { getBundleDetailAction } from '~/actions/bundleActions';
import BundleDetailClientUI from '~/components/bundles/BundleDetailClientUI';

interface BundleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BundleDetailPage({ params }: BundleDetailPageProps) {
  const { id } = await params;
  const result = await getBundleDetailAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <BundleDetailClientUI bundle={result.data} />
    </div>
  );
}
