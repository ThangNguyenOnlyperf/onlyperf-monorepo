import { getBundlesAction } from '~/actions/bundleActions';
import BundleListClientUI from '~/components/bundles/BundleListClientUI';

export default async function BundlesPage() {
  const result = await getBundlesAction(undefined, { page: 1, pageSize: 20 });

  const bundlesData = result.success ? result.data : {
    data: [],
    metadata: {
      currentPage: 1,
      pageSize: 20,
      totalPages: 0,
      totalItems: 0,
    },
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lô hàng sỉ</h1>
        <p className="text-muted-foreground">
          Quản lý các lô hàng sỉ để lắp ráp sản phẩm
        </p>
      </div>

      <BundleListClientUI initialBundles={bundlesData!} />
    </div>
  );
}
