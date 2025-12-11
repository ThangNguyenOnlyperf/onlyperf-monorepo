import { redirect } from 'next/navigation';
import { getProductsForSelectionAction } from '~/actions/productActions';
import { getProvidersAction } from '~/actions/providerActions';
import { getColorsAction } from '~/actions/colorActions';
import NewShipmentClient from '~/components/shipments/NewShipmentClient';
import { getOrgContext, hasPermission, P } from '~/lib/authorization';

export default async function NewShipmentPage() {
  // Check permission - redirect if unauthorized
  const context = await getOrgContext();
  if (!context || !hasPermission(context.userRole, P.CREATE_SHIPMENTS)) {
    redirect('/shipments');
  }

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
