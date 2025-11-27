import { notFound } from 'next/navigation';
import { getShipmentByIdAction } from '~/actions/shipmentActions';
import { getStoragesAction } from '~/actions/storageActions';
import ShipmentScanUI from '~/components/scanner/ShipmentScanUI';

interface ShipmentScanPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShipmentScanPage({ params }: ShipmentScanPageProps) {
  const { id } = await params;
  const [shipmentResult, storagesResult] = await Promise.all([
    getShipmentByIdAction(id),
    getStoragesAction(),
  ]);

  if (!shipmentResult.success || !shipmentResult.data) {
    notFound();
  }

  const storages = storagesResult.success && storagesResult.data ? storagesResult.data.data : [];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quét nhập kho</h1>
        <p className="text-muted-foreground">
          Phiếu nhập: {shipmentResult.data.receiptNumber}
        </p>
      </div>
      
      <ShipmentScanUI 
        shipment={shipmentResult.data}
        storages={storages}
      />
    </div>
  );
}