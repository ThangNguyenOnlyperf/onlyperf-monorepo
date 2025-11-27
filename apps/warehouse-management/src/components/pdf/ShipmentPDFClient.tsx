'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { getShipmentWithItemsAction } from '~/actions/shipmentActions';
import { generateBatchQRCodes, getQRBaseURL } from '~/lib/qr-generator';
import PDFViewer from '~/components/pdf/PDFViewerDynamic';
import type { GroupedQRItems, GroupedQRItemsWithDataUrl } from '~/actions/types';
import { useBadgeConfig } from '~/hooks/useBadgeConfig';

interface ShipmentPDFClientProps {
  shipmentId: string;
}

export default function ShipmentPDFClient({ shipmentId }: ShipmentPDFClientProps) {
  const router = useRouter();
  const { config: badgeConfig, isLoaded: configLoaded } = useBadgeConfig();
  const [loading, setLoading] = useState(true);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [groupedItems, setGroupedItems] = useState<GroupedQRItemsWithDataUrl[]>([]);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    loadShipmentData();
  }, [shipmentId]);

  const loadShipmentData = async () => {
    try {
      setLoading(true);
      const result = await getShipmentWithItemsAction(shipmentId);
      
      if (result.success && result.data) {
        setShipmentData(result.data.shipment);
        
        // Generate QR codes for each item
        const groupsWithQR = await Promise.all(
          result.data.groupedItems.map(async (group) => {
            const qrCodes = await generateBatchQRCodes(
              group.items.map(item => ({
                id: item.id,
                code: item.qrCode,
              }))
            );
            
            return {
              ...group,
              items: qrCodes.map(qr => ({
                id: qr.id,
                qrCode: qr.code,
                qrCodeDataUrl: qr.qrCode,
              })).reverse(), // Reverse to show in ascending order (1, 2, 3, 4, 5)
            };
          })
        );
        
        setGroupedItems(groupsWithQR);
      } else {
        console.error('Failed to load shipment:', result.error);
      }
    } catch (error) {
      console.error('Error loading shipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipment-${shipmentId}-qr-codes.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!shipmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Không tìm thấy phiếu nhập</p>
          <Button
            onClick={() => router.push('/shipments')}
            className="mt-4"
          >
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="mr-4 justify-start"
              >
                <ArrowLeft className="h-5 w-5 pl-0 ml-0" />
              </Button>
              <h1 className="text-xl font-semibold">Mã QR - Phiếu nhập {shipmentData.receiptNumber}</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!pdfBlob}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                In
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={!pdfBlob}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Tải xuống
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <PDFViewer
            title={`Mã QR - Phiếu nhập ${shipmentData.receiptNumber}`}
            subtitle={`Nhà cung cấp: ${shipmentData.supplierName}`}
            groupedItems={groupedItems}
            badgeConfig={configLoaded ? badgeConfig : undefined}
            onPDFGenerated={setPdfBlob}
          />
        </div>
      </div>
    </div>
  );
}