'use client';

import dynamic from 'next/dynamic';

interface ShipmentPDFClientProps {
  shipmentId: string;
}

// Loading component
const ShipmentPDFClientLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Đang khởi tạo PDF...</p>
    </div>
  </div>
);

const ShipmentPDFClient = dynamic(() => import('./ShipmentPDFClient'), {
  ssr: false,
  loading: () => <ShipmentPDFClientLoading />,
});

export default function ShipmentPDFClientDynamic(props: ShipmentPDFClientProps) {
  return <ShipmentPDFClient {...props} />;
}
