import { getProductsForSelectionAction } from '~/actions/productActions';
import { getProvidersAction } from '~/actions/providerActions';
import { getColorsAction } from '~/actions/colorActions';
import NewShipmentClient from '~/components/shipments/NewShipmentClient';

export default async function NewShipmentPage() {
  const [productsResult, providersResult, colorsResult] = await Promise.all([
    getProductsForSelectionAction(),
    getProvidersAction(),
    getColorsAction(),
  ]);
  
  const products = productsResult.success ? productsResult.data! : [];
  const providers = providersResult.success ? providersResult.data! : [];
  const colors = colorsResult.success ? colorsResult.data! : [];

  return <NewShipmentClient products={products} providers={providers} colors={colors} />;
}
