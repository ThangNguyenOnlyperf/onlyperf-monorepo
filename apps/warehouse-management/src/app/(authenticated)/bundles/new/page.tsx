import { getProductsForBundleAction } from '~/actions/bundleActions';
import CreateBundleClientUI from '~/components/bundles/CreateBundleClientUI';

export default async function CreateBundlePage() {
  const result = await getProductsForBundleAction();

  const products = result.success ? result.data : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tạo lô hàng mới</h1>
        <p className="text-muted-foreground">
          Tạo lô hàng sỉ mới với các sản phẩm cần lắp ráp
        </p>
      </div>

      <CreateBundleClientUI products={products!} />
    </div>
  );
}
