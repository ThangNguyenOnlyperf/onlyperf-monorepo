import { notFound } from 'next/navigation';
import { getShipmentWithItemsAction } from '~/actions/shipmentActions';
import ShipmentDetailsPage from '~/components/shipments/ShipmentDetailsPage';
import { SHOPIFY_ENABLED } from '~/lib/shopify/config';

interface ShipmentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    highlight?: string;
  }>;
}

export default async function ShipmentDetailPage({ 
  params, 
  searchParams 
}: ShipmentDetailPageProps) {
  const { id } = await params;
  const { highlight } = await searchParams;
  const result = await getShipmentWithItemsAction(id);
  
  if (!result.success || !result.data) {
    notFound();
  }

  // Calculate itemCount from grouped items
  const itemCount = result.data.groupedItems.reduce(
    (total, group) => total + group.items.length, 
    0
  );

  return (
    <ShipmentDetailsPage 
      shipment={{
        ...result.data.shipment,
        itemCount
      }}
      groupedItems={result.data.groupedItems}
      highlightedQrCode={highlight}
    />
  );
}
