import { notFound } from 'next/navigation';
import { getShipmentItemDetailsAction } from '~/actions/shipmentItemActions';
import { getColorsAction } from '~/actions/colorActions';
import ShipmentItemDetailsPage from '~/components/items/ShipmentItemDetailsPage';

interface ItemDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const [result, colorsResult] = await Promise.all([
    getShipmentItemDetailsAction(id),
    getColorsAction(),
  ]);
  
  if (!result.success || !result.data) {
    notFound();
  }

  return <ShipmentItemDetailsPage itemDetails={result.data} colors={colorsResult.success ? colorsResult.data : []} />;
}
